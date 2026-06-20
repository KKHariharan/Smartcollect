import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent,
          ),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile-view/profile-view.component').then(
            (m) => m.ProfileViewComponent,
          ),
      },
      {
        path: 'profile/change-password',
        loadComponent: () =>
          import('./features/profile/change-password/change-password.component').then(
            (m) => m.ChangePasswordComponent,
          ),
      },
      {
        path: 'customers',
        loadChildren: () =>
          import('./features/customers/customers.routes').then((m) => m.CUSTOMERS_ROUTES),
      },
      {
        path: 'agents',
        loadChildren: () => import('./features/agents/agents.routes').then((m) => m.AGENTS_ROUTES),
      },
      {
        path: 'loans',
        loadChildren: () => import('./features/loans/loans.routes').then((m) => m.LOANS_ROUTES),
      },
      {
        path: 'collections',
        loadChildren: () =>
          import('./features/collections/collections.routes').then((m) => m.COLLECTIONS_ROUTES),
      },
      {
        path: 'expenses',
        loadChildren: () =>
          import('./features/expenses/expenses.routes').then((m) => m.EXPENSES_ROUTES),
      },
      {
        path: 'support',
        loadChildren: () =>
          import('./features/support/support.routes').then((m) => m.SUPPORT_ROUTES),
      },
      {
        path: 'users',
        loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
      },
      {
        path: 'roles',
        loadChildren: () => import('./features/roles/roles.routes').then((m) => m.ROLES_ROUTES),
      },
      {
        path: 'organizations',
        loadChildren: () =>
          import('./features/organizations/organizations.routes').then(
            (m) => m.ORGANIZATIONS_ROUTES,
          ),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      {
        path: 'forbidden',
        loadComponent: () =>
          import('./shared/pages/forbidden/forbidden.component').then((m) => m.ForbiddenComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: '**',
        loadComponent: () =>
          import('./shared/pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'auth/login' },
];
