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
import { Agent } from '../../src/models/Agent';

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
  const organization = await createOrganizationFixture();
  const { user, password } = await createUserFixture({
    email: 'admin@example.com',
    roleId: role.id as string,
    accountType: 'admin',
    organizationId: organization.id as string,
  });
  const res = await request(app)
    .post(`${env.API_PREFIX}/auth/login`)
    .send({ email: user.email, password });
  return { token: res.body.data.accessToken as string, organizationId: organization.id as string };
}

describe('Agents CRUD and assignment', () => {
  it('creates an agent and its linked login account', async () => {
    const { token } = await createAdminToken();
    await createRoleFixture({
      name: 'Collection Agent',
      permissions: [PERMISSIONS.CUSTOMERS_READ],
    });

    const res = await request(app)
      .post(`${env.API_PREFIX}/agents`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Field Agent',
        mobile: '9123456788',
        email: 'field.agent@example.com',
        area: 'North Zone',
        password: 'AgentPass@123',
        confirmPassword: 'AgentPass@123',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.agentCode).toMatch(/^AGT-/);

    const linkedUser = await User.findOne({ email: 'field.agent@example.com' });
    expect(linkedUser).not.toBeNull();
    expect(linkedUser?.accountType).toBe('agent');
    expect(String(res.body.data.linkedUser._id ?? res.body.data.linkedUser)).toBe(
      String(linkedUser?.id),
    );
  });

  it('rejects agent creation when password and confirmPassword do not match', async () => {
    const { token } = await createAdminToken();
    await createRoleFixture({ name: 'Collection Agent' });

    const res = await request(app)
      .post(`${env.API_PREFIX}/agents`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Field Agent',
        mobile: '9123456789',
        email: 'mismatch.agent@example.com',
        password: 'AgentPass@123',
        confirmPassword: 'Different@123',
      });

    expect(res.status).toBe(400);
  });

  it('rolls back agent creation when the email collides with an existing user', async () => {
    const { token } = await createAdminToken();
    const agentRole = await createRoleFixture({ name: 'Collection Agent' });
    await createUserFixture({
      email: 'taken@example.com',
      mobile: '9123456700',
      roleId: agentRole.id as string,
    });

    const res = await request(app)
      .post(`${env.API_PREFIX}/agents`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Field Agent',
        mobile: '9123456790',
        email: 'taken@example.com',
        password: 'AgentPass@123',
        confirmPassword: 'AgentPass@123',
      });

    expect(res.status).toBe(409);
    const orphanedAgent = await Agent.findOne({ mobile: '9123456790' });
    expect(orphanedAgent).toBeNull();
  });

  it('returns 400 when the Collection Agent role is not seeded', async () => {
    const { token } = await createAdminToken();

    const res = await request(app)
      .post(`${env.API_PREFIX}/agents`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Field Agent',
        mobile: '9123456791',
        email: 'norole.agent@example.com',
        password: 'AgentPass@123',
        confirmPassword: 'AgentPass@123',
      });

    expect(res.status).toBe(400);
  });

  it('assigns and unassigns customers to an agent', async () => {
    const { token, organizationId } = await createAdminToken();
    const agent = await createAgentFixture({ organizationId });
    const customer1 = await createCustomerFixture({
      name: 'C1',
      mobile: '9123450010',
      organizationId,
    });
    const customer2 = await createCustomerFixture({
      name: 'C2',
      mobile: '9123450011',
      organizationId,
    });

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
    const { token, organizationId } = await createAdminToken();
    const agent = await createAgentFixture({ organizationId });
    await createCustomerFixture({ assignedAgent: agent.id as string, organizationId });

    const res = await request(app)
      .delete(`${env.API_PREFIX}/agents/${agent.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it('returns agent performance metrics', async () => {
    const { token, organizationId } = await createAdminToken();
    const agent = await createAgentFixture({ organizationId });

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

describe('Agents cross-organization isolation', () => {
  it('returns 403 when an admin reads, updates, or deletes another organization agent', async () => {
    const { token } = await createAdminToken();
    const otherAgent = await createAgentFixture();

    const getRes = await request(app)
      .get(`${env.API_PREFIX}/agents/${otherAgent.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(403);
    expect(getRes.body.message).toBe('Access denied');

    const updateRes = await request(app)
      .patch(`${env.API_PREFIX}/agents/${otherAgent.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ area: 'Hijacked Zone' });
    expect(updateRes.status).toBe(403);
    expect(updateRes.body.message).toBe('Access denied');

    const deleteRes = await request(app)
      .delete(`${env.API_PREFIX}/agents/${otherAgent.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.message).toBe('Access denied');
  });

  it('excludes another organization agent from the list', async () => {
    const { token, organizationId } = await createAdminToken();
    await createAgentFixture({ mobile: '9100099999', organizationId });
    const otherAgent = await createAgentFixture();

    const res = await request(app)
      .get(`${env.API_PREFIX}/agents`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const found = res.body.data.items.find((item: { _id: string }) => item._id === otherAgent.id);
    expect(found).toBeUndefined();
  });
});
