import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PERMISSIONS } from '../../core/constants/permissions';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.USERS_READ] },
    loadComponent: () => import('./user-list/user-list.component').then((m) => m.UserListComponent),
  },
  {
    path: 'new',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.USERS_CREATE] },
    loadComponent: () => import('./user-form/user-form.component').then((m) => m.UserFormComponent),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.USERS_UPDATE] },
    loadComponent: () => import('./user-form/user-form.component').then((m) => m.UserFormComponent),
  },
];
