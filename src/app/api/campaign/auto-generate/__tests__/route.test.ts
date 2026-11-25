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

describe('API Route /api/campaign/auto-generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 401 si no se envía encabezado Authorization', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/auto-generate', {
      method: 'POST',
      body: JSON.stringify({ campaignId: 'c-1', assets: {} }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('No autenticado');
  });

  it('devuelve 401 si el token es inválido', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/auto-generate', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid' },
      body: JSON.stringify({ campaignId: 'c-1', assets: {} }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Token inválido');
  });

  it('devuelve 400 si faltan parámetros requeridos (campaignId o assets)', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'mentor-1', role: 'mentor' });

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/auto-generate', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid' },
      body: JSON.stringify({ campaignId: 'c-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Faltan parámetros');
  });

  it('devuelve 200 y despacha generate-full-campaign al worker cuando todo es válido', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'mentor-1', role: 'mentor' });
    mockEnqueueVideoTask.mockResolvedValueOnce({ success: true });

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/auto-generate', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid' },
      body: JSON.stringify({
        campaignId: 'c-auto-1',
        assets: { socials: [] },
        targetAudience: 'Audiencia',
        campaignMission: 'Venta',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockEnqueueVideoTask).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'generate-full-campaign',
        campaignId: 'c-auto-1',
        uid: 'mentor-1',
      })
    );
  });
});
