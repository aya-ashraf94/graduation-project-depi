import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^01[0-2,5]{1}[0-9]{8}$/,
  url: /^https?:\/\/.+/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>?/[\]{}|~`]).{8,}$/,
  egyptianPhone: /^01[0-2,5]{1}[0-9]{8}$/,
} as const;

const ERROR_MESSAGES: Record<string, (err?: any) => string> = {
  required: () => 'This field is required.',
  email: () => 'Please enter a valid email address.',
  minlength: (e) => `Must be at least ${e.requiredLength} characters.`,
  maxlength: (e) => `Cannot be more than ${e.requiredLength} characters.`,
  min: (e) => `Must be at least ${e.min}.`,
  max: (e) => `Must be at most ${e.max}.`,
  pattern: () => 'Invalid format.',
  passwordStrength: () => 'Must be 8+ chars with uppercase, lowercase, number & special character.',
  phoneFormat: () => 'Enter a valid phone number (e.g. 01xxxxxxxxx).',
  urlFormat: () => 'Enter a valid URL (https://...).',
  positiveNumber: () => 'Must be greater than 0.',
  percentageRange: () => 'Must be between 0 and 100.',
  matchField: () => 'Values do not match.',
  greaterThan: (e) => `Must be greater than ${e.field}.`,
};

export function getFieldError(control: AbstractControl | null): string | null {
  if (!control || !control.errors || !(control.touched || control.dirty)) return null;
  const key = Object.keys(control.errors)[0];
  const fn = ERROR_MESSAGES[key];
  return fn ? fn(control.errors[key]) : 'Invalid value.';
}

export function getFieldErrors(control: AbstractControl | null): string[] {
  if (!control || !control.errors || !(control.touched || control.dirty)) return [];
  return Object.keys(control.errors).map(key => {
    const fn = ERROR_MESSAGES[key];
    return fn ? fn(control.errors![key]) : 'Invalid value.';
  });
}

export function passwordStrength(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return REGEX.password.test(control.value) ? null : { passwordStrength: true };
  };
}

export function phoneFormat(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return REGEX.phone.test(control.value) ? null : { phoneFormat: true };
  };
}

export function urlFormat(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return REGEX.url.test(control.value) ? null : { urlFormat: true };
  };
}

export function positiveNumber(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value == null || control.value === '') return null;
    return Number(control.value) > 0 ? null : { positiveNumber: true };
  };
}

export function percentageRange(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value == null || control.value === '') return null;
    const v = Number(control.value);
    return v >= 0 && v <= 100 ? null : { percentageRange: true };
  };
}

export function matchField(field: string, getField: () => AbstractControl | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value || !getField()?.value) return null;
    return control.value === getField()?.value ? null : { matchField: true };
  };
}

export function greaterThan(field: string, getField: () => AbstractControl | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value == null || control.value === '' || !getField()?.value) return null;
    return Number(control.value) > Number(getField()?.value) ? null : { greaterThan: { field } };
  };
}
