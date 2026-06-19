import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PERMISSIONS } from '../../core/constants/permissions';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permissions: [PERMISSIONS.SETTINGS_READ] },
    loadComponent: () =>
      import('./settings-form/settings-form.component').then((m) => m.SettingsFormComponent),
  },
];
