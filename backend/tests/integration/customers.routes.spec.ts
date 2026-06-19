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

describe('Customers CRUD', () => {
  it('creates and retrieves a customer', async () => {
    const token = await createAdminToken();

    const createRes = await request(app)
      .post(`${env.API_PREFIX}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'John Doe', mobile: '9123456789', occupation: 'Farmer' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.customerCode).toMatch(/^CUST-/);

    const getRes = await request(app)
      .get(`${env.API_PREFIX}/customers/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe('John Doe');
  });

  it('adds a note to a customer', async () => {
    const token = await createAdminToken();
    const customer = await createCustomerFixture();

    const res = await request(app)
      .post(`${env.API_PREFIX}/customers/${customer.id}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Customer requested a payment extension' });

    expect(res.status).toBe(201);
    expect(res.body.data.notes).toHaveLength(1);
    expect(res.body.data.notes[0].text).toBe('Customer requested a payment extension');
  });

  it('uploads a customer document', async () => {
    const token = await createAdminToken();
    const customer = await createCustomerFixture();

    const res = await request(app)
      .post(`${env.API_PREFIX}/customers/${customer.id}/documents/photo`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake-image-bytes'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.documents.photo.url).toContain('stub-storage.local');
  });

  it('rejects a document upload with a disallowed mime type', async () => {
    const token = await createAdminToken();
    const customer = await createCustomerFixture();

    const res = await request(app)
      .post(`${env.API_PREFIX}/customers/${customer.id}/documents/photo`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('not-an-image'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      });

    expect(res.status).toBe(400);
  });
});

describe('Customers row-level scoping', () => {
  it('lets an agent see only their assigned customers', async () => {
    const agentRole = await createRoleFixture({
      name: 'Collection Agent',
      permissions: [PERMISSIONS.CUSTOMERS_READ],
    });
    const agentProfile = await createAgentFixture();
    const { user: agentUser, password } = await createUserFixture({
      email: 'agent@example.com',
      mobile: '9100000099',
      roleId: agentRole.id as string,
      accountType: 'agent',
    });
    agentProfile.linkedUser = agentUser._id;
    await agentProfile.save();

    const assignedCustomer = await createCustomerFixture({
      name: 'Assigned Customer',
      mobile: '9123450001',
      assignedAgent: agentProfile.id as string,
    });
    await createCustomerFixture({ name: 'Other Customer', mobile: '9123450002' });

    const token = await loginAs(agentUser.email, password);

    const res = await request(app)
      .get(`${env.API_PREFIX}/customers`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]._id).toBe(assignedCustomer.id);
  });

  it('lets a customer see only their own profile', async () => {
    const customerRole = await createRoleFixture({
      name: 'Customer',
      permissions: [PERMISSIONS.CUSTOMERS_READ],
    });
    const { user: portalUser, password } = await createUserFixture({
      email: 'portal@example.com',
      mobile: '9100000098',
      roleId: customerRole.id as string,
      accountType: 'customer',
    });
    const ownProfile = await createCustomerFixture({
      name: 'Portal Customer',
      mobile: '9123450003',
      linkedUser: portalUser.id as string,
    });
    await createCustomerFixture({ name: 'Someone Else', mobile: '9123450004' });

    const token = await loginAs(portalUser.email, password);

    const res = await request(app)
      .get(`${env.API_PREFIX}/customers`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]._id).toBe(ownProfile.id);
  });
});
