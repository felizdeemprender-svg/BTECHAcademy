/**
 * Paso 0 — Errores de dominio tipados.
 * Dominio puro: sin dependencias de framework ni de Firebase.
 */

export const DOMAIN_ERROR_CODES = [
  'NOT_FOUND',
  'VALIDATION',
  'FORBIDDEN',
  'CONFLICT',
  'UNAVAILABLE',
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

export interface DomainError {
  readonly code: DomainErrorCode;
  readonly message: string;
  readonly details?: unknown;
}

export function domainError(
  code: DomainErrorCode,
  message: string,
  details?: unknown,
): DomainError {
  return details === undefined ? { code, message } : { code, message, details };
}

export function notFound(message: string, details?: unknown): DomainError {
  return domainError('NOT_FOUND', message, details);
}

export function validationError(message: string, details?: unknown): DomainError {
  return domainError('VALIDATION', message, details);
}

export function forbidden(message: string, details?: unknown): DomainError {
  return domainError('FORBIDDEN', message, details);
}

export function conflict(message: string, details?: unknown): DomainError {
  return domainError('CONFLICT', message, details);
}

export function unavailable(message: string, details?: unknown): DomainError {
  return domainError('UNAVAILABLE', message, details);
}
