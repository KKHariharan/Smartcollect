import { Role } from '../../src/models/Role';
import { User, type AccountType } from '../../src/models/User';
import { Organization, type OrganizationStatus } from '../../src/models/Organization';
import { Customer } from '../../src/models/Customer';
import { Agent } from '../../src/models/Agent';
import { Loan, type EmiType, type LoanStatus } from '../../src/models/Loan';
import { PERMISSIONS } from '../../src/constants/permissions';
import { hashPassword } from '../../src/utils/password';
import { generateCode } from '../../src/utils/sequence';

export async function createRoleFixture(
  overrides: Partial<{ name: string; permissions: string[]; isSystem: boolean }> = {},
) {
  return Role.create({
    name: overrides.name ?? 'Admin',
    permissions: overrides.permissions ?? [PERMISSIONS.WILDCARD],
    isSystem: overrides.isSystem ?? false,
  });
}

export async function createOrganizationFixture(
  overrides: Partial<{ name: string; status: OrganizationStatus }> = {},
) {
  const code = await generateCode('ORG', 'organization_seq');
  return Organization.create({
    name: overrides.name ?? `Test Organization ${code}`,
    code,
    status: overrides.status ?? 'active',
  });
}

export async function createUserFixture(
  overrides: Partial<{
    name: string;
    email: string;
    mobile: string;
    password: string;
    roleId: string;
    accountType: AccountType;
    organizationId: string | null;
  }> = {},
) {
  const role = overrides.roleId ? null : await createRoleFixture();
  const passwordHash = await hashPassword(overrides.password ?? 'Password@123');
  const accountType = overrides.accountType ?? 'admin';
  const organizationId =
    overrides.organizationId !== undefined
      ? overrides.organizationId
      : accountType === 'super_admin'
        ? null
        : ((await createOrganizationFixture()).id as string);

  const user = await User.create({
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? 'test.user@example.com',
    mobile: overrides.mobile ?? '9876543210',
    passwordHash,
    role: overrides.roleId ?? (role?.id as string | undefined),
    accountType,
    organizationId,
  });

  return { user, password: overrides.password ?? 'Password@123' };
}

export async function createCustomerFixture(
  overrides: Partial<{
    name: string;
    mobile: string;
    email: string;
    assignedAgent: string;
    linkedUser: string;
    createdBy: string;
    organizationId: string;
  }> = {},
) {
  const customerCode = await generateCode('CUST', 'customer_seq');
  const organizationId =
    overrides.organizationId ?? ((await createOrganizationFixture()).id as string);
  return Customer.create({
    customerCode,
    name: overrides.name ?? 'Test Customer',
    mobile: overrides.mobile ?? '9000000001',
    email: overrides.email ?? 'test.customer@example.com',
    assignedAgent: overrides.assignedAgent ?? null,
    linkedUser: overrides.linkedUser ?? null,
    createdBy: overrides.createdBy,
    organizationId,
  });
}

export async function createAgentFixture(
  overrides: Partial<{
    name: string;
    mobile: string;
    email: string;
    linkedUser: string;
    createdBy: string;
    organizationId: string;
  }> = {},
) {
  const agentCode = await generateCode('AGT', 'agent_seq');
  const organizationId =
    overrides.organizationId ?? ((await createOrganizationFixture()).id as string);
  return Agent.create({
    agentCode,
    name: overrides.name ?? 'Test Agent',
    mobile: overrides.mobile ?? '9100000001',
    email: overrides.email ?? 'test.agent@example.com',
    linkedUser: overrides.linkedUser ?? null,
    createdBy: overrides.createdBy,
    organizationId,
  });
}

export async function createLoanFixture(
  overrides: Partial<{
    customer: string;
    principalAmount: number;
    interestRate: number;
    totalInstallments: number;
    emiType: EmiType;
    status: LoanStatus;
    createdBy: string;
  }> = {},
) {
  const loanNumber = await generateCode('LN', 'loan_seq');
  return Loan.create({
    loanNumber,
    customer: overrides.customer,
    principalAmount: overrides.principalAmount ?? 10000,
    interestRate: overrides.interestRate ?? 12,
    totalInstallments: overrides.totalInstallments ?? 10,
    emiType: overrides.emiType ?? 'monthly',
    status: overrides.status ?? 'pending',
    createdBy: overrides.createdBy,
  });
}
