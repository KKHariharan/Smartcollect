export type AccountType = 'admin' | 'agent' | 'customer';

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
  isActive: boolean;
  role: UserRoleSummary;
  lastLoginAt: string | null;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  accountType: AccountType;
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
  role: string;
  accountType: AccountType;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  accountType?: AccountType;
  isActive?: boolean;
}
