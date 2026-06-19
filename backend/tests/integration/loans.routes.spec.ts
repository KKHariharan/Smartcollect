import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../helpers/db';
import {
  createAgentFixture,
  createCustomerFixture,
  createRoleFixture,
  createUserFixture,
} from '../helpers/factories';
import { env } from '../../src/config/env';
import { PERMISSIONS } from '../../src/constants/permissions';
import { EmiSchedule } from '../../src/models/EmiSchedule';

let app: Express;

beforeAll(async () => {
  await connectTestDB();
  app = createApp();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

async function loginAs(email: string, password: string) {
  const res = await request(app).post(`${env.API_PREFIX}/auth/login`).send({ email, password });
  return res.body.data.accessToken as string;
}

async function createAdminToken() {
  const role = await createRoleFixture({ name: 'Admin', permissions: [PERMISSIONS.WILDCARD] });
  const { user, password } = await createUserFixture({
    email: 'admin@example.com',
    roleId: role.id as string,
    accountType: 'admin',
  });
  return loginAs(user.email, password);
}

describe('Loans lifecycle', () => {
  it('creates a pending loan, approves it, and generates an EMI schedule', async () => {
    const token = await createAdminToken();
    const customer = await createCustomerFixture();

    const createRes = await request(app)
      .post(`${env.API_PREFIX}/loans`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: customer.id,
        principalAmount: 10000,
        interestRate: 12,
        totalInstallments: 10,
        emiType: 'monthly',
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('pending');
    const loanId = createRes.body.data._id;

    const approveRes = await request(app)
      .post(`${env.API_PREFIX}/loans/${loanId}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('active');
    expect(approveRes.body.data.totalPayable).toBeCloseTo(11200, 2);

    const scheduleRes = await request(app)
      .get(`${env.API_PREFIX}/loans/${loanId}/emi-schedule`)
      .set('Authorization', `Bearer ${token}`);
    expect(scheduleRes.status).toBe(200);
    expect(scheduleRes.body.data).toHaveLength(10);

    const persisted = await EmiSchedule.countDocuments({ loan: loanId });
    expect(persisted).toBe(10);
  });

  it('rejects a pending loan with a reason', async () => {
    const token = await createAdminToken();
    const customer = await createCustomerFixture();

    const createRes = await request(app)
      .post(`${env.API_PREFIX}/loans`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: customer.id,
        principalAmount: 5000,
        interestRate: 10,
        totalInstallments: 5,
        emiType: 'weekly',
      });

    const rejectRes = await request(app)
      .post(`${env.API_PREFIX}/loans/${createRes.body.data._id}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Insufficient income proof' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('rejected');
    expect(rejectRes.body.data.rejectionReason).toBe('Insufficient income proof');
  });

  it('prevents approving a loan twice', async () => {
    const token = await createAdminToken();
    const customer = await createCustomerFixture();

    const createRes = await request(app)
      .post(`${env.API_PREFIX}/loans`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: customer.id,
        principalAmount: 5000,
        interestRate: 10,
        totalInstallments: 5,
        emiType: 'weekly',
      });
    const loanId = createRes.body.data._id;

    await request(app)
      .post(`${env.API_PREFIX}/loans/${loanId}/approve`)
      .set('Authorization', `Bearer ${token}`);

    const secondApprove = await request(app)
      .post(`${env.API_PREFIX}/loans/${loanId}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(secondApprove.status).toBe(400);
  });

  it('prevents editing a loan once it is no longer pending', async () => {
    const token = await createAdminToken();
    const customer = await createCustomerFixture();

    const createRes = await request(app)
      .post(`${env.API_PREFIX}/loans`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: customer.id,
        principalAmount: 5000,
        interestRate: 10,
        totalInstallments: 5,
        emiType: 'weekly',
      });
    const loanId = createRes.body.data._id;

    await request(app)
      .post(`${env.API_PREFIX}/loans/${loanId}/approve`)
      .set('Authorization', `Bearer ${token}`);

    const updateRes = await request(app)
      .patch(`${env.API_PREFIX}/loans/${loanId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ interestRate: 20 });
    expect(updateRes.status).toBe(400);
  });
});

describe('Loans row-level scoping', () => {
  it('lets an agent see only loans for their assigned customers', async () => {
    const agentRole = await createRoleFixture({
      name: 'Collection Agent',
      permissions: [PERMISSIONS.LOANS_READ, PERMISSIONS.LOANS_CREATE],
    });
    const agentProfile = await createAgentFixture();
    const { user: agentUser, password } = await createUserFixture({
      email: 'agent@example.com',
      mobile: '9100000097',
      roleId: agentRole.id as string,
      accountType: 'agent',
    });
    agentProfile.linkedUser = agentUser._id;
    await agentProfile.save();

    const assignedCustomer = await createCustomerFixture({
      name: 'Assigned',
      mobile: '9123450020',
      assignedAgent: agentProfile.id as string,
    });
    const otherCustomer = await createCustomerFixture({ name: 'Other', mobile: '9123450021' });

    const adminToken = await createAdminToken();
    await request(app)
      .post(`${env.API_PREFIX}/loans`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer: assignedCustomer.id,
        principalAmount: 1000,
        interestRate: 5,
        totalInstallments: 2,
        emiType: 'monthly',
      });
    await request(app)
      .post(`${env.API_PREFIX}/loans`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer: otherCustomer.id,
        principalAmount: 2000,
        interestRate: 5,
        totalInstallments: 2,
        emiType: 'monthly',
      });

    const agentToken = await loginAs(agentUser.email, password);
    const res = await request(app)
      .get(`${env.API_PREFIX}/loans`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].customer._id).toBe(assignedCustomer.id);
  });
});
