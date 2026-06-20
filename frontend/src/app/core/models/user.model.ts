export type AccountType = 'super_admin' | 'admin' | 'agent' | 'customer';

export interface UserRoleSummary {
  id: string;
  name: string;
  permissions: string[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  accountType: AccountType;
  organizationId: string | null;
  organization: { name: string; code: string } | null;
  isActive: boolean;
  role: UserRoleSummary;
  lastLoginAt: string | null;
}

export interface UserCreatedBySummary {
  _id: string;
  name: string;
  role: { name: string } | string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  accountType: AccountType;
  organizationId: { _id: string; name: string; code: string } | string | null;
  createdBy?: UserCreatedBySummary | string | null;
  isActive: boolean;
  role: { _id: string; name: string; permissions: string[] } | string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  accountType: AccountType;
  role?: string;
  organizationId?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  isActive?: boolean;
}
