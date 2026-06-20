import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../helpers/db';
import {
  createCustomerFixture,
  createOrganizationFixture,
  createRoleFixture,
  createUserFixture,
} from '../helpers/factories';
import { env } from '../../src/config/env';
import { PERMISSIONS } from '../../src/constants/permissions';
import { Loan } from '../../src/models/Loan';

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
  const organization = await createOrganizationFixture();
  const role = await createRoleFixture({
    name: `Admin-${n}`,
    permissions: [PERMISSIONS.WILDCARD],
  });
  const { user, password } = await createUserFixture({
    email: `admin${n}@example.com`,
    mobile: `90000000${String(n).padStart(2, '0')}`,
    roleId: role.id as string,
    accountType: 'admin',
    organizationId: organization.id as string,
  });
  const res = await request(app)
    .post(`${env.API_PREFIX}/auth/login`)
    .send({ email: user.email, password });
  return { token: res.body.data.accessToken as string, organization };
}

async function createActiveLoan(token: string, customerId: string) {
  const createRes = await request(app)
    .post(`${env.API_PREFIX}/loans`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      customer: customerId,
      principalAmount: 1000,
      interestRate: 10,
      totalInstallments: 5,
      emiType: 'monthly',
    });
  const loanId = createRes.body.data._id;

  await request(app)
    .post(`${env.API_PREFIX}/loans/${loanId}/approve`)
    .set('Authorization', `Bearer ${token}`);

  return loanId as string;
}

describe('Collections payment application', () => {
  it('applies a partial payment to the earliest installment', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });
    const loanId = await createActiveLoan(token, customer.id as string);

    const res = await request(app)
      .post(`${env.API_PREFIX}/collections`)
      .set('Authorization', `Bearer ${token}`)
      .send({ customer: customer.id, loan: loanId, amount: 100, paymentMode: 'cash' });

    expect(res.status).toBe(201);
    expect(res.body.data.receiptNumber).toMatch(/^RCPT-/);

    const scheduleRes = await request(app)
      .get(`${env.API_PREFIX}/loans/${loanId}/emi-schedule`)
      .set('Authorization', `Bearer ${token}`);
    expect(scheduleRes.body.data[0].status).toBe('partial');
    expect(scheduleRes.body.data[0].amountPaid).toBe(100);
  });

  it('closes the loan once the full outstanding balance is paid', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });
    const loanId = await createActiveLoan(token, customer.id as string);

    const res = await request(app)
      .post(`${env.API_PREFIX}/collections`)
      .set('Authorization', `Bearer ${token}`)
      .send({ customer: customer.id, loan: loanId, amount: 1100, paymentMode: 'upi' });

    expect(res.status).toBe(201);

    const loan = await Loan.findById(loanId);
    expect(loan?.status).toBe('closed');
  });

  it('rejects a payment that exceeds the outstanding balance', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });
    const loanId = await createActiveLoan(token, customer.id as string);

    const res = await request(app)
      .post(`${env.API_PREFIX}/collections`)
      .set('Authorization', `Bearer ${token}`)
      .send({ customer: customer.id, loan: loanId, amount: 5000, paymentMode: 'cash' });

    expect(res.status).toBe(400);
  });

  it('rejects collections against a non-active loan', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });

    const createRes = await request(app)
      .post(`${env.API_PREFIX}/loans`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: customer.id,
        principalAmount: 1000,
        interestRate: 10,
        totalInstallments: 5,
        emiType: 'monthly',
      });

    const res = await request(app)
      .post(`${env.API_PREFIX}/collections`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: customer.id,
        loan: createRes.body.data._id,
        amount: 100,
        paymentMode: 'cash',
      });
    expect(res.status).toBe(400);
  });

  it('lists pending collections sorted by due date', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({ organizationId: organization.id as string });
    const loanId = await createActiveLoan(token, customer.id as string);

    const res = await request(app)
      .get(`${env.API_PREFIX}/collections/pending`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0].loan.id).toBe(loanId);
  });
});

describe('Collections cross-organization isolation', () => {
  it('rejects creating a collection against another organization loan', async () => {
    const { token: otherToken, organization: otherOrg } = await createAdminToken();
    const otherCustomer = await createCustomerFixture({
      organizationId: otherOrg.id as string,
    });
    const otherLoanId = await createActiveLoan(otherToken, otherCustomer.id as string);

    const { token } = await createAdminToken();
    const res = await request(app)
      .post(`${env.API_PREFIX}/collections`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer: otherCustomer.id,
        loan: otherLoanId,
        amount: 100,
        paymentMode: 'cash',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied');
  });

  it('returns 403 when an admin reads another organization collection', async () => {
    const { token: otherToken, organization: otherOrg } = await createAdminToken();
    const otherCustomer = await createCustomerFixture({
      organizationId: otherOrg.id as string,
    });
    const otherLoanId = await createActiveLoan(otherToken, otherCustomer.id as string);
    const collectionRes = await request(app)
      .post(`${env.API_PREFIX}/collections`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ customer: otherCustomer.id, loan: otherLoanId, amount: 100, paymentMode: 'cash' });
    const otherCollectionId = collectionRes.body.data._id as string;

    const { token } = await createAdminToken();
    const res = await request(app)
      .get(`${env.API_PREFIX}/collections/${otherCollectionId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied');
  });

  it('excludes another organization collections from the list and pending view', async () => {
    const { token, organization } = await createAdminToken();
    const customer = await createCustomerFixture({
      mobile: '9123459003',
      organizationId: organization.id as string,
    });
    await createActiveLoan(token, customer.id as string);

    const { token: otherToken, organization: otherOrg } = await createAdminToken();
    const otherCustomer = await createCustomerFixture({
      mobile: '9123459004',
      organizationId: otherOrg.id as string,
    });
    const otherLoanId = await createActiveLoan(otherToken, otherCustomer.id as string);
    const otherCollectionRes = await request(app)
      .post(`${env.API_PREFIX}/collections`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ customer: otherCustomer.id, loan: otherLoanId, amount: 100, paymentMode: 'cash' });
    const otherCollectionId = otherCollectionRes.body.data._id as string;

    const listRes = await request(app)
      .get(`${env.API_PREFIX}/collections`)
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    const found = listRes.body.data.items.find(
      (item: { _id: string }) => item._id === otherCollectionId,
    );
    expect(found).toBeUndefined();

    const pendingRes = await request(app)
      .get(`${env.API_PREFIX}/collections/pending`)
      .set('Authorization', `Bearer ${token}`);
    expect(pendingRes.status).toBe(200);
    const otherLoanInPending = pendingRes.body.data.items.find(
      (item: { loan: { id: string } }) => item.loan.id === otherLoanId,
    );
    expect(otherLoanInPending).toBeUndefined();
  });
});
