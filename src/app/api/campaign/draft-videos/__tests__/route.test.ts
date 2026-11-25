import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyIdToken = vi.fn();
vi.mock('@/firebase/admin', () => ({
  getAdminAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
}));

const mockEnqueueVideoTask = vi.fn();
vi.mock('@/lib/cloud-tasks', () => ({
  enqueueVideoTask: (...args: any[]) => mockEnqueueVideoTask(...args),
}));

describe('API Route /api/campaign/draft-videos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 401 si no se envía encabezado Authorization', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/draft-videos', {
      method: 'POST',
      body: JSON.stringify({ campaignId: 'c-1', assets: {} }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('No autenticado');
  });

  it('devuelve 401 si el Firebase ID Token es inválido o expiró', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Token expired'));

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/draft-videos', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-invalido' },
      body: JSON.stringify({ campaignId: 'c-1', assets: {} }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Token inválido');
  });

  it('devuelve 400 si faltan parámetros requeridos (campaignId o assets)', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'mentor-123', role: 'mentor' });

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/draft-videos', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-valido' },
      body: JSON.stringify({ campaignId: 'c-1' }), // falta assets
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Faltan parámetros');
  });

  it('devuelve 500 si enqueueVideoTask falla (ej: fallo M2M del worker)', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'mentor-123', role: 'mentor' });
    mockEnqueueVideoTask.mockRejectedValueOnce(new Error('Error encolando tarea: Worker HTTP 500'));

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/draft-videos', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-valido' },
      body: JSON.stringify({
        campaignId: 'c-1',
        assets: { socials: [] },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Worker HTTP 500');
  });

  it('devuelve 200 y despacha la tarea con el uid del tutor cuando todo es válido', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'mentor-456', role: 'mentor' });
    mockEnqueueVideoTask.mockResolvedValueOnce({ success: true });

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/draft-videos', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-valido' },
      body: JSON.stringify({
        campaignId: 'c-456',
        assets: { socials: [{ platform: 'instagram' }] },
        language: 'es-AR',
        targetAudience: 'Emprendedores',
        campaignMission: 'Venta',
        coordinationPlan: { timeline: [] },
        autoGenerateImages: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockEnqueueVideoTask).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'draft-full-campaign',
        campaignId: 'c-456',
        uid: 'mentor-456',
        language: 'es-AR',
        autoGenerateImages: true,
      })
    );
  });
});
