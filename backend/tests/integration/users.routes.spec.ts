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

async function createAdminAndLogin() {
  const adminRole = await createRoleFixture({ name: 'Admin', permissions: [PERMISSIONS.WILDCARD] });
  const { user, password } = await createUserFixture({
    email: 'owner@example.com',
    roleId: adminRole.id as string,
    accountType: 'admin',
  });
  const loginRes = await request(app)
    .post(`${env.API_PREFIX}/auth/login`)
    .send({ email: user.email, password });
  return { token: loginRes.body.data.accessToken as string, adminRole, adminUser: user };
}

describe('Users CRUD', () => {
  it('creates a new agent account and excludes the password hash from the response', async () => {
    const { token, adminRole } = await createAdminAndLogin();

    const res = await request(app)
      .post(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Field Agent',
        email: 'agent1@example.com',
        mobile: '9123456780',
        password: 'AgentPass@123',
        role: adminRole.id,
        accountType: 'agent',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('agent1@example.com');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email with a 409', async () => {
    const { token, adminRole } = await createAdminAndLogin();
    const payload = {
      name: 'Dup User',
      email: 'dup@example.com',
      mobile: '9123456781',
      password: 'AgentPass@123',
      role: adminRole.id,
      accountType: 'agent',
    };

    await request(app)
      .post(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    const res = await request(app)
      .post(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...payload, mobile: '9123456782' });

    expect(res.status).toBe(409);
  });

  it('prevents a user from deleting their own account', async () => {
    const { token, adminUser } = await createAdminAndLogin();

    const res = await request(app)
      .delete(`${env.API_PREFIX}/users/${adminUser.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('soft-deletes a user so it no longer appears in listings', async () => {
    const { token, adminRole } = await createAdminAndLogin();
    const { user: target } = await createUserFixture({
      email: 'todelete@example.com',
      mobile: '9123456790',
      roleId: adminRole.id as string,
      accountType: 'agent',
    });

    const deleteRes = await request(app)
      .delete(`${env.API_PREFIX}/users/${target.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    const listRes = await request(app)
      .get(`${env.API_PREFIX}/users`)
      .set('Authorization', `Bearer ${token}`);
    const found = listRes.body.data.items.find(
      (item: { email: string }) => item.email === target.email,
    );
    expect(found).toBeUndefined();
  });
});
