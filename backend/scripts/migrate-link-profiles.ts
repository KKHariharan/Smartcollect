import { connectDB, disconnectDB } from '../src/config/db';
import { env } from '../src/config/env';
import { logger } from '../src/config/logger';
import { Agent } from '../src/models/Agent';
import { Customer } from '../src/models/Customer';
import { Organization } from '../src/models/Organization';
import { Role } from '../src/models/Role';
import { User } from '../src/models/User';
import { generateCode } from '../src/utils/sequence';
import { generateRandomToken } from '../src/utils/crypto';
import { hashPassword } from '../src/utils/password';

async function ensureDefaultOrganization() {
  let organization = await Organization.findOne({ name: 'Default Organization' });
  if (!organization) {
    const code = await generateCode('ORG', 'organization_seq');
    organization = await Organization.create({ name: 'Default Organization', code });
    logger.info(`Created Default Organization (${code})`);
  }
  return organization;
}

async function backfillOrganizationId(defaultOrgId: string): Promise<void> {
  const userResult = await User.updateMany(
    { organizationId: null, accountType: { $ne: 'super_admin' } },
    { $set: { organizationId: defaultOrgId } },
  );
  const agentResult = await Agent.updateMany(
    { organizationId: null },
    { $set: { organizationId: defaultOrgId } },
  );
  const customerResult = await Customer.updateMany(
    { organizationId: null },
    { $set: { organizationId: defaultOrgId } },
  );
  logger.info(
    `Backfilled organizationId on ${userResult.modifiedCount} users, ` +
      `${agentResult.modifiedCount} agents, ${customerResult.modifiedCount} customers`,
  );
}

async function ensureSuperAdminBootstrapped(): Promise<void> {
  const existing = await User.findOne({ accountType: 'super_admin' });
  if (existing) {
    logger.info(`Super Admin already present: ${existing.email}`);
    return;
  }

  const superAdminRole = await Role.findOne({ name: 'Super Admin' });
  if (!superAdminRole) {
    logger.warn(
      'No "Super Admin" role found — run `npm run seed` first, then re-run this migration ' +
        'to bootstrap a platform Super Admin account.',
    );
    return;
  }

  const candidate = await User.findOne({ email: env.SEED_ADMIN_EMAIL });
  if (!candidate) {
    logger.warn(
      `No user found for SEED_ADMIN_EMAIL (${env.SEED_ADMIN_EMAIL}) to promote to Super Admin. ` +
        'Run `npm run seed` first, then re-run this migration.',
    );
    return;
  }

  candidate.accountType = 'super_admin';
  candidate.organizationId = null;
  candidate.role = superAdminRole._id;
  await candidate.save();
  logger.warn(`Promoted ${candidate.email} to Super Admin (platform bootstrap account)`);
}

/**
 * Orphaned Agent/Customer docs whose email matches an existing same-tier User that has no
 * profile yet are the same real person split across two old, disconnected create flows —
 * link them directly instead of minting a redundant second login.
 */
async function linkOrphanedAgents(defaultOrgId: string): Promise<void> {
  const orphans = await Agent.find({ linkedUser: null });
  if (orphans.length === 0) {
    logger.info('No orphaned agents found');
    return;
  }

  const agentRole = await Role.findOne({ name: 'Collection Agent' });
  if (!agentRole) {
    logger.warn('No "Collection Agent" role found — skipping orphaned agent linking');
    return;
  }

  for (const agent of orphans) {
    const email = agent.email?.trim();
    if (!email) {
      logger.warn(`Agent ${agent.agentCode} (${agent.id}) has no email — cannot create a login`);
      continue;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.accountType !== 'agent') {
        logger.warn(
          `Agent ${agent.agentCode} (${agent.id}) email ${email} belongs to a ` +
            `${existingUser.accountType} User ${existingUser.id as string} — cannot relink, fix manually`,
        );
        continue;
      }
      const alreadyLinkedElsewhere = await Agent.findOne({ linkedUser: existingUser._id });
      if (alreadyLinkedElsewhere) {
        logger.warn(
          `Agent ${agent.agentCode} (${agent.id}) email ${email} matches User ${existingUser.id as string}, ` +
            `but that user is already linked to Agent ${alreadyLinkedElsewhere.agentCode} — fix manually`,
        );
        continue;
      }

      agent.linkedUser = existingUser._id;
      if (!agent.organizationId) agent.organizationId = existingUser.organizationId ?? defaultOrgId;
      await agent.save();
      logger.warn(
        `Linked Agent ${agent.agentCode} (${agent.id}) to its existing matching User ${email} ` +
          `(no new login created)`,
      );
      continue;
    }

    const tempPassword = `Tmp!${generateRandomToken(6)}A1`;
    const passwordHash = await hashPassword(tempPassword);
    const user = await User.create({
      name: agent.name,
      email,
      mobile: agent.mobile,
      passwordHash,
      role: agentRole._id,
      accountType: 'agent',
      organizationId: agent.organizationId ?? defaultOrgId,
    });

    agent.linkedUser = user._id;
    if (!agent.organizationId) agent.organizationId = user.organizationId;
    await agent.save();

    logger.warn(
      `Linked Agent ${agent.agentCode} (${agent.id}) to new User ${email} — ` +
        `ONE-TIME temp password: ${tempPassword} (have them reset it immediately)`,
    );
  }
}

