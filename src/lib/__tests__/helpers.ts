import { vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Crea un mock de Request para testing de route handlers de Next.js App Router
 */
export function createMockRequest(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  searchParams?: Record<string, string>;
} = {}) {
  const { method = 'GET', headers = {}, body, searchParams } = options;

  const url = new URL('http://localhost:9002/api/test');
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const init: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  // Se castea as unknown as NextRequest para silenciar el error de TypeScript
  // sin afectar el runtime en los tests que usan la API estándar de Request.
  return new Request(url.toString(), init) as unknown as NextRequest;
}
