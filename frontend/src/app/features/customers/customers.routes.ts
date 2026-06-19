import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PERMISSIONS } from '../../core/constants/permissions';

export const CUSTOMERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.CUSTOMERS_READ] },
    loadComponent: () =>
      import('./customer-list/customer-list.component').then((m) => m.CustomerListComponent),
  },
  {
    path: 'new',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.CUSTOMERS_CREATE] },
    loadComponent: () =>
      import('./customer-form/customer-form.component').then((m) => m.CustomerFormComponent),
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.CUSTOMERS_READ] },
    loadComponent: () =>
      import('./customer-detail/customer-detail.component').then((m) => m.CustomerDetailComponent),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.CUSTOMERS_UPDATE] },
    loadComponent: () =>
      import('./customer-form/customer-form.component').then((m) => m.CustomerFormComponent),
  },
];
