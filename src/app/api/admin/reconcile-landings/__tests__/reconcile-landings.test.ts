import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { authenticateCaller } from '@/lib/api/mentor-auth';
import { adminDb } from '@/firebase/admin';

vi.mock('@/lib/api/mentor-auth');
vi.mock('@/firebase/admin', () => {
  const mockBatch = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };
  const mockCollection = {
    get: vi.fn(),
    doc: vi.fn(() => ({ id: 'doc-ref' })),
  };
  return {
    adminDb: {
      collection: vi.fn(() => mockCollection),
      batch: vi.fn(() => mockBatch),
    },
  };
});

describe('POST /api/admin/reconcile-landings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe rechazar con 403 si el llamante no es admin', async () => {
    vi.mocked(authenticateCaller).mockResolvedValue({ uid: 'user1', isAdmin: false } as any);

    const req = new NextRequest('http://localhost:3000/api/admin/reconcile-landings', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Unauthorized');
  });

  it('debe reconciliar duplicados degradando las landings sobrantes a pendiente', async () => {
    vi.mocked(authenticateCaller).mockResolvedValue({ uid: 'admin1', isAdmin: true } as any);

    const mockDocs = [
      {
        id: 'landing-1',
        data: () => ({
          mentorId: 'm1',
          courseId: 'c1',
          title: 'Promo Directa',
          landingType: 'promocion',
          isActive: true,
          status: 'activa',
          createdAt: { seconds: 1000 },
        }),
      },
      {
        id: 'landing-2',
        data: () => ({
          mentorId: 'm1',
          courseId: 'c1',
          title: 'General Antigua',
          landingType: 'general',
          isActive: true,
          status: 'published', // Legacy status
          createdAt: { seconds: 500 },
        }),
      },
    ];

    const mockColl = (adminDb.collection as any)();
    mockColl.get.mockResolvedValue({ docs: mockDocs });

    const req = new NextRequest('http://localhost:3000/api/admin/reconcile-landings', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.totalExamined).toBe(2);
    expect(data.demotedDuplicatesCount).toBe(1);
    expect(data.demotedPageIds).toContain('landing-2');
  });
});
