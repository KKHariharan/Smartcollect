import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../helpers/db';
import {
  createOrganizationFixture,
  createRoleFixture,
  createUserFixture,
} from '../helpers/factories';
import { Agent } from '../../src/models/Agent';
import { Customer } from '../../src/models/Customer';
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

async function createAdminAndLogin() {
  const adminRole = await createRoleFixture({ name: 'Admin', permissions: [PERMISSIONS.WILDCARD] });
  const organization = await createOrganizationFixture();
  const { user, password } = await createUserFixture({
    email: 'owner@example.com',
    roleId: adminRole.id as string,
    accountType: 'admin',
    organizationId: organization.id as string,
  });
  const loginRes = await request(app)
    .post(`${env.API_PREFIX}/auth/login`)
    .send({ email: user.email, password });
  return {
    token: loginRes.body.data.accessToken as string,
    adminRole,
    adminUser: user,
    organization,
  };
}

async function createSuperAdminAndLogin() {
  const superAdminRole = await createRoleFixture({
    name: 'Super Admin',
    permissions: [PERMISSIONS.WILDCARD],
  });
  const { user, password } = await createUserFixture({
    email: 'platform-owner@example.com',
    roleId: superAdminRole.id as string,
    accountType: 'super_admin',
    organizationId: null,
  });
  const loginRes = await request(app)
    .post(`${env.API_PREFIX}/auth/login`)
    .send({ email: user.email, password });
  return { token: loginRes.body.data.accessToken as string, superAdminRole, superAdminUser: user };
}

