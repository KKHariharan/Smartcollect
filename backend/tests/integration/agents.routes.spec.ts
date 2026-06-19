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

describe('Agents CRUD and assignment', () => {
  it('creates an agent', async () => {
    const token = await createAdminToken();

    const res = await request(app)
      .post(`${env.API_PREFIX}/agents`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Field Agent', mobile: '9123456788', area: 'North Zone' });

    expect(res.status).toBe(201);
    expect(res.body.data.agentCode).toMatch(/^AGT-/);
  });

  it('assigns and unassigns customers to an agent', async () => {
    const token = await createAdminToken();
    const agent = await createAgentFixture();
    const customer1 = await createCustomerFixture({ name: 'C1', mobile: '9123450010' });
    const customer2 = await createCustomerFixture({ name: 'C2', mobile: '9123450011' });

    const assignRes = await request(app)
      .post(`${env.API_PREFIX}/agents/${agent.id}/assign-customers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ customerIds: [customer1.id, customer2.id] });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.modified).toBe(2);

    const listRes = await request(app)
      .get(`${env.API_PREFIX}/agents/${agent.id}/customers`)
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.data).toHaveLength(2);

    const unassignRes = await request(app)
      .post(`${env.API_PREFIX}/agents/${agent.id}/unassign-customers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ customerIds: [customer1.id] });
    expect(unassignRes.status).toBe(200);
    expect(unassignRes.body.data.modified).toBe(1);

    const listAfterRes = await request(app)
      .get(`${env.API_PREFIX}/agents/${agent.id}/customers`)
      .set('Authorization', `Bearer ${token}`);
    expect(listAfterRes.body.data).toHaveLength(1);
  });

  it('prevents deleting an agent with assigned customers', async () => {
    const token = await createAdminToken();
    const agent = await createAgentFixture();
    await createCustomerFixture({ assignedAgent: agent.id as string });

    const res = await request(app)
      .delete(`${env.API_PREFIX}/agents/${agent.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it('returns agent performance metrics', async () => {
    const token = await createAdminToken();
    const agent = await createAgentFixture();

    const res = await request(app)
      .get(`${env.API_PREFIX}/agents/${agent.id}/performance`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      assignedCustomers: 0,
      activeLoans: 0,
      closedLoans: 0,
      collectionCount: 0,
      totalCollected: 0,
    });
  });
});
