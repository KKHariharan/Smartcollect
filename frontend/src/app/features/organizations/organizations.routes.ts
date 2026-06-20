import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PERMISSIONS } from '../../core/constants/permissions';

export const ORGANIZATIONS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.ORGANIZATIONS_READ] },
    loadComponent: () =>
      import('./organization-list/organization-list.component').then(
        (m) => m.OrganizationListComponent,
      ),
  },
  {
    path: 'new',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.ORGANIZATIONS_CREATE] },
    loadComponent: () =>
      import('./organization-form/organization-form.component').then(
        (m) => m.OrganizationFormComponent,
      ),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.ORGANIZATIONS_UPDATE] },
    loadComponent: () =>
      import('./organization-form/organization-form.component').then(
        (m) => m.OrganizationFormComponent,
      ),
  },
];
