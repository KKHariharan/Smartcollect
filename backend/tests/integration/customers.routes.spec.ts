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
import { User } from '../../src/models/User';
import { Customer } from '../../src/models/Customer';

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
  const organization = await createOrganizationFixture();
  const role = await createRoleFixture({ name: 'Admin', permissions: [PERMISSIONS.WILDCARD] });
  const { user, password } = await createUserFixture({
    email: 'admin@example.com',
    roleId: role.id as string,
    accountType: 'admin',
    organizationId: organization.id as string,
  });
  return { token: await loginAs(user.email, password), organization };
}

describe('Customers CRUD', () => {
  it('creates a customer and its linked login account', async () => {
    const { token } = await createAdminToken();
    await createRoleFixture({ name: 'Customer', permissions: [PERMISSIONS.LOANS_READ] });

    const createRes = await request(app)
      .post(`${env.API_PREFIX}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'John Doe',
        mobile: '9123456789',
        email: 'john.doe@example.com',
        occupation: 'Farmer',
        password: 'CustomerPass@123',
        confirmPassword: 'CustomerPass@123',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.customerCode).toMatch(/^CUST-/);

    const linkedUser = await User.findOne({ email: 'john.doe@example.com' });
    expect(linkedUser).not.toBeNull();
    expect(linkedUser?.accountType).toBe('customer');

    const getRes = await request(app)
      .get(`${env.API_PREFIX}/customers/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe('John Doe');
  });

  it('rejects customer creation when password and confirmPassword do not match', async () => {
    const { token } = await createAdminToken();
    await createRoleFixture({ name: 'Customer' });

    const res = await request(app)
      .post(`${env.API_PREFIX}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Jane Doe',
        mobile: '9123456792',
        email: 'jane.doe@example.com',
        password: 'CustomerPass@123',
        confirmPassword: 'Different@123',
      });

    expect(res.status).toBe(400);
  });

  it('rolls back customer creation when the email collides with an existing user', async () => {
    const { token } = await createAdminToken();
    const customerRole = await createRoleFixture({ name: 'Customer' });
    await createUserFixture({
      email: 'taken.customer@example.com',
      mobile: '9123456701',
      roleId: customerRole.id as string,
    });

    const res = await request(app)
      .post(`${env.API_PREFIX}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Jane Doe',
        mobile: '9123456793',
        email: 'taken.customer@example.com',
        password: 'CustomerPass@123',
        confirmPassword: 'CustomerPass@123',
      });

    expect(res.status).toBe(409);
    const orphanedCustomer = await Customer.findOne({ mobile: '9123456793' });
    expect(orphanedCustomer).toBeNull();
  });

  it('returns 400 when the Customer role is not seeded', async () => {
    const { token } = await createAdminToken();

    const res = await request(app)
      .post(`${env.API_PREFIX}/customers`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Jane Doe',
        mobile: '9123456794',
        email: 'norole.customer@example.com',
        password: 'CustomerPass@123',
        confirmPassword: 'CustomerPass@123',
      });

    expect(res.status).toBe(400);
  });

  it('adds a note to a customer', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });

    const res = await request(app)
      .post(`${env.API_PREFIX}/customers/${customer.id}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Customer requested a payment extension' });

    expect(res.status).toBe(201);
    expect(res.body.data.notes).toHaveLength(1);
    expect(res.body.data.notes[0].text).toBe('Customer requested a payment extension');
  });

  it('uploads a customer document', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });

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
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });

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
    const organization = await createOrganizationFixture();
    const agentRole = await createRoleFixture({
      name: 'Collection Agent',
      permissions: [PERMISSIONS.CUSTOMERS_READ],
    });
    const agentProfile = await createAgentFixture({ organizationId: organization.id as string });
    const { user: agentUser, password } = await createUserFixture({
      email: 'agent@example.com',
      mobile: '9100000099',
      roleId: agentRole.id as string,
      accountType: 'agent',
      organizationId: organization.id as string,
    });
    agentProfile.linkedUser = agentUser._id;
    await agentProfile.save();

    const assignedCustomer = await createCustomerFixture({
      name: 'Assigned Customer',
      mobile: '9123450001',
      assignedAgent: agentProfile.id as string,
      organizationId: organization.id as string,
    });
    await createCustomerFixture({
      name: 'Other Customer',
      mobile: '9123450002',
      organizationId: organization.id as string,
    });

    const token = await loginAs(agentUser.email, password);

    const res = await request(app)
      .get(`${env.API_PREFIX}/customers`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]._id).toBe(assignedCustomer.id);
  });

  it('lets a customer see only their own profile', async () => {
    const organization = await createOrganizationFixture();
    const customerRole = await createRoleFixture({
      name: 'Customer',
      permissions: [PERMISSIONS.CUSTOMERS_READ],
    });
    const { user: portalUser, password } = await createUserFixture({
      email: 'portal@example.com',
      mobile: '9100000098',
      roleId: customerRole.id as string,
      accountType: 'customer',
      organizationId: organization.id as string,
    });
    const ownProfile = await createCustomerFixture({
      name: 'Portal Customer',
      mobile: '9123450003',
      linkedUser: portalUser.id as string,
      organizationId: organization.id as string,
    });
    await createCustomerFixture({
      name: 'Someone Else',
      mobile: '9123450004',
      organizationId: organization.id as string,
    });

    const token = await loginAs(portalUser.email, password);

    const res = await request(app)
      .get(`${env.API_PREFIX}/customers`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]._id).toBe(ownProfile.id);
  });
});

describe('Customers cross-organization isolation', () => {
  it('returns 403 when an admin reads, updates, or deletes another organization customer', async () => {
    const { token } = await createAdminToken();
    const otherCustomer = await createCustomerFixture();

    const getRes = await request(app)
      .get(`${env.API_PREFIX}/customers/${otherCustomer.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(403);
    expect(getRes.body.message).toBe('Access denied');

    const updateRes = await request(app)
      .patch(`${env.API_PREFIX}/customers/${otherCustomer.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hijacked' });
    expect(updateRes.status).toBe(403);
    expect(updateRes.body.message).toBe('Access denied');

    const deleteRes = await request(app)
      .delete(`${env.API_PREFIX}/customers/${otherCustomer.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.message).toBe('Access denied');
  });

  it('excludes another organization customer from the list', async () => {
    const { token, organization } = await createAdminToken();
    await createCustomerFixture({
      mobile: '9123450099',
      organizationId: organization.id as string,
    });
    const otherCustomer = await createCustomerFixture();

    const res = await request(app)
      .get(`${env.API_PREFIX}/customers`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const found = res.body.data.items.find(
      (item: { _id: string }) => item._id === otherCustomer.id,
    );
    expect(found).toBeUndefined();
  });

  it('rejects assigning an agent from another organization to a customer', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });
    const otherAgent = await createAgentFixture();

    const res = await request(app)
      .patch(`${env.API_PREFIX}/customers/${customer.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assignedAgent: otherAgent.id });

    expect(res.status).toBe(400);
  });
});
