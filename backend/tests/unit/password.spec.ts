import { comparePassword, hashPassword } from '../../src/utils/password';

describe('password utils', () => {
  it('hashes a password to a value different from the original', async () => {
    const hash = await hashPassword('Sup3r$ecret');
    expect(hash).not.toEqual('Sup3r$ecret');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('Sup3r$ecret');
    await expect(comparePassword('Sup3r$ecret', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('Sup3r$ecret');
    await expect(comparePassword('WrongPassword', hash)).resolves.toBe(false);
  });
});
