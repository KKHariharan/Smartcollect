import { connectDB, disconnectDB } from '../src/config/db';
import { logger } from '../src/config/logger';
import { Agent } from '../src/models/Agent';
import { Customer } from '../src/models/Customer';
import { User } from '../src/models/User';

async function reportOrphans(
  label: string,
  docs: { id: string; code: string; name: string; email?: string }[],
): Promise<boolean> {
  if (docs.length === 0) {
    logger.info(`No orphaned ${label} found`);
    return false;
  }

  logger.warn(`Found ${docs.length} ${label} with no linked login account:`);
  for (const doc of docs) {
    const email = doc.email?.trim();
    const collision = email ? await User.findOne({ email }) : null;
    const status = !email
      ? 'MISSING email — cannot create a login until one is added'
      : collision
        ? `email already in use by User ${collision.id as string} — cannot reuse it`
        : 'email is free — safe to recreate via the Agent/Customer create form';
    logger.warn(`  ${doc.code} (${doc.id}) "${doc.name}" <${email ?? 'none'}>: ${status}`);
  }
  return true;
}

async function run(): Promise<void> {
  await connectDB();

  const orphanedAgents = await Agent.find({ linkedUser: null });
  const orphanedCustomers = await Customer.find({ linkedUser: null });

  const hasOrphanedAgents = await reportOrphans(
    'agents',
    orphanedAgents.map((a) => ({
      id: a.id as string,
      code: a.agentCode,
      name: a.name,
      email: a.email,
    })),
  );
  const hasOrphanedCustomers = await reportOrphans(
    'customers',
    orphanedCustomers.map((c) => ({
      id: c.id as string,
      code: c.customerCode,
      name: c.name,
      email: c.email,
    })),
  );

  await disconnectDB();

  if (hasOrphanedAgents || hasOrphanedCustomers) {
    process.exit(1);
  }
}

run().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('find-orphaned-profiles failed', err);
  process.exit(1);
});
