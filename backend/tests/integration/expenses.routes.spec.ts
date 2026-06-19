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
