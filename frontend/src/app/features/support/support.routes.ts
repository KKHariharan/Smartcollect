import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PERMISSIONS } from '../../core/constants/permissions';

export const SUPPORT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.SUPPORT_READ] },
    loadComponent: () =>
      import('./support-list/support-list.component').then((m) => m.SupportListComponent),
  },
  {
    path: 'new',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.SUPPORT_CREATE] },
    loadComponent: () =>
      import('./support-form/support-form.component').then((m) => m.SupportFormComponent),
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.SUPPORT_READ] },
    loadComponent: () =>
      import('./support-detail/support-detail.component').then((m) => m.SupportDetailComponent),
  },
];
