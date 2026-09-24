/**
 * API — Mapeo de `Result` del dominio a respuesta HTTP.
 * VALIDATION → 400, NOT_FOUND → 404, resto → 500, ok → 200 { data }.
 */
import { NextResponse } from 'next/server';

import { isOk, type Result } from '@/domain/shared/result';
import type { DomainError } from '@/domain/shared/errors';

export function toApiResponse<T>(result: Result<T, DomainError>): NextResponse {
  if (isOk(result)) {
    return NextResponse.json({ data: result.value });
  }
  const status = result.error.code === 'VALIDATION' ? 400 : result.error.code === 'NOT_FOUND' ? 404 : 500;
  return NextResponse.json({ error: result.error.message }, { status });
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
}
