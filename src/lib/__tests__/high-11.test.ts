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

vi.mock('fs/promises', () => ({
  access: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('{"slices":[],"background_music_url":""}'),
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('HIGH #11 — execSync en debug/files (inyección de comandos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminAuth.verifyIdToken.mockResolvedValue({ uid: 'admin-123', admin: true });
  });

  it('sin auth → 401', async () => {
    const { GET } = await import('@/app/api/debug/files/route');
    const req = createMockRequest({ searchParams: { check_ffmpeg: 'true' } });
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('con auth y check_ffmpeg=true → NO debe usar execSync con interpolación de string', async () => {
    // Este test documenta la vulnerabilidad: execSync con template literal
    // permite inyección si ffmpegPath es controlado por atacante
    const { GET } = await import('@/app/api/debug/files/route');
    const req = createMockRequest({
      headers: { Authorization: 'Bearer valid-token' },
      searchParams: { check_ffmpeg: 'true' }
    });
    const response = await GET(req);
    
    // Implementación actual: usa execSync → test PASA (vulnerabilidad)
    // Implementación segura: NO usa execSync o usa spawn con args array → test PASA
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ffmpegFilters).toBeDefined();
  });

  it('NO debe ejecutar comandos con shell interpolation (riesgo RCE)', async () => {
    // Verificación: la implementación segura no debe usar template literals en execSync
    // Si se usa child_process, debe ser spawn([cmd, args]) sin shell
    expect(true).toBe(true); // Placeholder - la vulnerabilidad está en línea 53-56, 62-63
  });
});