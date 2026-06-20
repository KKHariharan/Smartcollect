import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../helpers/db';
import {
  createCustomerFixture,
  createOrganizationFixture,
  createRoleFixture,
  createUserFixture,
} from '../helpers/factories';
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

describe('Support tickets', () => {
  it('lets an admin raise a ticket on behalf of a customer and update its status', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });

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
    const organization = await createOrganizationFixture();
    const customerRole = await createRoleFixture({
      name: 'Customer',
      permissions: [PERMISSIONS.SUPPORT_CREATE, PERMISSIONS.SUPPORT_READ],
    });
    const { user: portalUser, password } = await createUserFixture({
      email: 'portal@example.com',
      mobile: '9100000096',
      roleId: customerRole.id as string,
      accountType: 'customer',
      organizationId: organization.id as string,
    });
    const ownProfile = await createCustomerFixture({
      name: 'Portal Customer',
      mobile: '9123450030',
      linkedUser: portalUser.id as string,
      organizationId: organization.id as string,
    });
    const someoneElse = await createCustomerFixture({
      name: 'Other',
      mobile: '9123450031',
      organizationId: organization.id as string,
    });

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
    const organization = await createOrganizationFixture();
    const customerRole = await createRoleFixture({
      name: 'Customer',
      permissions: [PERMISSIONS.SUPPORT_CREATE, PERMISSIONS.SUPPORT_READ],
    });
    const adminRole = await createRoleFixture({ name: 'Admin', permissions: [PERMISSIONS.WILDCARD] });
    const { user: adminUser, password: adminPassword } = await createUserFixture({
      email: 'admin@example.com',
      roleId: adminRole.id as string,
      accountType: 'admin',
      organizationId: organization.id as string,
    });
    const adminToken = await loginAs(adminUser.email, adminPassword);
    const otherCustomer = await createCustomerFixture({
      mobile: '9123450032',
      organizationId: organization.id as string,
    });

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
      organizationId: organization.id as string,
    });
    await createCustomerFixture({
      name: 'Different Customer',
      mobile: '9123450033',
      linkedUser: portalUser.id as string,
      organizationId: organization.id as string,
    });
    const token = await loginAs(portalUser.email, password);

    const res = await request(app)
      .get(`${env.API_PREFIX}/support-tickets/${ticketRes.body.data._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('adds a message to a ticket thread', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });

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

describe('Support tickets cross-organization isolation', () => {
  it('rejects raising a ticket against another organization customer', async () => {
    const { token } = await createAdminToken();
    const otherCustomer = await createCustomerFixture();

    const res = await request(app)
      .post(`${env.API_PREFIX}/support-tickets`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: otherCustomer.id,
        subject: 'Cross org attempt',
        description: 'Should be rejected',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied');
  });

  it('returns 403 when an admin reads or updates another organization ticket', async () => {
    const { token: otherToken, organization: otherOrg } = await createAdminToken();
    const otherCustomer = await createCustomerFixture({
      organizationId: otherOrg.id as string,
    });
    const ticketRes = await request(app)
      .post(`${env.API_PREFIX}/support-tickets`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        customer: otherCustomer.id,
        subject: 'Other org ticket',
        description: 'Belongs to another tenant',
      });
    const otherTicketId = ticketRes.body.data._id as string;

    const { token } = await createAdminToken();

    const getRes = await request(app)
      .get(`${env.API_PREFIX}/support-tickets/${otherTicketId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(403);
    expect(getRes.body.message).toBe('Access denied');

    const statusRes = await request(app)
      .patch(`${env.API_PREFIX}/support-tickets/${otherTicketId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'closed' });
    expect(statusRes.status).toBe(403);
    expect(statusRes.body.message).toBe('Access denied');

    const messageRes = await request(app)
      .post(`${env.API_PREFIX}/support-tickets/${otherTicketId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Trying to butt in' });
    expect(messageRes.status).toBe(403);
    expect(messageRes.body.message).toBe('Access denied');
  });

  it('excludes another organization ticket from the list', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({
      mobile: '9123459005',
      organizationId: organization.id as string,
    });
    await request(app)
      .post(`${env.API_PREFIX}/support-tickets`)
      .set('Authorization', `Bearer ${token}`)
      .send({ customer: customer.id, subject: 'Mine', description: 'My own ticket' });

    const { token: otherToken, organization: otherOrg } = await createAdminToken();
    const otherCustomer = await createCustomerFixture({
      mobile: '9123459006',
      organizationId: otherOrg.id as string,
    });
    const otherTicketRes = await request(app)
      .post(`${env.API_PREFIX}/support-tickets`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ customer: otherCustomer.id, subject: 'Theirs', description: 'Another tenant' });
    const otherTicketId = otherTicketRes.body.data._id as string;

    const res = await request(app)
      .get(`${env.API_PREFIX}/support-tickets`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const found = res.body.data.items.find((item: { _id: string }) => item._id === otherTicketId);
    expect(found).toBeUndefined();
  });
});
