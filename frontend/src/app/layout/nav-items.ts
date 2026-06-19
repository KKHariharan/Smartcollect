import { PERMISSIONS } from '../core/constants/permissions';

export interface NavItem {
  label: string;
  icon: string;
  path: string;
  permissions?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
  {
    label: 'Customers',
    icon: 'groups',
    path: '/customers',
    permissions: [PERMISSIONS.CUSTOMERS_READ],
  },
  { label: 'Agents', icon: 'badge', path: '/agents', permissions: [PERMISSIONS.AGENTS_READ] },
  {
    label: 'Loans',
    icon: 'account_balance',
    path: '/loans',
    permissions: [PERMISSIONS.LOANS_READ],
  },
  {
    label: 'Collections',
    icon: 'payments',
    path: '/collections',
    permissions: [PERMISSIONS.COLLECTIONS_READ],
  },
  {
    label: 'Expenses',
    icon: 'receipt_long',
    path: '/expenses',
    permissions: [PERMISSIONS.EXPENSES_READ],
  },
  {
    label: 'Support Tickets',
    icon: 'support_agent',
    path: '/support',
    permissions: [PERMISSIONS.SUPPORT_READ],
  },
  {
    label: 'Users',
    icon: 'manage_accounts',
    path: '/users',
    permissions: [PERMISSIONS.USERS_READ],
  },
  {
    label: 'Roles & Permissions',
    icon: 'admin_panel_settings',
    path: '/roles',
    permissions: [PERMISSIONS.ROLES_READ],
  },
  {
    label: 'Settings',
    icon: 'settings',
    path: '/settings',
    permissions: [PERMISSIONS.SETTINGS_READ],
  },
];
