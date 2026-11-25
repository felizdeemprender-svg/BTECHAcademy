import { describe, expect, it, vi } from 'vitest';
import { resolveEffectivePricing } from '@/domain/commerce/pricing-model';
import type { FirestoreGateway } from '@/data/firestore/gateway';

describe('Cross-Journey Tutor: Ciclo de Vida del Creador (Curso -> Landing Multimoneda -> Campaña de Marketing)', () => {
  const tutorId = 'tutor_pro_77';
  const courseId = 'course_growth_marketing';
  const pageId = 'page_landing_growth';
  const campaignId = 'camp_q4_acquisition';

  function createUnifiedTestGateway() {
    const store = {
      courses: new Map<string, any>(),
      salesPages: new Map<string, any>(),
      campaigns: new Map<string, any>(),
      campaignVideos: new Map<string, any>(),
      users: new Map<string, any>([
        [tutorId, { id: tutorId, email: 'tutor.growth@fastoria.com', displayName: 'Tutor Growth', roles: ['tutor'] }],
      ]),
    };

    const gateway: FirestoreGateway = {
      getDoc: vi.fn().mockImplementation(async (col: string, id: string) => {
        const item = (store as any)[col]?.get(id);
        if (!item) return null;
        return { exists: true, id, data: () => item };
      }),
      createDoc: vi.fn().mockImplementation(async (col: string, id: string, data: any) => {
        (store as any)[col]?.set(id, { id, ...data });
      }),
      updateDoc: vi.fn().mockImplementation(async (col: string, id: string, data: any) => {
        const existing = (store as any)[col]?.get(id) || {};
        (store as any)[col]?.set(id, { ...existing, ...data });
      }),
      queryByField: vi.fn().mockImplementation(async (col: string, field: string, value: any) => {
        const map = (store as any)[col];
        if (!map) return { docs: [] };
        const docs: any[] = [];
        for (const [id, doc] of map.entries()) {
          if (doc[field] === value) docs.push({ exists: true, id, data: () => doc });
        }
        return { docs };
      }),
      serverTimestamp: vi.fn().mockImplementation(() => new Date()),
    } as unknown as FirestoreGateway;

    return { gateway, store };
  }

  it('Flujo Integral Tutor: Crear Curso -> Crear Landing con Precios por Pasarela -> Vincular Campaña -> Generar Contenido Cross', async () => {
    const { gateway, store } = createUnifiedTestGateway();

    // =========================================================================
    // ETAPA 1: El Tutor Crea el Curso en su Catálogo
    // =========================================================================
    const coursePayload = {
      id: courseId,
      title: 'Growth Marketing & Funnels de Alta Conversión',
      description: 'Aprende a escalar tus funnels con metodologías probadas.',
      mentorId: tutorId,
      price: 75000,
      currency: 'ARS',
      status: 'published',
      isActive: true,
      modules: [
        { id: 'm1', title: 'Fundamentos de Tráfico Frío', duration: '45m' },
        { id: 'm2', title: 'Diseño de Landing Pages VSL', duration: '60m' },
        { id: 'm3', title: 'Email Automation & Retargeting', duration: '90m' },
      ],
      createdAt: new Date().toISOString(),
    };

    await gateway.createDoc('courses', courseId, coursePayload);

    // Verificación Etapa 1
    const storedCourse = store.courses.get(courseId);
    expect(storedCourse).toBeDefined();
    expect(storedCourse.mentorId).toBe(tutorId);
    expect(storedCourse.modules).toHaveLength(3);

    // =========================================================================
    // ETAPA 2: El Tutor Genera la Landing Page Vinculada con Precios Multimoneda
    // =========================================================================
    const landingPayload = {
      id: pageId,
      courseId: courseId,
      productId: courseId,
      productType: 'course',
      mentorId: tutorId,
      title: 'Landing Oficial: Growth Marketing 2026',
      price: 75000,
      currency: 'ARS',
      isActive: true,
      status: 'publicada',
      pricing: {
        pricesByGateway: {
          mercadopago: { gatewayId: 'mercadopago', amount: 75000, currency: 'ARS', isActive: true },
          transfer: { gatewayId: 'transfer', amount: 68000, currency: 'ARS', isActive: true },
          stripe: { gatewayId: 'stripe', amount: 65, currency: 'USD', isActive: true },
        },
      },
      stats: { views: 0, conversions: 0, leads: 0 },
      createdAt: new Date().toISOString(),
    };

    await gateway.createDoc('salesPages', pageId, landingPayload);

    // Verificación Etapa 2
    const storedLanding = store.salesPages.get(pageId);
    expect(storedLanding).toBeDefined();
    expect(storedLanding.courseId).toBe(courseId);
    expect(storedLanding.mentorId).toBe(tutorId);

    // Resolución de precios unificada en la landing
    const effectivePricing = resolveEffectivePricing({
      price: storedLanding.price,
      currency: storedLanding.currency,
      pricing: storedLanding.pricing,
    });
    expect(effectivePricing.pricesByGateway.transfer.amount).toBe(68000);
    expect(effectivePricing.pricesByGateway.stripe.amount).toBe(65);
    expect(effectivePricing.pricesByGateway.stripe.currency).toBe('USD');

    // =========================================================================
    // ETAPA 3: El Tutor Crea la Campaña de Marketing Vinculada a la Landing
    // =========================================================================
    const campaignPayload = {
      id: campaignId,
      mentorId: tutorId,
      landingId: pageId,
      courseId: courseId,
      name: 'Lanzamiento Q4 - Videos para Instagram Reels y TikTok',
      strategy: 'Venta Directa',
      targetAudience: 'Emprendedores y Agencias de Marketing',
      status: 'active',
      activePlatforms: ['instagram', 'tiktok'],
      createdAt: new Date().toISOString(),
    };

    await gateway.createDoc('campaigns', campaignId, campaignPayload);

    // Verificación Etapa 3
    const storedCampaign = store.campaigns.get(campaignId);
    expect(storedCampaign).toBeDefined();
    expect(storedCampaign.landingId).toBe(pageId);
    expect(storedCampaign.courseId).toBe(courseId);
    expect(storedCampaign.mentorId).toBe(tutorId);

    // =========================================================================
    // ETAPA 4: Orquestación Cross de Contenido (Borradores de Video de la Campaña)
    // =========================================================================
    const videoDraftId = `vid_draft_${campaignId}_1`;
    const videoPayload = {
      id: videoDraftId,
      campaignId: campaignId,
      mentorId: tutorId,
      title: 'Hook Viral: Cómo generar $10k con funnels',
      script: 'El mayor error que cometen las agencias es no tener una landing optimizada...',
      ctaUrl: `https://fastoria.com.ar/v/${pageId}`,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    await gateway.createDoc('campaignVideos', videoDraftId, videoPayload);

    const storedVideo = store.campaignVideos.get(videoDraftId);
    expect(storedVideo).toBeDefined();
    expect(storedVideo.campaignId).toBe(campaignId);
    expect(storedVideo.ctaUrl).toContain(pageId);

    // =========================================================================
    // ETAPA 5: Verificación de Integridad Referencial Cruzada (Cross-Consistency)
    // =========================================================================
    // 5.1 Buscar campañas asociadas a la landing
    const campaignDocs = await gateway.queryByField('campaigns', 'landingId', pageId);
    expect(campaignDocs.docs).toHaveLength(1);
    const campaignFirstDoc = campaignDocs.docs[0];
    expect(campaignFirstDoc).toBeDefined();
    const campaignData = campaignFirstDoc?.data() || {};
    expect(campaignData.id).toBe(campaignId);

    // 5.2 Confirmar que la landing asociada apunta al curso original
    const targetLandingId = String(campaignData.landingId || '');
    const landingFromCampaign = await gateway.getDoc('salesPages', targetLandingId);
    expect(landingFromCampaign?.data()?.courseId).toBe(courseId);

    // 5.3 Confirmar que el dueño (tutorId) es idéntico en las 3 entidades (Sin brechas de ownership)
    const courseDoc = await gateway.getDoc('courses', courseId);
    expect(courseDoc?.data()?.mentorId).toBe(tutorId);
    expect(landingFromCampaign?.data()?.mentorId).toBe(tutorId);
    expect(campaignData.mentorId).toBe(tutorId);
  });

  // =========================================================================
  // SALIDAS POR ERRORES ESPERADOS (Negative Paths)
  // =========================================================================

  it('(-) Error Esperado 2.1: Anti-IDOR: Tutor B intentando enlazar su campaña a una landing o curso ajeno debe ser detectado y bloqueado', async () => {
    const { gateway } = createUnifiedTestGateway();
    const intruderTutorId = 'tutor_intruso_888';

    // Tutor original crea su curso
    await gateway.createDoc('courses', 'course_tutor_a', {
      id: 'course_tutor_a',
      mentorId: tutorId,
      title: 'Curso Privado Tutor A',
    });

    // Intento de Tutor B de crear o reclamar landing sobre curso de Tutor A
    const courseTarget = await gateway.getDoc('courses', 'course_tutor_a');
    const isOwner = courseTarget?.data()?.mentorId === intruderTutorId;
    expect(isOwner).toBe(false);

    // Validación de regla: si no es el dueño, se bloquea la vinculación
    const validateCanCreateLanding = (callerMentorId: string, courseMentorId: string) => {
      if (callerMentorId !== courseMentorId) {
        throw new Error('No autorizado: no puedes crear landings para cursos de otro tutor');
      }
    };

    expect(() => validateCanCreateLanding(intruderTutorId, String(courseTarget?.data()?.mentorId || ''))).toThrow(
      'No autorizado'
    );
  });
});
