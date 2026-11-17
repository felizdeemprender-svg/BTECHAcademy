import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, OPTIONS } from '../route';

const mockValidateRequestKey = vi.fn();
const mockExecuteCatalogUseCase = vi.fn();

vi.mock('@/lib/api/gateway', () => ({
  resolveGateway: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/api/catalog-api-key-guard', () => {
  return {
    CatalogApiKeyGuard: class {
      validateRequestKey = mockValidateRequestKey;
    },
  };
});

vi.mock('@/domain/catalog/use-cases/get-tutor-public-catalog-use-case', () => {
  return {
    GetTutorPublicCatalogUseCase: class {
      execute = mockExecuteCatalogUseCase;
    },
  };
});

describe('/api/v1/tutor/catalog route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OPTIONS', () => {
    it('returns 204 with CORS headers allowing feliz.fastoria.com.ar', async () => {
      const req = new NextRequest('http://localhost:9002/api/v1/tutor/catalog', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://feliz.fastoria.com.ar',
        },
      });

      const res = await OPTIONS(req);
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://feliz.fastoria.com.ar');
      expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('x-api-key');
    });

    it('returns CORS header reflecting any tutor external domain dynamically', async () => {
      const req = new NextRequest('http://localhost:9002/api/v1/tutor/catalog', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://academia-externa-del-tutor.com',
        },
      });

      const res = await OPTIONS(req);
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://academia-externa-del-tutor.com');
    });
  });

  describe('GET', () => {
    it('returns 401 when API Key is missing', async () => {
      mockValidateRequestKey.mockResolvedValueOnce({
        ok: false,
        status: 401,
        error: 'API Key requerida',
        code: 'API_KEY_REQUIRED',
      });

      const req = new NextRequest('http://localhost:9002/api/v1/tutor/catalog', {
        headers: {
          origin: 'https://feliz.fastoria.com.ar',
        },
      });

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.code).toBe('API_KEY_REQUIRED');
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://feliz.fastoria.com.ar');
    });

    it('returns 403 when API Key is blocked by circuit breaker', async () => {
      mockValidateRequestKey.mockResolvedValueOnce({
        ok: false,
        status: 403,
        error: 'API Key bloqueada por seguridad ante actividad inusual',
        code: 'API_KEY_BLOCKED',
      });

      const req = new NextRequest('http://localhost:9002/api/v1/tutor/catalog', {
        headers: {
          'x-api-key': 'fde_live_blockedkey123',
          origin: 'https://feliz.fastoria.com.ar',
        },
      });

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe('API_KEY_BLOCKED');
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://feliz.fastoria.com.ar');
    });

    it('returns 200 with catalog data and cache headers when valid key is provided via x-api-key', async () => {
      mockValidateRequestKey.mockResolvedValueOnce({
        ok: true,
        tutorId: 'tutor-123',
      });

      const mockCatalog = {
        tutor: { id: 'tutor-123', name: 'Profe Martin' },
        offersCount: 1,
        offers: [
          {
            id: 'landing-1',
            type: 'curso',
            title: 'Curso de Finanzas',
            description: 'Descripcion breve',
            imageUrl: 'https://image.com/cover.jpg',
            price: { amount: 15000, currency: 'ARS', isFree: false, formatted: '$15000 ARS' },
            duration: { value: 4, unit: 'semanas', label: '4 semanas' },
            url: 'https://feliz.fastoria.com.ar/v/landing-1',
            status: 'published',
            activeUntil: null,
          },
        ],
        filtersApplied: {},
      };

      mockExecuteCatalogUseCase.mockResolvedValueOnce(mockCatalog);

      const req = new NextRequest('http://localhost:9002/api/v1/tutor/catalog?type=curso&limit=10', {
        headers: {
          'x-api-key': 'fde_live_validkey123',
          origin: 'https://feliz.fastoria.com.ar',
        },
      });

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.tutor.id).toBe('tutor-123');
      expect(data.offers).toHaveLength(1);
      expect(res.headers.get('Cache-Control')).toContain('s-maxage=120');
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://feliz.fastoria.com.ar');

      // Verify use-case called with parsed types and limit
      expect(mockExecuteCatalogUseCase).toHaveBeenCalledWith(
        'tutor-123',
        expect.objectContaining({
          types: ['curso'],
          limit: 10,
        }),
      );
    });

    it('extracts key from Authorization Bearer header correctly', async () => {
      mockValidateRequestKey.mockResolvedValueOnce({
        ok: true,
        tutorId: 'tutor-abc',
      });

      mockExecuteCatalogUseCase.mockResolvedValueOnce({
        tutor: { id: 'tutor-abc', name: 'Ana' },
        offersCount: 0,
        offers: [],
        filtersApplied: {},
      });

      const req = new NextRequest('http://localhost:9002/api/v1/tutor/catalog', {
        headers: {
          Authorization: 'Bearer fde_live_tokenbearer',
        },
      });

      await GET(req);

      expect(mockValidateRequestKey).toHaveBeenCalledWith('fde_live_tokenbearer');
    });

    it('extracts key from api_key query param when headers not present', async () => {
      mockValidateRequestKey.mockResolvedValueOnce({
        ok: true,
        tutorId: 'tutor-xyz',
      });

      mockExecuteCatalogUseCase.mockResolvedValueOnce({
        tutor: { id: 'tutor-xyz', name: 'Carlos' },
        offersCount: 0,
        offers: [],
        filtersApplied: {},
      });

      const req = new NextRequest('http://localhost:9002/api/v1/tutor/catalog?api_key=fde_live_fromquery');

      await GET(req);

      expect(mockValidateRequestKey).toHaveBeenCalledWith('fde_live_fromquery');
    });
  });
});
