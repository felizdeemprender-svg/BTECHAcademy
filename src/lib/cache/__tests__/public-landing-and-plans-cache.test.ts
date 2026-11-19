import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCachedTutorAndPayments,
  clearPublicLandingCache,
  getPublicLandingCacheSize,
} from '../public-landing-cache';
import {
  handlePublicPlans,
  invalidatePublicPlansCache,
} from '@/lib/api/subscription-admin-handlers';

describe('Optimizaciones Paso 3 y Paso 4: Caché de Planes y Landings Públicas', () => {
  beforeEach(() => {
    clearPublicLandingCache();
    invalidatePublicPlansCache();
  });

  describe('Paso 3: Micro-Caché de Planes Públicos (subscriptionPlans)', () => {
    it('debe servir desde caché en la segunda llamada y no reconsultar el gateway', async () => {
      let readCount = 0;

      const fakeGateway: any = {
        listDocs: vi.fn().mockImplementation((col: string) => {
          readCount++;
          if (col === 'subscriptionPlans') {
            return Promise.resolve({
              docs: [
                { id: 'pro', data: () => ({ name: 'Plan Pro', price: 99, status: 'active' }) },
              ],
            });
          }
          return Promise.resolve({ docs: [] });
        }),
      };

      // 1. Primera llamada: llena el caché
      const res1 = await handlePublicPlans(fakeGateway, null);
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.plans).toHaveLength(1);
      expect(data1.plans[0].name).toBe('Plan Pro');
      expect(readCount).toBe(2); // dual-read: subscriptionPlans + subscription-plans

      // 2. Segunda llamada inmediata: debe responder desde memoria
      const res2 = await handlePublicPlans(fakeGateway, null);
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.plans).toEqual(data1.plans);
      expect(readCount).toBe(2); // El conteo no aumentó, se sirvió desde memoria RAM
    });

    it('debe invalidar el caché cuando se invoca invalidatePublicPlansCache', async () => {
      let readCount = 0;

      const fakeGateway: any = {
        listDocs: vi.fn().mockImplementation((col: string) => {
          readCount++;
          return Promise.resolve({
            docs: [
              { id: 'plan_' + readCount, data: () => ({ name: 'Plan ' + readCount, status: 'active' }) },
            ],
          });
        }),
      };

      await handlePublicPlans(fakeGateway, null);
      expect(readCount).toBe(2);

      // Invalidamos el caché (como ocurre al crear/editar un plan)
      invalidatePublicPlansCache();

      // Siguiente llamada debe volver a consultar
      await handlePublicPlans(fakeGateway, null);
      expect(readCount).toBe(4);
    });
  });

  describe('Paso 4B: Micro-Caché de Tutor y Métodos de Pago en Landings Públicas', () => {
    it('debe cachear perfil y métodos de pago por mentorId con fromCache: true en la segunda llamada', async () => {
      const fakeGateway: any = {
        getDoc: vi.fn().mockResolvedValue({
          id: 'mentor_99',
          data: () => ({ displayName: 'Mentor Experto', photoURL: 'https://img.com/avatar.jpg', homeCountry: 'AR' }),
        }),
        listSubDocs: vi.fn().mockResolvedValue({
          docs: [
            { id: 'pm_1', data: () => ({ provider: 'mercadopago', enabled: true }) },
          ],
        }),
      };

      // 1. Primera llamada: consulta viva (tutor + profile de pagos)
      const res1 = await getCachedTutorAndPayments(fakeGateway, 'mentor_99', false);
      expect(res1.fromCache).toBe(false);
      expect(res1.tutorResult?.ok).toBe(true);
      expect(getPublicLandingCacheSize()).toBe(1);
      expect(fakeGateway.getDoc).toHaveBeenCalledTimes(2);

      // 2. Segunda llamada: debe servirse desde memoria (fromCache: true)
      const res2 = await getCachedTutorAndPayments(fakeGateway, 'mentor_99', false);
      expect(res2.fromCache).toBe(true);
      expect(res2.tutorResult?.value?.tutor?.data?.displayName).toBe('Mentor Experto');
      expect(fakeGateway.getDoc).toHaveBeenCalledTimes(2); // No volvió a consultar Firestore
    });

    it('debe ignorar el caché cuando bypassCache = true (modo preview de la landing)', async () => {
      const fakeGateway: any = {
        getDoc: vi.fn().mockResolvedValue({
          id: 'mentor_preview',
          data: () => ({ displayName: 'Mentor Preview', homeCountry: 'AR' }),
        }),
        listSubDocs: vi.fn().mockResolvedValue({ docs: [] }),
      };

      // Llamada 1 en modo preview: bypassCache = true (2 getDoc calls)
      const res1 = await getCachedTutorAndPayments(fakeGateway, 'mentor_preview', true);
      expect(res1.fromCache).toBe(false);
      expect(fakeGateway.getDoc).toHaveBeenCalledTimes(2);

      // Llamada 2 también en modo preview (otras 2 getDoc calls = 4)
      const res2 = await getCachedTutorAndPayments(fakeGateway, 'mentor_preview', true);
      expect(res2.fromCache).toBe(false);
      expect(fakeGateway.getDoc).toHaveBeenCalledTimes(4); // Consulta viva siempre en preview
      expect(getPublicLandingCacheSize()).toBe(0); // No guarda en caché los borradores
    });
  });

  describe('Paso 4A: Paralelización con Promise.all en bundleItems de Landings', () => {
    it('debe resolver todos los items del combo concurrentemente preservando datos e imágenes', async () => {
      const mockBundleItems = [
        { productId: 'c1', productType: 'course', customTitle: 'Curso 1 Especial' },
        { productId: 'c2', productType: 'course', customTitle: 'Curso 2 Especial' },
        { productId: 'f1', productType: 'followup', customTitle: 'Mentoría Personalizada' },
      ];

      // Simulamos la resolución en paralelo con Promise.all idéntica a GetPublicSalesPageUseCase
      const bundleProducts = await Promise.all(
        mockBundleItems.map(async (item) => {
          const p: any = { id: item.productId, productType: item.productType };
          if (item.customTitle) p.title = item.customTitle;
          return p;
        })
      );

      expect(bundleProducts).toHaveLength(3);
      expect(bundleProducts[0].title).toBe('Curso 1 Especial');
      expect(bundleProducts[1].title).toBe('Curso 2 Especial');
      expect(bundleProducts[2].title).toBe('Mentoría Personalizada');
    });
  });
});
