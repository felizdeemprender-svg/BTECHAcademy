import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

describe('API Route /api/video/worker - Autenticación M2M y Entorno', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('devuelve 500 (Server misconfigured) si NODE_ENV es production y falta WORKER_SECRET', async () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.WORKER_SECRET;

    const { POST } = await import('../route');
    const req = new NextRequest('https://fastoria.com.ar/api/video/worker', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer any-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'render-v2', jobId: 'j-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Server misconfigured');
  });

  it('devuelve 401 si falta el encabezado Authorization o no coincide con WORKER_SECRET', async () => {
    process.env.WORKER_SECRET = 'test-secret-key-123';

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/video/worker', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer clave-incorrecta',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'render-v2', jobId: 'j-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('devuelve 400 si el JSON del cuerpo está mal formado', async () => {
    process.env.WORKER_SECRET = 'test-secret-key-123';

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/video/worker', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-secret-key-123',
        'Content-Type': 'application/json',
      },
      body: '{ invalid-json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('JSON mal formado en la peticion');
  });

  it('devuelve 400 si el payload no cumple con workerPayloadSchema (ej. falta action)', async () => {
    process.env.WORKER_SECRET = 'test-secret-key-123';

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/video/worker', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-secret-key-123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ campaignId: 'c-1' }), // falta action
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Payload invalido');
  });
});
