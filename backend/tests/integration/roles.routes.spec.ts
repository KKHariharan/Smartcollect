import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../helpers/db';
import { createRoleFixture, createUserFixture } from '../helpers/factories';
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

describe('Roles RBAC enforcement', () => {
  it('rejects requests with no token', async () => {
    const res = await request(app).get(`${env.API_PREFIX}/roles`);
    expect(res.status).toBe(401);
  });

  it('rejects a user without roles:read permission', async () => {
    const limitedRole = await createRoleFixture({ name: 'Agent', permissions: [] });
    const { user, password } = await createUserFixture({
      email: 'agent@example.com',
      roleId: limitedRole.id as string,
      accountType: 'agent',
    });
    const token = await loginAs(user.email, password);

    const res = await request(app)
      .get(`${env.API_PREFIX}/roles`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('allows a wildcard-permission user to list roles', async () => {
    const adminRole = await createRoleFixture({
      name: 'Admin',
      permissions: [PERMISSIONS.WILDCARD],
    });
    const { user, password } = await createUserFixture({
      email: 'admin@example.com',
      roleId: adminRole.id as string,
      accountType: 'admin',
    });
    const token = await loginAs(user.email, password);

    const res = await request(app)
      .get(`${env.API_PREFIX}/roles`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Roles CRUD', () => {
  async function getAdminToken() {
    const adminRole = await createRoleFixture({
      name: 'Admin',
      permissions: [PERMISSIONS.WILDCARD],
    });
    const { user, password } = await createUserFixture({
      email: 'admin2@example.com',
      roleId: adminRole.id as string,
      accountType: 'admin',
    });
    return loginAs(user.email, password);
  }

  it('creates, updates, and deletes a custom role', async () => {
    const token = await getAdminToken();

    const createRes = await request(app)
      .post(`${env.API_PREFIX}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Collection Agent', permissions: [PERMISSIONS.USERS_READ] });
    expect(createRes.status).toBe(201);
    const roleId = createRes.body.data._id;

    const updateRes = await request(app)
      .patch(`${env.API_PREFIX}/roles/${roleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Field collection agent role' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.description).toBe('Field collection agent role');

    const deleteRes = await request(app)
      .delete(`${env.API_PREFIX}/roles/${roleId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    const getRes = await request(app)
      .get(`${env.API_PREFIX}/roles/${roleId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('rejects invalid permission values', async () => {
    const token = await getAdminToken();

    const res = await request(app)
      .post(`${env.API_PREFIX}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad Role', permissions: ['not:a:real:permission'] });
    expect(res.status).toBe(400);
  });

  it('prevents deleting a system role', async () => {
    const token = await getAdminToken();
    const systemRole = await createRoleFixture({ name: 'System Admin', isSystem: true });

    const res = await request(app)
      .delete(`${env.API_PREFIX}/roles/${systemRole.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
