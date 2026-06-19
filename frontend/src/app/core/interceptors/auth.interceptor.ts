import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const isAuthEndpoint = /\/auth\/(login|refresh|forgot-password|reset-password)$/.test(req.url);
  const token = authService.accessToken;
  const authedReq =
    token && !isAuthEndpoint
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isAuthEndpoint &&
        authService.refreshToken
      ) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshedToken$.next(null);
          authService.refresh().subscribe({
            next: (res) => {
              isRefreshing = false;
              refreshedToken$.next(res.data.accessToken);
            },
            error: () => {
              isRefreshing = false;
              refreshedToken$.next(null);
              authService.clearSession();
              window.location.href = '/auth/login';
            },
          });
        }

        return refreshedToken$.pipe(
          filter((newToken) => newToken !== null || !isRefreshing),
          take(1),
          switchMap((newToken) => {
            if (!newToken) {
              return throwError(() => error);
            }
            const retried = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
            return next(retried);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
