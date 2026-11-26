import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyIdToken = vi.fn();
const mockGetDoc = vi.fn();

vi.mock('@/firebase/admin', () => ({
  getAdminAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: mockGetDoc,
      }),
    }),
  },
}));

const mockCheckSufficientCredits = vi.fn();
vi.mock('@/lib/payments/credits', () => ({
  checkSufficientCredits: (...args: any[]) => mockCheckSufficientCredits(...args),
}));

describe('API Route /api/campaign/estimate-budget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 401 si no hay token de autenticación', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/estimate-budget', {
      method: 'POST',
      body: JSON.stringify({ pieceCount: 21 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('calcula presupuesto para una cantidad dada de piezas con saldo suficiente', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'mentor-1', role: 'mentor' });
    mockCheckSufficientCredits.mockResolvedValueOnce({ ok: true, balance: 10 });

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/estimate-budget', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-valido' },
      body: JSON.stringify({ pieceCount: 21, autoGenerateImages: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.estimate.pieceCount).toBe(21);
    expect(json.estimate.canAfford).toBe(true);
    expect(json.estimate.totalCreditsEstimated).toBeGreaterThan(0);
  });

  it('si se envía campaignId calcula únicamente sobre las piezas pendientes', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'mentor-1', role: 'mentor' });
    mockCheckSufficientCredits.mockResolvedValueOnce({ ok: true, balance: 5 });

    // Mock de campaña con 21 esqueletos (18 generadas, 3 pendientes)
    const skeletons = Array.from({ length: 21 }, (_, i) => ({
      marketingName: `Pieza ${i + 1}`,
      isGenerated: i < 18 ? true : undefined,
    }));

    mockGetDoc.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        title: 'Campaña Develando',
        videoSkeletons: skeletons,
      }),
    });

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost:9002/api/campaign/estimate-budget', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-valido' },
      body: JSON.stringify({ campaignId: 'c-develando', autoGenerateImages: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.completedPieces).toBe(18);
    expect(json.pendingPieces).toBe(3);
    // Solo cotiza las 3 pendientes
    expect(json.estimate.pieceCount).toBe(3);
  });
});
