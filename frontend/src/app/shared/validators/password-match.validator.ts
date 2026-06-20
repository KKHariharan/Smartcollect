import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value as string | null;
  const confirmPassword = control.get('confirmPassword')?.value as string | null;
  if (!password || !confirmPassword) return null;

  return password === confirmPassword ? null : { passwordMismatch: true };
};
