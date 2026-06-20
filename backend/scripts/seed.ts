import { connectDB, disconnectDB } from '../src/config/db';
import { env } from '../src/config/env';
import { logger } from '../src/config/logger';
import { Role } from '../src/models/Role';
import { User } from '../src/models/User';
import { Organization } from '../src/models/Organization';
import { PERMISSIONS } from '../src/constants/permissions';
import { hashPassword } from '../src/utils/password';
import { generateCode } from '../src/utils/sequence';

async function ensureRole(
  name: string,
  description: string,
  permissions: string[],
  isSystem: boolean,
) {
  let role = await Role.findOne({ name });
  if (!role) {
    role = await Role.create({ name, description, permissions, isSystem });
    logger.info(`Created system role: ${name}`);
  }
  return role;
}

async function ensureOrganization(name: string) {
  let organization = await Organization.findOne({ name });
  if (!organization) {
    const code = await generateCode('ORG', 'organization_seq');
    organization = await Organization.create({ name, code, status: 'active' });
    logger.info(`Created organization: ${name} (${code})`);
  }
  return organization;
}

async function seed(): Promise<void> {
  await connectDB();

  await ensureOrganization('Default Organization');

  const superAdminRole = await ensureRole(
    'Super Admin',
    'Platform owner: manages organizations across the whole system',
    [PERMISSIONS.WILDCARD],
    true,
  );
  await ensureRole('Admin', 'Full system access', [PERMISSIONS.WILDCARD], true);

  await ensureRole(
    'Collection Agent',
    'Field collection agent: assigned customers, collections, receipts',
    [
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_NOTES,
      PERMISSIONS.LOANS_READ,
      PERMISSIONS.COLLECTIONS_READ,
      PERMISSIONS.COLLECTIONS_CREATE,
      PERMISSIONS.SUPPORT_READ,
    ],
    true,
  );

  await ensureRole(
    'Customer',
    'Customer self-service portal access',
    [
      PERMISSIONS.LOANS_READ,
      PERMISSIONS.COLLECTIONS_READ,
      PERMISSIONS.SUPPORT_READ,
      PERMISSIONS.SUPPORT_CREATE,
    ],
    true,
  );

  const existingAdmin = await User.findOne({ email: env.SEED_ADMIN_EMAIL });
  if (existingAdmin) {
    logger.info(`Admin user already exists: ${env.SEED_ADMIN_EMAIL}`);
  } else {
    const passwordHash = await hashPassword(env.SEED_ADMIN_PASSWORD);
    await User.create({
      name: env.SEED_ADMIN_NAME,
      email: env.SEED_ADMIN_EMAIL,
      mobile: env.SEED_ADMIN_MOBILE,
      passwordHash,
      role: superAdminRole.id as string,
      accountType: 'super_admin',
      organizationId: null,
    });
    logger.info(`Created Super Admin user: ${env.SEED_ADMIN_EMAIL}`);
  }

  await disconnectDB();
  logger.info('Seed complete');
}

seed().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed', err);
  process.exit(1);
});
