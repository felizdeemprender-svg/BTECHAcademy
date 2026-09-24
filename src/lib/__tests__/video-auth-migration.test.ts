import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest } from './helpers';

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  cert: vi.fn(),
}));

vi.mock('@/firebase/admin', () => ({
  getAdminAuth: vi.fn(),
  getAdminFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        set: vi.fn().mockResolvedValue({}),
        get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ slices: [] }) }),
        update: vi.fn().mockResolvedValue({}),
      })),
      where: vi.fn(() => ({
        limit: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ empty: false, docs: [{ data: () => ({}) }] }) })),
        get: vi.fn().mockResolvedValue({ empty: false, docs: [{ data: () => ({}) }] }),
      })),
    })),
  })),
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        set: vi.fn().mockResolvedValue({}),
        get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ slices: [] }) }),
        update: vi.fn().mockResolvedValue({}),
      })),
      where: vi.fn(() => ({
        limit: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ empty: false, docs: [{ data: () => ({}) }] }) })),
        get: vi.fn().mockResolvedValue({ empty: false, docs: [{ data: () => ({}) }] }),
      })),
    })),
  },
}));

vi.mock('@/lib/adn-utils', () => ({
  loadAdnConfig: vi.fn().mockResolvedValue({ slices: [], background_music_url: '' }),
}));

vi.mock('@/lib/ai/video-prompt', () => ({
  buildVideoPrompt: vi.fn().mockResolvedValue({ prompt: 'test' }),
  buildSceneExportPrompt: vi.fn().mockResolvedValue({ prompt: 'test', perScene: [], totalDuration: 30 }),
}));

vi.mock('@/lib/ai/gemini-omni', () => ({
  generateOmniVideo: vi.fn(),
  downloadOmniVideo: vi.fn(),
  saveOmniBytes: vi.fn(),
}));

vi.mock('@/lib/ai/long-video', () => ({
  generateLongVideo: vi.fn(),
  downloadLongVideo: vi.fn(),
}));

vi.mock('@/lib/ai/avatar', () => ({
  generateAvatarVideo: vi.fn(),
}));

vi.mock('@/lib/drive-utils', () => ({
  uploadToDrive: vi.fn(),
  getOrCreateFolder: vi.fn(),
}));

vi.mock('@/lib/payments/credits', () => ({
  calculateVideoCost: vi.fn(),
  deductCredits: vi.fn(),
}));

vi.mock('@/ai/flows/generate-video-flow', () => ({
  generateVideoFlow: vi.fn(),
}));

vi.mock('@/ai/flows/evo-assistant', () => ({
  askEvo: vi.fn().mockResolvedValue({ response: 'Hola', nextSteps: [], guardrails: [] }),
}));

import { getAdminAuth } from '@/firebase/admin';

describe('Video Generate — migración cookie → Firebase ID token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sin Authorization header → 401', async () => {
    const { POST } = await import('@/app/api/video/generate/route');
    const req = createMockRequest({
      method: 'POST',
      body: { cursoId: 'curso-1', formato: '9:16', avatar: false }
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('token de usuario válido → 200 (job encolado)', async () => {
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'user-123', role: 'alumno' }),
    } as any);

    const { POST } = await import('@/app/api/video/generate/route');
    const req = createMockRequest({
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: { cursoId: 'curso-1', formato: '9:16', avatar: false }
    });
    const response = await POST(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.jobId).toBeDefined();
  });

  it('NO debe aceptar body.uid/body.role como fallback', async () => {
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockRejectedValue(new Error('invalid token')),
    } as any);

    const { POST } = await import('@/app/api/video/generate/route');
    const req = createMockRequest({
      method: 'POST',
      body: { 
        cursoId: 'curso-1', 
        formato: '9:16', 
        avatar: false,
        uid: 'attacker-uid',
        role: 'admin'
      }
    });
    const response = await POST(req);
    // Sin header Authorization, debe fallar 401 (no usar body.uid/role)
    expect(response.status).toBe(401);
  });
});

describe('Video Token — migración cookie → Firebase ID token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VIDEO_TOKEN_SECRET', 'test-secret-key-32-chars-minimum-length');
  });

  it('sin Authorization header → 401', async () => {
    const { POST } = await import('@/app/api/video/token/route');
    const req = createMockRequest({
      method: 'POST',
      body: { videoUrl: 'https://youtube.com/watch?v=abc123' }
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('token de usuario válido → 200 (token generado)', async () => {
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
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.token).toBeDefined();
  });
});

describe('Evo Chat — migración cookie → Firebase ID token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sin Authorization header → 401', async () => {
    const { POST } = await import('@/app/api/ai/evo-chat/route');
    const req = createMockRequest({
      method: 'POST',
      body: { message: 'Hola', history: [] }
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('token de usuario válido → 200', async () => {
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'user-123', role: 'alumno' }),
    } as any);

    const { POST } = await import('@/app/api/ai/evo-chat/route');
    const req = createMockRequest({
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: { message: 'Hola', history: [] }
    });
    const response = await POST(req);
    expect(response.status).toBe(200);
  });
});