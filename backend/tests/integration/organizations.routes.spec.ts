import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../helpers/db';
import { createOrganizationFixture, createRoleFixture, createUserFixture } from '../helpers/factories';
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

async function getSuperAdminToken() {
  const role = await createRoleFixture({ name: 'Super Admin', permissions: [PERMISSIONS.WILDCARD] });
  const { user, password } = await createUserFixture({
    email: 'superadmin@example.com',
    roleId: role.id as string,
    accountType: 'super_admin',
    organizationId: null,
  });
  return loginAs(user.email, password);
}

async function getAdminToken(organizationId?: string) {
  const role = await createRoleFixture({ name: 'Admin', permissions: [PERMISSIONS.WILDCARD] });
  const { user, password } = await createUserFixture({
    email: 'orgadmin@example.com',
    roleId: role.id as string,
    accountType: 'admin',
    organizationId,
  });
  return { token: await loginAs(user.email, password), user };
}

describe('Organizations CRUD and account-type gating', () => {
  it('rejects an Admin attempting to create an organization', async () => {
    const { token } = await getAdminToken();

    const res = await request(app)
      .post(`${env.API_PREFIX}/organizations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Org' });

    expect(res.status).toBe(403);
  });

  it('lets a Super Admin create, update, and delete an organization', async () => {
    const token = await getSuperAdminToken();

    const createRes = await request(app)
      .post(`${env.API_PREFIX}/organizations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Acme Lending' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.code).toMatch(/^ORG-/);
    const orgId = createRes.body.data._id;

    const updateRes = await request(app)
      .patch(`${env.API_PREFIX}/organizations/${orgId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'inactive' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('inactive');

    const deleteRes = await request(app)
      .delete(`${env.API_PREFIX}/organizations/${orgId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    const getRes = await request(app)
      .get(`${env.API_PREFIX}/organizations/${orgId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('blocks deleting an organization that still has users assigned to it', async () => {
    const token = await getSuperAdminToken();
    const organization = await createOrganizationFixture();
    await createUserFixture({
      email: 'tenant@example.com',
      mobile: '9123456700',
      organizationId: organization.id as string,
    });

    const res = await request(app)
      .delete(`${env.API_PREFIX}/organizations/${organization.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it('lets a Super Admin list organizations across all tenants', async () => {
    const token = await getSuperAdminToken();
    await createOrganizationFixture();
    await createOrganizationFixture();

    const res = await request(app)
      .get(`${env.API_PREFIX}/organizations`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(2);
  });

  it('scopes an Admin to only their own organization', async () => {
    const organization = await createOrganizationFixture();
    const { token } = await getAdminToken(organization.id as string);
    await createOrganizationFixture();
    await createOrganizationFixture();

    const listRes = await request(app)
      .get(`${env.API_PREFIX}/organizations`)
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.items).toHaveLength(1);
    expect(listRes.body.data.items[0]._id).toBe(organization.id as string);

    const otherOrganization = await createOrganizationFixture();
    const getRes = await request(app)
      .get(`${env.API_PREFIX}/organizations/${otherOrganization.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(403);
    expect(getRes.body.message).toBe('Access denied');
  });

  it('rejects an Admin attempting to update or delete any organization (super-admin only routes)', async () => {
    const organization = await createOrganizationFixture();
    const { token } = await getAdminToken(organization.id as string);

    const updateRes = await request(app)
      .patch(`${env.API_PREFIX}/organizations/${organization.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'inactive' });
    expect(updateRes.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`${env.API_PREFIX}/organizations/${organization.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(403);
  });
});
