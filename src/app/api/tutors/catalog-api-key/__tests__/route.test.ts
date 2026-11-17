import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

const mockAuthenticateCaller = vi.fn();
const mockGetTutorKeyInfo = vi.fn();
const mockGenerateOrRegenerateKey = vi.fn();

vi.mock('@/lib/api/mentor-auth', () => ({
  authenticateCaller: (...args: any[]) => mockAuthenticateCaller(...args),
}));

vi.mock('@/lib/api/gateway', () => ({
  resolveGateway: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/api/catalog-api-key-guard', () => {
  return {
    CatalogApiKeyGuard: class {
      getTutorKeyInfo = mockGetTutorKeyInfo;
      generateOrRegenerateKey = mockGenerateOrRegenerateKey;
    },
  };
});

describe('/api/tutors/catalog-api-key route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 if unauthenticated', async () => {
      mockAuthenticateCaller.mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:9002/api/tutors/catalog-api-key');
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it('returns 200 with key info when authenticated', async () => {
      mockAuthenticateCaller.mockResolvedValueOnce({ uid: 'tutor-xyz' });
      mockGetTutorKeyInfo.mockResolvedValueOnce({
        keyPrefix: 'fde_live_abcd...',
        status: 'active',
        createdAt: '2026-11-17T00:00:00Z',
      });

      const req = new NextRequest('http://localhost:9002/api/tutors/catalog-api-key');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.hasKey).toBe(true);
      expect(data.apiKey.keyPrefix).toBe('fde_live_abcd...');
      expect(mockGetTutorKeyInfo).toHaveBeenCalledWith('tutor-xyz');
    });
  });

  describe('POST', () => {
    it('returns 401 if unauthenticated', async () => {
      mockAuthenticateCaller.mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:9002/api/tutors/catalog-api-key', { method: 'POST' });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it('returns 200 with new raw key when authenticated', async () => {
      mockAuthenticateCaller.mockResolvedValueOnce({ uid: 'tutor-xyz' });
      mockGenerateOrRegenerateKey.mockResolvedValueOnce({
        rawKey: 'fde_live_newsecretkey1234567890',
        keyDoc: {
          keyPrefix: 'fde_live_newsec...',
          status: 'active',
          createdAt: '2026-11-17T00:00:00Z',
        },
      });

      const req = new NextRequest('http://localhost:9002/api/tutors/catalog-api-key', { method: 'POST' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rawKey).toBe('fde_live_newsecretkey1234567890');
      expect(data.keyDoc.keyPrefix).toBe('fde_live_newsec...');
      expect(mockGenerateOrRegenerateKey).toHaveBeenCalledWith('tutor-xyz');
    });
  });
});
