import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Mirrors the backend's strongPasswordSchema (min 8 chars, upper/lower/number/special).
 */
export const strongPasswordValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = control.value as string | null;
  if (!value) return null;

  const errors: ValidationErrors = {};
  if (value.length < 8) errors['minlength'] = true;
  if (!/[a-z]/.test(value)) errors['lowercase'] = true;
  if (!/[A-Z]/.test(value)) errors['uppercase'] = true;
  if (!/[0-9]/.test(value)) errors['number'] = true;
  if (!/[^a-zA-Z0-9]/.test(value)) errors['special'] = true;

  return Object.keys(errors).length > 0 ? errors : null;
};
