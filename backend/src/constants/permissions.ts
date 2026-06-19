export const PERMISSIONS = {
  WILDCARD: '*',

  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',

  AUDIT_READ: 'audit:read',

  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_DELETE: 'customers:delete',
  CUSTOMERS_NOTES: 'customers:notes',

  AGENTS_READ: 'agents:read',
  AGENTS_CREATE: 'agents:create',
  AGENTS_UPDATE: 'agents:update',
  AGENTS_DELETE: 'agents:delete',

  LOANS_READ: 'loans:read',
  LOANS_CREATE: 'loans:create',
  LOANS_UPDATE: 'loans:update',
  LOANS_APPROVE: 'loans:approve',

  COLLECTIONS_READ: 'collections:read',
  COLLECTIONS_CREATE: 'collections:create',

  EXPENSES_READ: 'expenses:read',
  EXPENSES_CREATE: 'expenses:create',
  EXPENSES_UPDATE: 'expenses:update',
  EXPENSES_DELETE: 'expenses:delete',

  SUPPORT_READ: 'support:read',
  SUPPORT_CREATE: 'support:create',
  SUPPORT_UPDATE: 'support:update',

  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',

  REPORTS_READ: 'reports:read',
  DASHBOARD_READ: 'dashboard:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS).filter(
  (permission) => permission !== PERMISSIONS.WILDCARD,
);
