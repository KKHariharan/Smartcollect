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

let adminCounter = 0;

async function createAdminToken() {
  const n = ++adminCounter;
  const role = await createRoleFixture({
    name: `Admin-${n}`,
    permissions: [PERMISSIONS.WILDCARD],
  });
  const { user, password } = await createUserFixture({
    email: `admin${n}@example.com`,
    mobile: `90000000${String(n).padStart(2, '0')}`,
    roleId: role.id as string,
    accountType: 'admin',
  });
  const res = await request(app)
    .post(`${env.API_PREFIX}/auth/login`)
    .send({ email: user.email, password });
  return res.body.data.accessToken as string;
}

describe('Expenses CRUD and summary', () => {
  it('creates, updates, and deletes an expense', async () => {
    const token = await createAdminToken();

    const createRes = await request(app)
      .post(`${env.API_PREFIX}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'fuel', amount: 500, description: 'Bike fuel for collections' });
    expect(createRes.status).toBe(201);
    const expenseId = createRes.body.data._id;

    const updateRes = await request(app)
      .patch(`${env.API_PREFIX}/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 600 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.amount).toBe(600);

    const deleteRes = await request(app)
      .delete(`${env.API_PREFIX}/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    const getRes = await request(app)
      .get(`${env.API_PREFIX}/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('summarizes expenses by category', async () => {
    const token = await createAdminToken();

    await request(app)
      .post(`${env.API_PREFIX}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'rent', amount: 1000 });
    await request(app)
      .post(`${env.API_PREFIX}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'rent', amount: 500 });
    await request(app)
      .post(`${env.API_PREFIX}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'fuel', amount: 200 });

    const res = await request(app)
      .get(`${env.API_PREFIX}/expenses/summary`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.grandTotal).toBe(1700);
    const rentEntry = res.body.data.byCategory.find(
      (e: { category: string }) => e.category === 'rent',
    );
    expect(rentEntry.total).toBe(1500);
    expect(rentEntry.count).toBe(2);
  });
});

describe('Expenses cross-organization isolation', () => {
  it('returns 403 when an admin reads, updates, or deletes another organization expense', async () => {
    const otherToken = await createAdminToken();
    const createRes = await request(app)
      .post(`${env.API_PREFIX}/expenses`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ category: 'fuel', amount: 300 });
    const otherExpenseId = createRes.body.data._id;

    const token = await createAdminToken();

    const getRes = await request(app)
      .get(`${env.API_PREFIX}/expenses/${otherExpenseId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(403);
    expect(getRes.body.message).toBe('Access denied');

    const updateRes = await request(app)
      .patch(`${env.API_PREFIX}/expenses/${otherExpenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1 });
    expect(updateRes.status).toBe(403);
    expect(updateRes.body.message).toBe('Access denied');

    const deleteRes = await request(app)
      .delete(`${env.API_PREFIX}/expenses/${otherExpenseId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.message).toBe('Access denied');
  });

  it('excludes another organization expenses from the list and summary', async () => {
    const token = await createAdminToken();
    await request(app)
      .post(`${env.API_PREFIX}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'fuel', amount: 100 });

    const otherToken = await createAdminToken();
    const otherRes = await request(app)
      .post(`${env.API_PREFIX}/expenses`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ category: 'fuel', amount: 99999 });
    const otherExpenseId = otherRes.body.data._id as string;

    const listRes = await request(app)
      .get(`${env.API_PREFIX}/expenses`)
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    const found = listRes.body.data.items.find(
      (item: { _id: string }) => item._id === otherExpenseId,
    );
    expect(found).toBeUndefined();

    const summaryRes = await request(app)
      .get(`${env.API_PREFIX}/expenses/summary`)
      .set('Authorization', `Bearer ${token}`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.grandTotal).toBe(100);
  });
});
