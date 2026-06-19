import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../src/utils/jwt';

const baseAccessPayload = {
  sub: 'user-1',
  roleId: 'role-1',
  roleName: 'Admin',
  permissions: ['*'],
  accountType: 'admin' as const,
  profileId: null,
};

describe('jwt utils', () => {
  it('signs and verifies an access token round-trip', () => {
    const token = signAccessToken(baseAccessPayload);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(baseAccessPayload.sub);
    expect(decoded.permissions).toEqual(baseAccessPayload.permissions);
  });

  it('signs and verifies a refresh token round-trip', () => {
    const payload = { sub: 'user-1', tokenVersion: 0, jti: 'random-id-1' };
    const token = signRefreshToken(payload);
    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.tokenVersion).toBe(0);
  });

  it('throws when verifying a tampered token', () => {
    const token = signAccessToken(baseAccessPayload);
    expect(() => verifyAccessToken(`${token}tampered`)).toThrow();
  });

  it('rejects an access token when verified as a refresh token', () => {
    const token = signAccessToken(baseAccessPayload);
    expect(() => verifyRefreshToken(token)).toThrow();
  });
});
