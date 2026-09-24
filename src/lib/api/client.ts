/**
 * API — Cliente HTTP mínimo (fetch + Bearer token).
 * Puro salvo `fetch`: testeable con fetch mockeado.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
  }
  const body = (await res.json()) as { data: T };
  return body.data;
}

export type ApiSendMethod = 'PATCH' | 'POST' | 'PUT' | 'DELETE';

export async function apiSend<T>(
  method: ApiSendMethod,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, errBody?.error ?? `HTTP ${res.status}`);
  }
  const resBody = (await res.json().catch(() => null)) as { data?: T } | null;
  return resBody?.data as T;
}
