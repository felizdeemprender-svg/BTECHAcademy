/**
 * Comercio — Error con status/body HTTP legacy exactos (F0.2).
 * Los routes legacy devuelven 400/404/403/409/412/500 con bodies
 * propios (no el `{ data }` de `toApiResponse`); el use-case adjunta
 * `{ status, body }` en `details` y el handler los respeta 1:1.
 */
import { domainError, type DomainError } from '@/domain/shared/errors';

export function legacyHttpError(status: number, body: Record<string, unknown>): DomainError {
  const message = typeof body.error === 'string' && body.error.length > 0 ? body.error : 'Error';
  const code =
    status === 404 ? 'NOT_FOUND' as const
    : status === 403 ? 'FORBIDDEN' as const
    : status === 409 ? 'CONFLICT' as const
    : status >= 500 ? 'UNAVAILABLE' as const
    : 'VALIDATION' as const;
  return domainError(code, message, { status, body });
}
