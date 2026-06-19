import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PERMISSIONS } from '../../core/constants/permissions';

export const ROLES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.ROLES_READ] },
    loadComponent: () => import('./role-list/role-list.component').then((m) => m.RoleListComponent),
  },
  {
    path: 'new',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.ROLES_CREATE] },
    loadComponent: () => import('./role-form/role-form.component').then((m) => m.RoleFormComponent),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.ROLES_UPDATE] },
    loadComponent: () => import('./role-form/role-form.component').then((m) => m.RoleFormComponent),
  },
];
