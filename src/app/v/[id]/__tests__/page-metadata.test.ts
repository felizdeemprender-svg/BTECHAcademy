import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    cache: (fn: any) => {
      const cacheMap = new Map();
      return (...args: any[]) => {
        const key = JSON.stringify(args);
        if (cacheMap.has(key)) return cacheMap.get(key);
        const res = fn(...args);
        cacheMap.set(key, res);
        return res;
      };
    },
  };
});

import { generateMetadata, getCachedPublicSalesPage } from '../page';

vi.mock('@/domain/sales-pages/use-cases/get-public-sales-page-use-case', () => {
  return {
    GetPublicSalesPageUseCase: class {
      execute = mockExecute;
    },
  };
});

vi.mock('@/lib/currency/rates-service', () => ({
  getCurrencyRates: vi.fn(),
}));

vi.mock('@/lib/api/gateway', () => ({
  resolveGateway: vi.fn(),
}));

vi.mock('@/data/firestore/tutor-repo', () => ({
  FirestoreTutorRepository: vi.fn(),
}));

vi.mock('@/domain/identity/use-cases/get-tutor-by-id', () => ({
  getTutorById: vi.fn(),
}));

vi.mock('@/data/firestore/payment-method-repo', () => ({
  FirestorePaymentMethodRepository: vi.fn(),
}));

vi.mock('@/domain/commerce/use-cases/list-payment-options', () => ({
  listPaymentOptions: vi.fn(),
}));

describe('Landing Page generateMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe generar metadata dinamica completa para una landing valida', async () => {
    mockExecute.mockResolvedValueOnce({
      page: {
        id: 'landing-123',
        title: 'Curso de Liderazgo',
        content: {
          sections: [
            {
              id: 'heroVideo_1',
              title: 'Liderazgo Transformacional',
              subtitle: 'Desarrolla habilidades de alto impacto',
              imageUrl: 'https://cdn.example.com/hero.jpg',
            },
          ],
        },
      },
      course: null,
    });

    const meta = await generateMetadata({ params: Promise.resolve({ id: 'landing-123' }) });

    expect(meta.title).toBe('Liderazgo Transformacional | Fastoria');
    expect(meta.description).toBe('Desarrolla habilidades de alto impacto');
    expect(meta.openGraph).toEqual({
      title: 'Liderazgo Transformacional',
      description: 'Desarrolla habilidades de alto impacto',
      images: [{ url: 'https://cdn.example.com/hero.jpg' }],
    });
    expect(meta.twitter).toEqual({
      card: 'summary_large_image',
      title: 'Liderazgo Transformacional',
      description: 'Desarrolla habilidades de alto impacto',
      images: ['https://cdn.example.com/hero.jpg'],
    });
  });

  it('debe devolver "Página no disponible | Fastoria" si no se encuentra la landing', async () => {
    mockExecute.mockResolvedValueOnce(null);

    const meta = await generateMetadata({ params: Promise.resolve({ id: 'inexistente' }) });

    expect(meta.title).toBe('Página no disponible | Fastoria');
  });

  it('debe capturar errores de ejecucion y retornar titulo fallback "Fastoria"', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Fallo de conexion a base de datos'));

    const meta = await generateMetadata({ params: Promise.resolve({ id: 'error-id' }) });

    expect(meta.title).toBe('Fastoria');
  });

  it('debe deduplicar llamadas identicas mediante React cache', async () => {
    mockExecute.mockResolvedValue({
      page: { id: 'cache-test', title: 'Test Cache' },
      course: null,
    });

    const res1 = await getCachedPublicSalesPage('cache-test', false);
    const res2 = await getCachedPublicSalesPage('cache-test', false);

    expect(res1).toEqual(res2);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
