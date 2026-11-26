import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyIdToken = vi.fn();
const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock('@/firebase/admin', () => ({
  getAdminAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: mockGetDoc,
        update: mockUpdateDoc,
      }),
    }),
  },
}));

const mockEnqueueVideoTask = vi.fn();
vi.mock('@/lib/cloud-tasks', () => ({
  enqueueVideoTask: (...args: any[]) => mockEnqueueVideoTask(...args),
}));

const mockCheckSufficientCredits = vi.fn();
vi.mock('@/lib/payments/credits', () => ({
  checkSufficientCredits: (...args: any[]) => mockCheckSufficientCredits(...args),
}));

describe('API Route /api/campaign/resume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 401 si no está autenticado', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/resume', {
      method: 'POST',
      body: JSON.stringify({ campaignId: 'c-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('devuelve 404 si la campaña no existe', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'mentor-1', role: 'mentor' });
    mockGetDoc.mockResolvedValueOnce({ exists: false });

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/resume', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-valido' },
      body: JSON.stringify({ campaignId: 'c-inexistente' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('devuelve 403 si otro mentor intenta reanudar una campaña que no le pertenece', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'mentor-hacker', role: 'mentor' });
    mockGetDoc.mockResolvedValueOnce({
      exists: true,
      data: () => ({ mentorId: 'mentor-legitimo', videoSkeletons: [] }),
    });

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/resume', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-valido' },
      body: JSON.stringify({ campaignId: 'c-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('si todas las piezas ya están completas no reanuda y marca drafts_ready', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'mentor-1', role: 'mentor' });
    const skeletons = [
      { marketingName: 'P1', isGenerated: true },
      { marketingName: 'P2', isGenerated: true },
    ];
    mockGetDoc.mockResolvedValueOnce({
      exists: true,
      data: () => ({ mentorId: 'mentor-1', videoSkeletons: skeletons }),
    });

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/resume', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-valido' },
      body: JSON.stringify({ campaignId: 'c-1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.pendingPieces).toBe(0);
    expect(mockEnqueueVideoTask).not.toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ campaignStatus: 'drafts_ready' })
    );
  });

  it('devuelve 402 si el saldo es insuficiente para las piezas pendientes', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'mentor-1', role: 'mentor' });
    mockCheckSufficientCredits.mockResolvedValueOnce({ ok: true, balance: 0.05 }); // saldo bajo

    const skeletons = [
      { marketingName: 'P1', isGenerated: true },
      { marketingName: 'P2', isGenerated: undefined },
      { marketingName: 'P3', isGenerated: undefined },
    ];
    mockGetDoc.mockResolvedValueOnce({
      exists: true,
      data: () => ({ mentorId: 'mentor-1', videoSkeletons: skeletons }),
    });

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/resume', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-valido' },
      body: JSON.stringify({ campaignId: 'c-1', autoGenerateImages: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toBe('insufficient_credits');
    expect(mockEnqueueVideoTask).not.toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ campaignStatus: 'paused_insufficient_credits' })
    );
  });

  it('encola la reanudación si hay piezas pendientes y saldo suficiente', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'mentor-1', role: 'mentor' });
    mockCheckSufficientCredits.mockResolvedValueOnce({ ok: true, balance: 15 }); // saldo alto

    const skeletons = [
      { marketingName: 'P1', isGenerated: true },
      { marketingName: 'P2', isGenerated: undefined },
    ];
    mockGetDoc.mockResolvedValueOnce({
      exists: true,
      data: () => ({ mentorId: 'mentor-1', videoSkeletons: skeletons }),
    });

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/resume', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-valido' },
      body: JSON.stringify({ campaignId: 'c-1', autoGenerateImages: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.completedPieces).toBe(1);
    expect(json.pendingPieces).toBe(1);
    expect(mockEnqueueVideoTask).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'draft-full-campaign',
        campaignId: 'c-1',
      })
    );
  });
});
