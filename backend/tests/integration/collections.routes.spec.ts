import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../helpers/db';
import { createCustomerFixture, createRoleFixture, createUserFixture } from '../helpers/factories';
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
    const token = await createAdminToken();
    const customer = await createCustomerFixture();
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
    const token = await createAdminToken();
    const customer = await createCustomerFixture();
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
    const token = await createAdminToken();
    const customer = await createCustomerFixture();
    const loanId = await createActiveLoan(token, customer.id as string);

    const res = await request(app)
      .post(`${env.API_PREFIX}/collections`)
      .set('Authorization', `Bearer ${token}`)
      .send({ customer: customer.id, loan: loanId, amount: 5000, paymentMode: 'cash' });

    expect(res.status).toBe(400);
  });

  it('rejects collections against a non-active loan', async () => {
    const token = await createAdminToken();
    const customer = await createCustomerFixture();

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
    const token = await createAdminToken();
    const customer = await createCustomerFixture();
    const loanId = await createActiveLoan(token, customer.id as string);

    const res = await request(app)
      .get(`${env.API_PREFIX}/collections/pending`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0].loan.id).toBe(loanId);
  });
});
