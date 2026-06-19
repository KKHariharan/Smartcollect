import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PERMISSIONS } from '../../core/constants/permissions';

export const AGENTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.AGENTS_READ] },
    loadComponent: () =>
      import('./agent-list/agent-list.component').then((m) => m.AgentListComponent),
  },
  {
    path: 'new',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.AGENTS_CREATE] },
    loadComponent: () =>
      import('./agent-form/agent-form.component').then((m) => m.AgentFormComponent),
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.AGENTS_READ] },
    loadComponent: () =>
      import('./agent-detail/agent-detail.component').then((m) => m.AgentDetailComponent),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.AGENTS_UPDATE] },
    loadComponent: () =>
      import('./agent-form/agent-form.component').then((m) => m.AgentFormComponent),
  },
];
