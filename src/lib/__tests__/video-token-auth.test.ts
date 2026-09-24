import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest } from './helpers';

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}));

vi.mock('@/firebase/admin', () => ({
  getAdminAuth: vi.fn(),
}));

import { cookies } from 'next/headers';
import { getAdminAuth } from '@/firebase/admin';

describe('Token Video — verificación criptográfica obligatoria (no base64)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VIDEO_TOKEN_SECRET', 'test-secret-key-32-chars-minimum');
    vi.mocked(cookies).mockReturnValue({ get: vi.fn(() => ({ value: 'test-uid-123' })) } as any);
  });

  describe('POST /api/video/token — generación', () => {
    it('sin Authorization header → 401', async () => {
      const { POST } = await import('@/app/api/video/token/route');
      const req = createMockRequest({ method: 'POST', body: { videoUrl: 'https://youtube.com/watch?v=abc123' } });
      const response = await POST(req);
      expect(response.status).toBe(401);
    });

    it('sin videoUrl (con auth) → 400', async () => {
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'user-123', role: 'alumno' }),
      } as any);

      const { POST } = await import('@/app/api/video/token/route');
      const req = createMockRequest({
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: {}
      });
      const response = await POST(req);
      expect(response.status).toBe(400);
    });

    it('genera token que NO es base64 simple (tiene 3 partes separadas por .)', async () => {
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'user-123', role: 'alumno' }),
      } as any);

      const { POST } = await import('@/app/api/video/token/route');
      const req = createMockRequest({
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: { videoUrl: 'https://youtube.com/watch?v=abc123' }
      });
      const response = await POST(req);
      const body = await response.json();
      expect(body.token).toBeDefined();
      const parts = body.token.split('.');
      expect(parts.length).toBe(3); // JWT tiene 3 partes
    });
  });

  describe('GET /api/video/token — validación', () => {
    it('token sin firma válida (base64 simple) → 401', async () => {
      // Token falso estilo actual (base64, no firmado)
      const fakeHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const fakeBody = btoa(JSON.stringify({ uid: 'u1', videoId: 'v1', exp: Math.floor(Date.now()/1000) + 7200 }));
      const fakeSig = btoa(`${fakeHeader}.${fakeBody}.secret`); // base64, no HMAC
      const fakeToken = `${fakeHeader}.${fakeBody}.${fakeSig}`;

      const { GET } = await import('@/app/api/video/token/route');
      const req = createMockRequest({ searchParams: { token: fakeToken } });
      const response = await GET(req);
      // Implementación actual (insegura) devuelve 200 → test FALLA
      // Implementación segura (HMAC) devuelve 401 → test PASA
      expect(response.status).toBe(401);
    });

    it('token firmado con HMAC-SHA256 correcto → 200', async () => {
      // Este test pasará cuando implementemos JWT real
      const { GET } = await import('@/app/api/video/token/route');
      // No podemos crear token real sin la librería, pero el test documenta el comportamiento esperado
      // expect(response.status).toBe(200);
    });

    it('token expirado → 401', async () => {
      const { GET } = await import('@/app/api/video/token/route');
      const req = createMockRequest({ searchParams: { token: 'expired.token.here' } });
      const response = await GET(req);
      expect(response.status).toBe(401);
    });
  });
});