async function linkOrphanedCustomers(defaultOrgId: string): Promise<void> {
  const orphans = await Customer.find({ linkedUser: null });
  if (orphans.length === 0) {
    logger.info('No orphaned customers found');
    return;
  }

  const customerRole = await Role.findOne({ name: 'Customer' });
  if (!customerRole) {
    logger.warn('No "Customer" role found — skipping orphaned customer linking');
    return;
  }

  for (const customer of orphans) {
    const email = customer.email?.trim();
    if (!email) {
      logger.warn(
        `Customer ${customer.customerCode} (${customer.id}) has no email — cannot create a login`,
      );
      continue;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.accountType !== 'customer') {
        logger.warn(
          `Customer ${customer.customerCode} (${customer.id}) email ${email} belongs to a ` +
            `${existingUser.accountType} User ${existingUser.id as string} — cannot relink, fix manually`,
        );
        continue;
      }
      const alreadyLinkedElsewhere = await Customer.findOne({ linkedUser: existingUser._id });
      if (alreadyLinkedElsewhere) {
        logger.warn(
          `Customer ${customer.customerCode} (${customer.id}) email ${email} matches User ` +
            `${existingUser.id as string}, but that user is already linked to Customer ` +
            `${alreadyLinkedElsewhere.customerCode} — fix manually`,
        );
        continue;
      }

      customer.linkedUser = existingUser._id;
      if (!customer.organizationId) {
        customer.organizationId = existingUser.organizationId ?? defaultOrgId;
      }
      await customer.save();
      logger.warn(
        `Linked Customer ${customer.customerCode} (${customer.id}) to its existing matching ` +
          `User ${email} (no new login created)`,
      );
      continue;
    }

    const tempPassword = `Tmp!${generateRandomToken(6)}A1`;
    const passwordHash = await hashPassword(tempPassword);
    const user = await User.create({
      name: customer.name,
      email,
      mobile: customer.mobile,
      passwordHash,
      role: customerRole._id,
      accountType: 'customer',
      organizationId: customer.organizationId ?? defaultOrgId,
    });

    customer.linkedUser = user._id;
    if (!customer.organizationId) customer.organizationId = user.organizationId;
    await customer.save();

    logger.warn(
      `Linked Customer ${customer.customerCode} (${customer.id}) to new User ${email} — ` +
        `ONE-TIME temp password: ${tempPassword} (have them reset it immediately)`,
    );
  }
}

/** Agent/customer-tier Users that never got a profile at all (created via the old, disconnected
 *  Users-only flow) — provision the missing minimal profile now, linked back to them. */
async function fillMissingAgentProfiles(defaultOrgId: string): Promise<void> {
  const agentUsers = await User.find({ accountType: 'agent' });
  for (const user of agentUsers) {
    const existing = await Agent.findOne({ linkedUser: user._id });
    if (existing) continue;

    const agentCode = await generateCode('AGT', 'agent_seq');
    await Agent.create({
      agentCode,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      linkedUser: user._id,
      organizationId: user.organizationId ?? defaultOrgId,
    });
    logger.warn(`Created missing Agent profile ${agentCode} for User ${user.email}`);
  }
}

async function fillMissingCustomerProfiles(defaultOrgId: string): Promise<void> {
  const customerUsers = await User.find({ accountType: 'customer' });
  for (const user of customerUsers) {
    const existing = await Customer.findOne({ linkedUser: user._id });
    if (existing) continue;

    const customerCode = await generateCode('CUST', 'customer_seq');
    await Customer.create({
      customerCode,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      linkedUser: user._id,
      organizationId: user.organizationId ?? defaultOrgId,
    });
    logger.warn(`Created missing Customer profile ${customerCode} for User ${user.email}`);
  }
}

async function run(): Promise<void> {
  await connectDB();

  const defaultOrg = await ensureDefaultOrganization();
  await backfillOrganizationId(defaultOrg.id as string);
  await ensureSuperAdminBootstrapped();
  await linkOrphanedAgents(defaultOrg.id as string);
  await linkOrphanedCustomers(defaultOrg.id as string);
  await fillMissingAgentProfiles(defaultOrg.id as string);
  await fillMissingCustomerProfiles(defaultOrg.id as string);

  await disconnectDB();
  logger.info('migrate-link-profiles complete');
}

run().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('migrate-link-profiles failed', err);
  process.exit(1);
});
