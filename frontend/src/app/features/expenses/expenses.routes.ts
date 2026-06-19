import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PERMISSIONS } from '../../core/constants/permissions';

export const EXPENSES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.EXPENSES_READ] },
    loadComponent: () =>
      import('./expense-list/expense-list.component').then((m) => m.ExpenseListComponent),
  },
  {
    path: 'new',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.EXPENSES_CREATE] },
    loadComponent: () =>
      import('./expense-form/expense-form.component').then((m) => m.ExpenseFormComponent),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.EXPENSES_UPDATE] },
    loadComponent: () =>
      import('./expense-form/expense-form.component').then((m) => m.ExpenseFormComponent),
  },
];
