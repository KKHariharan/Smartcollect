import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PERMISSIONS } from '../../core/constants/permissions';

export const COLLECTIONS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.COLLECTIONS_READ] },
    loadComponent: () =>
      import('./collection-list/collection-list.component').then((m) => m.CollectionListComponent),
  },
  {
    path: 'new',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.COLLECTIONS_CREATE] },
    loadComponent: () =>
      import('./collection-form/collection-form.component').then((m) => m.CollectionFormComponent),
  },
  {
    path: 'pending',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.COLLECTIONS_READ] },
    loadComponent: () =>
      import('./collection-pending/collection-pending.component').then(
        (m) => m.CollectionPendingComponent,
      ),
  },
];
