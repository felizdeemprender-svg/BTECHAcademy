import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest } from './helpers';

// Mock de Firebase client SDK (usado por diagnose route)
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => ['existing-app']),
  getApp: vi.fn(() => ({})),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
}));

vi.mock('@/firebase/config', () => ({
  firebaseConfig: { projectId: 'test' },
}));

// Mock de firebase-admin (usado por verifyAdmin)
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  cert: vi.fn(),
}));

vi.mock('@/firebase/admin', () => ({
  getAdminAuth: vi.fn(),
}));

import { getAdminAuth } from '@/firebase/admin';

describe('Ruta /api/diagnose — protección de autenticación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sin token → 401', async () => {
    const { GET } = await import('@/app/api/diagnose/route');
    const req = createMockRequest();
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('token de no-admin → 401', async () => {
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'alumno-123', admin: false }),
    } as any);

    const { GET } = await import('@/app/api/diagnose/route');
    const req = createMockRequest({ headers: { Authorization: 'Bearer token-alumno' } });
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('token de admin → 200', async () => {
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'admin-123', admin: true }),
    } as any);

    const { GET } = await import('@/app/api/diagnose/route');
    const req = createMockRequest({ headers: { Authorization: 'Bearer token-admin' } });
    const response = await GET(req);
    expect(response.status).toBe(200);
  });
});

describe('Ruta /api/admin/adns — protección de autenticación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST sin token → 401', async () => {
    const { POST } = await import('@/app/api/admin/adns/route');
    const req = createMockRequest({
      method: 'POST',
      body: { id: 'test-adn', name: 'Test' },
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('DELETE sin token → 401', async () => {
    const { DELETE } = await import('@/app/api/admin/adns/route');
    const req = createMockRequest({
      method: 'DELETE',
      body: { adnId: 'test-adn' },
    });
    const response = await DELETE(req);
    expect(response.status).toBe(401);
  });

  it('POST con token admin → NO devuelve 401', async () => {
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'admin-123', admin: true }),
    } as any);

    const { POST } = await import('@/app/api/admin/adns/route');
    const req = createMockRequest({
      method: 'POST',
      headers: { Authorization: 'Bearer token-admin' },
      body: { id: 'test-adn', name: 'Test' },
    });
    const response = await POST(req);
    // Si el auth passa, el handler sigue su curso normal (puede fallar por fs, pero NO por auth)
    expect(response.status).not.toBe(401);
  });
});
