import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest } from './helpers';

const mockAdminAuth = {
  verifyIdToken: vi.fn(),
};

const mockAdminFirestore = {
  collection: vi.fn(() => ({
    where: vi.fn(() => ({
      limit: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ empty: false, docs: [{ data: () => ({}) }] }) })),
      get: vi.fn().mockResolvedValue({ empty: false, docs: [{ data: () => ({}) }] }),
    })),
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ slices: [], background_music_url: '' }) }),
    })),
  })),
};

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  cert: vi.fn(),
}));

vi.mock('@/firebase/admin', () => ({
  getAdminAuth: vi.fn(() => mockAdminAuth),
  getAdminFirestore: vi.fn(() => mockAdminFirestore),
}));

vi.mock('@/lib/adn-utils', () => ({
  validateAdnId: vi.fn((id: string) => /^[a-zA-Z0-9_-]+$/.test(id)),
  getSafeAdnDir: vi.fn((id: string) => `/fake/adns/${id}`),
  loadAdnConfig: vi.fn((id: string) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error('ID de ADN inválido');
    }
    return Promise.resolve({ slices: [], background_music_url: '' });
  }),
}));

vi.mock('fs/promises', () => ({
  access: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('{"slices":[],"background_music_url":""}'),
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock fetch global para evitar llamadas reales a Google Drive
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HIGH #8 — Path traversal en ADNs (sanitizar adnId)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: 'admin-123', admin: true });
  });

  const testPathTraversal = async (routePath: string, method: 'POST' | 'DELETE' = 'POST', body: any = {}) => {
    const mod = await import(routePath);
    const handler = method === 'POST' ? mod.POST : mod.DELETE;
    const req = createMockRequest({
      method,
      headers: { Authorization: 'Bearer valid-token' },
      body,
    });
    return handler(req);
  };

  it('POST /api/admin/adns — adnId con path traversal (../etc) → 400', async () => {
    const response = await testPathTraversal('@/app/api/admin/adns/route', 'POST', {
      id: '../../etc/passwd',
      name: 'test',
      version: '1.0',
      target_format: 'video'
    });
    expect(response.status).toBe(400);
  });

  it('DELETE /api/admin/adns — adnId con path traversal → 400', async () => {
    const response = await testPathTraversal('@/app/api/admin/adns/route', 'DELETE', {
      adnId: '../../etc/passwd'
    });
    expect(response.status).toBe(400);
  });

  it('POST /api/admin/adns/verify — adnId con path traversal → 400', async () => {
    const response = await testPathTraversal('@/app/api/admin/adns/verify/route', 'POST', {
      adnId: '../../../../etc'
    });
    expect(response.status).toBe(400);
  });

  it('POST /api/admin/adns/detail — adnId con path traversal → 400/404', async () => {
    const response = await testPathTraversal('@/app/api/admin/adns/detail/route', 'POST', {
      adnId: '../../windows/system32'
    });
    // loadAdnConfig lanza error → route captura y devuelve 404
    expect([400, 404]).toContain(response.status);
  });

  it('POST /api/admin/adns/smoke-test — adnId con path traversal → 400', async () => {
    const response = await testPathTraversal('@/app/api/admin/adns/smoke-test/route', 'POST', {
      adnId: '..\\..\\etc\\passwd',
      format: '9:16',
      isFull: false
    });
    expect(response.status).toBe(400);
  });

  it('adnId válido (alphanum + _ -) → pasa validación', async () => {
    const response = await testPathTraversal('@/app/api/admin/adns/route', 'POST', {
      id: 'valid-adn-123',
      name: 'Test',
      version: '1.0',
      target_format: 'video'
    });
    expect(response.status).not.toBe(400);
  });
});

describe('HIGH #9 — SSRF en /api/video/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('sin fileId o token → 400', async () => {
    const mod = await import('@/app/api/video/download/route');
    const req = createMockRequest({ searchParams: { id: 'abc' } });
    const response = await mod.GET(req);
    expect(response.status).toBe(400);
  });

  it('fileId con formato sospechoso (no es ID de Drive) → 400', async () => {
    const mod = await import('@/app/api/video/download/route');
    const req = createMockRequest({ 
      searchParams: { id: 'not-a-drive-id', token: 'fake-token', name: 'test.mp4' } 
    });
    const response = await mod.GET(req);
    expect(response.status).toBe(400);
  });

  it('fileId válido → pasa validación inicial (no 400)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'video/mp4', 'content-length': '1000' }),
      body: new ReadableStream(),
    });

    const mod = await import('@/app/api/video/download/route');
    const req = createMockRequest({ 
      searchParams: { id: '1BxiMVs0XRA5nFMdKvBd3', token: 'fake-token', name: 'test.mp4' } 
    });
    const response = await mod.GET(req);
    // No debe ser 400 (validación de formato pasa)
    // Puede ser 200, 401, 403, etc. pero NO 400
    expect(response.status).not.toBe(400);
  });
});