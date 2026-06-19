import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

interface BackendErrorBody {
  message?: string;
  details?: { path: string; message: string }[] | string[];
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status !== 401) {
        const body = error.error as BackendErrorBody | undefined;
        const message = body?.message ?? 'Something went wrong. Please try again.';
        snackBar.open(message, 'Dismiss', { duration: 5000, panelClass: 'sc-snackbar-error' });
      }
      return throwError(() => error);
    }),
  );
};