describe('Users CRUD', () => {
  it('creates an admin-tier user with a free-form role and excludes the password hash', async () => {
    const { token, adminRole, organization } = await createAdminAndLogin();

    const res = await request(app)
      .post(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Another Admin',
        email: 'admin2@example.com',
        mobile: '9123456780',
        password: 'AgentPass@123',
        confirmPassword: 'AgentPass@123',
        accountType: 'admin',
        role: adminRole.id,
        organizationId: organization.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('admin2@example.com');
    expect(res.body.data.accountType).toBe('admin');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('creates an agent-tier user and auto-provisions the linked Agent profile', async () => {
    const { token, organization } = await createAdminAndLogin();
    await createRoleFixture({ name: 'Collection Agent' });

    const res = await request(app)
      .post(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Field Agent',
        email: 'fieldagent@example.com',
        mobile: '9123456781',
        password: 'AgentPass@123',
        confirmPassword: 'AgentPass@123',
        accountType: 'agent',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.accountType).toBe('agent');

    const agent = await Agent.findOne({ linkedUser: res.body.data._id });
    expect(agent).not.toBeNull();
    expect(agent?.email).toBe('fieldagent@example.com');
    expect(agent?.organizationId?.toString()).toBe(organization.id as string);
  });

  it('creates a customer-tier user and auto-provisions the linked Customer profile', async () => {
    const { token } = await createAdminAndLogin();
    await createRoleFixture({ name: 'Customer' });

    const res = await request(app)
      .post(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'John Customer',
        email: 'johncustomer@example.com',
        mobile: '9123456782',
        password: 'AgentPass@123',
        confirmPassword: 'AgentPass@123',
        accountType: 'customer',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.accountType).toBe('customer');

    const customer = await Customer.findOne({ linkedUser: res.body.data._id });
    expect(customer).not.toBeNull();
    expect(customer?.email).toBe('johncustomer@example.com');
  });

  it('stamps the creating admin own organization, ignoring a client-supplied organizationId', async () => {
    const { token, organization } = await createAdminAndLogin();
    const otherOrganization = await createOrganizationFixture();
    await createRoleFixture({ name: 'Customer' });

    const res = await request(app)
      .post(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Jane Customer',
        email: 'janecustomer@example.com',
        mobile: '9123456783',
        password: 'AgentPass@123',
        confirmPassword: 'AgentPass@123',
        accountType: 'customer',
        organizationId: otherOrganization.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.organizationId._id).toBe(organization.id as string);
  });

  it('rejects a non-super-admin attempting to create a Super Admin account', async () => {
    const { token } = await createAdminAndLogin();
    await createRoleFixture({ name: 'Super Admin' });

    const res = await request(app)
      .post(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Sneaky Super Admin',
        email: 'sneaky@example.com',
        mobile: '9123456784',
        password: 'AgentPass@123',
        confirmPassword: 'AgentPass@123',
        accountType: 'super_admin',
      });

    expect(res.status).toBe(403);
  });

  it('lets a Super Admin create an Admin in a chosen organization', async () => {
    const { token } = await createSuperAdminAndLogin();
    const organization = await createOrganizationFixture();
    const adminRole = await createRoleFixture({ name: 'Admin', permissions: [PERMISSIONS.WILDCARD] });

    const res = await request(app)
      .post(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Org Admin',
        email: 'orgadmin@example.com',
        mobile: '9123456785',
        password: 'AgentPass@123',
        confirmPassword: 'AgentPass@123',
        accountType: 'admin',
        role: adminRole.id,
        organizationId: organization.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.organizationId._id).toBe(organization.id as string);
  });

  it('rejects duplicate email with a 409', async () => {
    const { token, adminRole, organization } = await createAdminAndLogin();
    const payload = {
      name: 'Dup User',
      email: 'dup@example.com',
      mobile: '9123456786',
      password: 'AgentPass@123',
      confirmPassword: 'AgentPass@123',
      accountType: 'admin',
      role: adminRole.id,
      organizationId: organization.id,
    };

    await request(app)
      .post(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    const res = await request(app)
      .post(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...payload, mobile: '9123456787' });

    expect(res.status).toBe(409);
  });

  it('rejects role changes on agent/customer accounts (managed automatically)', async () => {
    const { token, organization } = await createAdminAndLogin();
    const customerRole = await createRoleFixture({ name: 'Customer' });
    const { user: target } = await createUserFixture({
      email: 'staysagent@example.com',
      mobile: '9123456788',
      roleId: customerRole.id as string,
      accountType: 'customer',
      organizationId: organization.id as string,
    });

    const res = await request(app)
      .patch(`${env.API_PREFIX}/users/${target.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: customerRole.id });

    expect(res.status).toBe(400);
  });

  it('syncs name/email/mobile changes to the linked Agent profile', async () => {
    const { token, organization } = await createAdminAndLogin();
    const agentRole = await createRoleFixture({ name: 'Collection Agent' });
    const { user: target } = await createUserFixture({
      email: 'syncagent@example.com',
      mobile: '9123456789',
      roleId: agentRole.id as string,
      accountType: 'agent',
      organizationId: organization.id as string,
    });
    await Agent.create({
      agentCode: 'AGT-SYNC1',
      name: 'Old Name',
      mobile: '9123456789',
      email: 'syncagent@example.com',
      linkedUser: target._id,
      organizationId: organization.id,
    });

    const res = await request(app)
      .patch(`${env.API_PREFIX}/users/${target.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', isActive: false });

    expect(res.status).toBe(200);
    const agent = await Agent.findOne({ linkedUser: target.id });
    expect(agent?.name).toBe('New Name');
    expect(agent?.status).toBe('inactive');
  });

  it('prevents a user from deleting their own account', async () => {
    const { token, adminUser } = await createAdminAndLogin();

    const res = await request(app)
      .delete(`${env.API_PREFIX}/users/${adminUser.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('soft-deletes a user, deactivates its linked Customer, and excludes it from listings', async () => {
    const { token, organization } = await createAdminAndLogin();
    const customerRole = await createRoleFixture({ name: 'Customer' });
    const { user: target } = await createUserFixture({
      email: 'todelete@example.com',
      mobile: '9123456790',
      roleId: customerRole.id as string,
      accountType: 'customer',
      organizationId: organization.id as string,
    });
    await Customer.create({
      customerCode: 'CUST-DEL1',
      name: 'To Delete',
      mobile: '9123456790',
      email: 'todelete@example.com',
      linkedUser: target._id,
      organizationId: organization.id,
    });

    const deleteRes = await request(app)
      .delete(`${env.API_PREFIX}/users/${target.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    const customer = await Customer.findOne({ linkedUser: target.id });
    expect(customer?.isActive).toBe(false);

    const listRes = await request(app)
      .get(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`);
    const found = listRes.body.data.items.find(
      (item: { email: string }) => item.email === target.email,
    );
    expect(found).toBeUndefined();
  });

  it('scopes the user list to the requesting admin own organization', async () => {
    const { token } = await createAdminAndLogin();
    const otherOrganization = await createOrganizationFixture();
    const otherRole = await createRoleFixture({ name: 'Other Org Admin' });
    await createUserFixture({
      email: 'otherorg@example.com',
      mobile: '9123456791',
      roleId: otherRole.id as string,
      organizationId: otherOrganization.id as string,
    });

    const res = await request(app)
      .get(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const found = res.body.data.items.find(
      (item: { email: string }) => item.email === 'otherorg@example.com',
    );
    expect(found).toBeUndefined();
  });

  it('returns 403 when an admin fetches a user from another organization', async () => {
    const { token } = await createAdminAndLogin();
    const otherOrganization = await createOrganizationFixture();
    const otherRole = await createRoleFixture({ name: 'Other Org Admin' });
    const { user: otherUser } = await createUserFixture({
      email: 'crossorg-get@example.com',
      mobile: '9123456792',
      roleId: otherRole.id as string,
      organizationId: otherOrganization.id as string,
    });

    const res = await request(app)
      .get(`${env.API_PREFIX}/users/${otherUser.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied');
  });

  it('returns 403 when an admin updates a user from another organization', async () => {
    const { token } = await createAdminAndLogin();
    const otherOrganization = await createOrganizationFixture();
    const otherRole = await createRoleFixture({ name: 'Other Org Admin 2' });
    const { user: otherUser } = await createUserFixture({
      email: 'crossorg-update@example.com',
      mobile: '9123456793',
      roleId: otherRole.id as string,
      organizationId: otherOrganization.id as string,
    });

    const res = await request(app)
      .patch(`${env.API_PREFIX}/users/${otherUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hijacked Name' });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied');
  });

  it('returns 403 when an admin deletes a user from another organization', async () => {
    const { token } = await createAdminAndLogin();
    const otherOrganization = await createOrganizationFixture();
    const otherRole = await createRoleFixture({ name: 'Other Org Admin 3' });
    const { user: otherUser } = await createUserFixture({
      email: 'crossorg-delete@example.com',
      mobile: '9123456794',
      roleId: otherRole.id as string,
      organizationId: otherOrganization.id as string,
    });

    const res = await request(app)
      .delete(`${env.API_PREFIX}/users/${otherUser.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied');
  });
});
