import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Reads required permissions from route `data.permissions` (string[]).
 * A route with no `permissions` data passes through (use authGuard alone
 * for routes that just require being logged in).
 */
export const permissionGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const required = (route.data['permissions'] as string[] | undefined) ?? [];
  if (required.length === 0 || authService.hasPermission(...required)) {
    return true;
  }
  return router.createUrlTree(['/forbidden']);
};
