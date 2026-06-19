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

async function createAdminToken() {
  const role = await createRoleFixture({ name: 'Admin', permissions: [PERMISSIONS.WILDCARD] });
  const { user, password } = await createUserFixture({
    email: 'admin@example.com',
    roleId: role.id as string,
    accountType: 'admin',
  });
  const res = await request(app)
    .post(`${env.API_PREFIX}/auth/login`)
    .send({ email: user.email, password });
  return res.body.data.accessToken as string;
}

describe('Settings', () => {
  it('returns default settings on first access', async () => {
    const token = await createAdminToken();

    const res = await request(app)
      .get(`${env.API_PREFIX}/settings`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.company.name).toBe('My Finance Company');
    expect(res.body.data.receipt.prefix).toBe('RCPT');
  });

  it('updates settings and persists the change', async () => {
    const token = await createAdminToken();

    const updateRes = await request(app)
      .patch(`${env.API_PREFIX}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        company: { name: 'Acme Finance Co' },
        interest: { defaultInterestRate: 15 },
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.company.name).toBe('Acme Finance Co');
    expect(updateRes.body.data.interest.defaultInterestRate).toBe(15);

    const getRes = await request(app)
      .get(`${env.API_PREFIX}/settings`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.body.data.company.name).toBe('Acme Finance Co');
  });

  it('rejects access without settings:read permission', async () => {
    const role = await createRoleFixture({ name: 'Limited', permissions: [] });
    const { user, password } = await createUserFixture({
      email: 'limited@example.com',
      roleId: role.id as string,
      accountType: 'admin',
    });
    const loginRes = await request(app)
      .post(`${env.API_PREFIX}/auth/login`)
      .send({ email: user.email, password });

    const res = await request(app)
      .get(`${env.API_PREFIX}/settings`)
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });
});
