import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PERMISSIONS } from '../../core/constants/permissions';

export const LOANS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.LOANS_READ] },
    loadComponent: () => import('./loan-list/loan-list.component').then((m) => m.LoanListComponent),
  },
  {
    path: 'new',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.LOANS_CREATE] },
    loadComponent: () => import('./loan-form/loan-form.component').then((m) => m.LoanFormComponent),
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.LOANS_READ] },
    loadComponent: () =>
      import('./loan-detail/loan-detail.component').then((m) => m.LoanDetailComponent),
  },
];
