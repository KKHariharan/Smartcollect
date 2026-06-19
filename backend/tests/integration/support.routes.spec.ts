import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../helpers/db';
import { createCustomerFixture, createRoleFixture, createUserFixture } from '../helpers/factories';
import { env } from '../../src/config/env';
import { PERMISSIONS } from '../../src/constants/permissions';

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

describe('Support tickets', () => {
  it('lets an admin raise a ticket on behalf of a customer and update its status', async () => {
    const token = await createAdminToken();
    const customer = await createCustomerFixture();

    const createRes = await request(app)
      .post(`${env.API_PREFIX}/support-tickets`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: customer.id,
        subject: 'Payment not reflected',
        description: 'I paid via UPI but it is not showing in my history',
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.ticketNumber).toMatch(/^TKT-/);
    const ticketId = createRes.body.data._id;

    const statusRes = await request(app)
      .patch(`${env.API_PREFIX}/support-tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'resolved' });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe('resolved');
    expect(statusRes.body.data.resolvedAt).not.toBeNull();
  });

  it('lets a customer raise their own ticket and forces ownership regardless of payload', async () => {
    const customerRole = await createRoleFixture({
      name: 'Customer',
      permissions: [PERMISSIONS.SUPPORT_CREATE, PERMISSIONS.SUPPORT_READ],
    });
    const { user: portalUser, password } = await createUserFixture({
      email: 'portal@example.com',
      mobile: '9100000096',
      roleId: customerRole.id as string,
      accountType: 'customer',
    });
    const ownProfile = await createCustomerFixture({
      name: 'Portal Customer',
      mobile: '9123450030',
      linkedUser: portalUser.id as string,
    });
    const someoneElse = await createCustomerFixture({ name: 'Other', mobile: '9123450031' });

    const token = await loginAs(portalUser.email, password);

    const res = await request(app)
      .post(`${env.API_PREFIX}/support-tickets`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: someoneElse.id,
        subject: 'EMI question',
        description: 'When is my next EMI due?',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.customer._id).toBe(ownProfile.id);
  });

  it("prevents a customer from viewing another customer's ticket", async () => {
    const customerRole = await createRoleFixture({
      name: 'Customer',
      permissions: [PERMISSIONS.SUPPORT_CREATE, PERMISSIONS.SUPPORT_READ],
    });
    const adminToken = await createAdminToken();
    const otherCustomer = await createCustomerFixture({ mobile: '9123450032' });

    const ticketRes = await request(app)
      .post(`${env.API_PREFIX}/support-tickets`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer: otherCustomer.id,
        subject: 'Loan closure',
        description: 'Please close my loan',
      });

    const { user: portalUser, password } = await createUserFixture({
      email: 'portal2@example.com',
      mobile: '9100000095',
      roleId: customerRole.id as string,
      accountType: 'customer',
    });
    await createCustomerFixture({
      name: 'Different Customer',
      mobile: '9123450033',
      linkedUser: portalUser.id as string,
    });
    const token = await loginAs(portalUser.email, password);

    const res = await request(app)
      .get(`${env.API_PREFIX}/support-tickets/${ticketRes.body.data._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('adds a message to a ticket thread', async () => {
    const token = await createAdminToken();
    const customer = await createCustomerFixture();

    const ticketRes = await request(app)
      .post(`${env.API_PREFIX}/support-tickets`)
      .set('Authorization', `Bearer ${token}`)
      .send({ customer: customer.id, subject: 'Test', description: 'Test description' });

    const res = await request(app)
      .post(`${env.API_PREFIX}/support-tickets/${ticketRes.body.data._id}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'We are looking into this.' });

    expect(res.status).toBe(201);
    expect(res.body.data.messages).toHaveLength(1);
  });
});
