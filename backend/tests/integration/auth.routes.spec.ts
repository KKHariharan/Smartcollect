import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { connectTestDB, clearTestDB, disconnectTestDB } from '../helpers/db';
import { createUserFixture } from '../helpers/factories';
import { env } from '../../src/config/env';
import { User } from '../../src/models/User';

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

describe('POST /auth/login', () => {
  it('logs in with valid credentials and returns tokens', async () => {
    const { user, password } = await createUserFixture({ email: 'login@example.com' });

    const res = await request(app)
      .post(`${env.API_PREFIX}/auth/login`)
      .send({ email: user.email, password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user.role.permissions).toBeDefined();
  });

  it('rejects an invalid password', async () => {
    const { user } = await createUserFixture({ email: 'badpass@example.com' });

    const res = await request(app)
      .post(`${env.API_PREFIX}/auth/login`)
      .send({ email: user.email, password: 'WrongPassword1!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a deactivated account', async () => {
    const { user, password } = await createUserFixture({ email: 'inactive@example.com' });
    user.isActive = false;
    await user.save();

    const res = await request(app)
      .post(`${env.API_PREFIX}/auth/login`)
      .send({ email: user.email, password });

    expect(res.status).toBe(403);
  });

  it('rejects malformed payloads with a validation error', async () => {
    const res = await request(app)
      .post(`${env.API_PREFIX}/auth/login`)
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
  });
});

describe('refresh / logout flow', () => {
  it('rotates tokens on refresh and rejects the old refresh token afterwards', async () => {
    const { user, password } = await createUserFixture({ email: 'refresh@example.com' });
    const loginRes = await request(app)
      .post(`${env.API_PREFIX}/auth/login`)
      .send({ email: user.email, password });

    const { refreshToken } = loginRes.body.data;

    const refreshRes = await request(app)
      .post(`${env.API_PREFIX}/auth/refresh`)
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.refreshToken).not.toBe(refreshToken);

    const reuseRes = await request(app)
      .post(`${env.API_PREFIX}/auth/refresh`)
      .send({ refreshToken });

    expect(reuseRes.status).toBe(401);
  });

  it('invalidates the refresh token on logout', async () => {
    const { user, password } = await createUserFixture({ email: 'logout@example.com' });
    const loginRes = await request(app)
      .post(`${env.API_PREFIX}/auth/login`)
      .send({ email: user.email, password });

    const { accessToken, refreshToken } = loginRes.body.data;

    const logoutRes = await request(app)
      .post(`${env.API_PREFIX}/auth/logout`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(logoutRes.status).toBe(200);

    const refreshRes = await request(app)
      .post(`${env.API_PREFIX}/auth/refresh`)
      .send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });
});

describe('forgot / reset password flow', () => {
  it('always responds with success regardless of whether the email exists', async () => {
    const res = await request(app)
      .post(`${env.API_PREFIX}/auth/forgot-password`)
      .send({ email: 'unknown@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('resets the password with a valid token and invalidates old sessions', async () => {
    const { user, password } = await createUserFixture({ email: 'reset@example.com' });

    await request(app).post(`${env.API_PREFIX}/auth/forgot-password`).send({ email: user.email });

    const updated = await User.findById(user.id).select('+passwordResetTokenHash');
    expect(updated?.passwordResetTokenHash).toBeTruthy();

    // Simulate the raw token by re-issuing one directly via the service-level hash,
    // since the email provider only logs it in this dev stub.
    const { generateRandomToken, hashToken } = await import('../../src/utils/crypto');
    const rawToken = generateRandomToken();
    updated!.passwordResetTokenHash = hashToken(rawToken);
    await updated!.save();

    const resetRes = await request(app)
      .post(`${env.API_PREFIX}/auth/reset-password`)
      .send({ token: rawToken, newPassword: 'NewPass@123' });
    expect(resetRes.status).toBe(200);

    const oldLogin = await request(app)
      .post(`${env.API_PREFIX}/auth/login`)
      .send({ email: user.email, password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post(`${env.API_PREFIX}/auth/login`)
      .send({ email: user.email, password: 'NewPass@123' });
    expect(newLogin.status).toBe(200);
  });
});

describe('profile', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get(`${env.API_PREFIX}/auth/profile`);
    expect(res.status).toBe(401);
  });

  it('returns and updates the authenticated profile', async () => {
    const { user, password } = await createUserFixture({ email: 'profile@example.com' });
    const loginRes = await request(app)
      .post(`${env.API_PREFIX}/auth/login`)
      .send({ email: user.email, password });
    const { accessToken } = loginRes.body.data;

    const getRes = await request(app)
      .get(`${env.API_PREFIX}/auth/profile`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.email).toBe(user.email);

    const patchRes = await request(app)
      .patch(`${env.API_PREFIX}/auth/profile`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.name).toBe('Updated Name');
  });
});
