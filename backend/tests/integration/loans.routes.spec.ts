import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../helpers/db';
import {
  createAgentFixture,
  createCustomerFixture,
  createOrganizationFixture,
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

let adminCounter = 0;

async function createAdminToken() {
  const n = ++adminCounter;
  const organization = await createOrganizationFixture();
  const role = await createRoleFixture({
    name: `Admin-${n}`,
    permissions: [PERMISSIONS.WILDCARD],
  });
  const { user, password } = await createUserFixture({
    email: `admin${n}@example.com`,
    mobile: `90000000${String(n).padStart(2, '0')}`,
    roleId: role.id as string,
    accountType: 'admin',
    organizationId: organization.id as string,
  });
  return { token: await loginAs(user.email, password), organization };
}

describe('Loans lifecycle', () => {
  it('creates a pending loan, approves it, and generates an EMI schedule', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });

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
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });

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
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });

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
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });

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
    const { token: adminToken, organization } = await createAdminToken();
    const organizationId = organization.id as string;
    const agentRole = await createRoleFixture({
      name: 'Collection Agent',
      permissions: [PERMISSIONS.LOANS_READ, PERMISSIONS.LOANS_CREATE],
    });
    const agentProfile = await createAgentFixture({ organizationId });
    const { user: agentUser, password } = await createUserFixture({
      email: 'agent@example.com',
      mobile: '9100000097',
      roleId: agentRole.id as string,
      accountType: 'agent',
      organizationId,
    });
    agentProfile.linkedUser = agentUser._id;
    await agentProfile.save();

    const assignedCustomer = await createCustomerFixture({
      name: 'Assigned',
      mobile: '9123450020',
      assignedAgent: agentProfile.id as string,
      organizationId,
    });
    const otherCustomer = await createCustomerFixture({
      name: 'Other',
      mobile: '9123450021',
      organizationId,
    });

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

describe('Loans cross-organization isolation', () => {
  it('rejects creating a loan against another organization customer', async () => {
    const { token } = await createAdminToken();
    const otherCustomer = await createCustomerFixture();

    const res = await request(app)
      .post(`${env.API_PREFIX}/loans`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: otherCustomer.id,
        principalAmount: 1000,
        interestRate: 5,
        totalInstallments: 2,
        emiType: 'monthly',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied');
  });

  it('returns 403 when an admin reads, updates, approves, or closes another organization loan', async () => {
    const { token: otherToken, organization: otherOrg } = await createAdminToken();
    const otherCustomer = await createCustomerFixture({
      organizationId: otherOrg.id as string,
    });
    const createRes = await request(app)
      .post(`${env.API_PREFIX}/loans`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        customer: otherCustomer.id,
        principalAmount: 1000,
        interestRate: 5,
        totalInstallments: 2,
        emiType: 'monthly',
      });
    const otherLoanId = createRes.body.data._id;

    const { token } = await createAdminToken();

    const getRes = await request(app)
      .get(`${env.API_PREFIX}/loans/${otherLoanId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(403);
    expect(getRes.body.message).toBe('Access denied');

    const updateRes = await request(app)
      .patch(`${env.API_PREFIX}/loans/${otherLoanId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ interestRate: 1 });
    expect(updateRes.status).toBe(403);

    const approveRes = await request(app)
      .post(`${env.API_PREFIX}/loans/${otherLoanId}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(approveRes.status).toBe(403);
  });

  it('excludes another organization loan from the list', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({
      mobile: '9123459001',
      organizationId: organization.id as string,
    });
    await request(app)
      .post(`${env.API_PREFIX}/loans`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: customer.id,
        principalAmount: 1000,
        interestRate: 5,
        totalInstallments: 2,
        emiType: 'monthly',
      });

    const { token: otherToken, organization: otherOrg } = await createAdminToken();
    const otherCustomer = await createCustomerFixture({
      mobile: '9123459002',
      organizationId: otherOrg.id as string,
    });
    const otherLoanRes = await request(app)
      .post(`${env.API_PREFIX}/loans`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        customer: otherCustomer.id,
        principalAmount: 2000,
        interestRate: 5,
        totalInstallments: 2,
        emiType: 'monthly',
      });
    const otherLoanId = otherLoanRes.body.data._id as string;

    const res = await request(app)
      .get(`${env.API_PREFIX}/loans`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const found = res.body.data.items.find((item: { _id: string }) => item._id === otherLoanId);
    expect(found).toBeUndefined();
  });
});
