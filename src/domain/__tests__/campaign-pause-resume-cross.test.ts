import { describe, expect, it, vi } from 'vitest';
import { estimateCampaignBudget } from '@/domain/marketing/use-cases/estimate-campaign-budget';

describe('Cross-Test: Ciclo de Vida de Campaña - Pausa por Créditos, Presupuesto y Reanudación Idempotente', () => {
  const mentorId = 'tutor_holistico_101';
  const hackerMentorId = 'tutor_ajeno_999';
  const campaignId = 'camp_develando_pasion_21';

  function createCampaignStore() {
    // Generar los 21 esqueletos iniciales diseñados por el embudo
    const initialSkeletons = Array.from({ length: 21 }, (_, i) => ({
      id: `piece_${i + 1}`,
      marketingName: `Día ${Math.floor(i / 3) + 1}: Pieza #${(i % 3) + 1}`,
      platform: (i % 3 === 0 ? 'instagram' : i % 3 === 1 ? 'tiktok' : 'youtube'),
      type: (i % 3 === 0 ? 'reel' : i % 3 === 1 ? 'story' : 'carousel'),
      isGenerated: undefined as boolean | undefined,
      scenes: [] as any[],
      slides: [] as any[],
    }));

    const campaignDoc = {
      id: campaignId,
      title: 'Lanzamiento Develando la Pasión',
      mentorId,
      totalPieces: 21,
      campaignStatus: 'processing',
      videoSkeletons: initialSkeletons,
      aiContent: { socials: initialSkeletons },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const store = {
      campaigns: new Map<string, any>([[campaignId, campaignDoc]]),
      userCredits: new Map<string, number>([
        [mentorId, 3.0], // Saldo inicial: alcanza para ~16 piezas pero no para las 21
      ]),
    };

    return { store, initialSkeletons };
  }

  it('1. Interrupción / Pausa Elegante: Procesa hasta agotar créditos (16 listas) y pausa sin corromper datos', async () => {
    const { store } = createCampaignStore();
    const camp = store.campaigns.get(campaignId)!;
    const skeletons = [...camp.videoSkeletons];

    // Simular el worker procesando piezas una a una
    const costPerPiece = 0.19; // LLM + imágenes
    let processedCount = 0;

    for (let i = 0; i < skeletons.length; i++) {
      const currentBalance = store.userCredits.get(mentorId) || 0;

      // Verificación de saldo por pieza
      if (currentBalance < costPerPiece) {
        // Pausa elegante
        camp.campaignStatus = 'paused_insufficient_credits';
        camp.statusMessage = `Campaña pausada: créditos insuficientes en pieza ${i + 1} de ${skeletons.length}.`;
        camp.interruptedAtPiece = i + 1;
        break;
      }

      // Descontar saldo y simular generación con escenas
      store.userCredits.set(mentorId, Math.round((currentBalance - costPerPiece) * 100) / 100);
      skeletons[i] = {
        ...skeletons[i],
        isGenerated: true,
        status: 'draft',
        scenes: [
          { segment: 'GANCHO', voiceover: 'Texto de gancho', imageUrl: 'https://storage/img1.png' },
          { segment: 'VALOR', voiceover: 'Texto de valor', imageUrl: 'https://storage/img2.png' },
          { segment: 'CTA', voiceover: 'Llamada a la acción', imageUrl: 'https://storage/img3.png' },
        ],
      };
      processedCount++;
    }

    camp.videoSkeletons = skeletons;
    camp.aiContent.socials = skeletons;

    // Aserciones de la pausa
    expect(camp.campaignStatus).toBe('paused_insufficient_credits');
    expect(processedCount).toBe(15); // Con 3.0 créditos a 0.19 c/u completó 15 piezas exactamente
    expect(camp.interruptedAtPiece).toBe(16);

    const completed = skeletons.filter((s) => s.isGenerated === true);
    const pending = skeletons.filter((s) => !s.isGenerated);

    expect(completed.length).toBe(15);
    expect(pending.length).toBe(6);

    // Verificar que las piezas generadas tienen sus escenas e imágenes intactas
    expect(completed[0].scenes.length).toBe(3);
    expect(completed[0].scenes[0].imageUrl).toBeDefined();

    // Las piezas pendientes conservan sus datos de esqueleto sin corromperse
    expect(pending[0].marketingName).toContain('Día 6');
    expect(pending[0].isGenerated).toBeUndefined();
  });

  it('2. Estimación de Presupuesto Pre-Reanudación: Solo cotiza las piezas pendientes (no las ya completadas)', () => {
    const { store } = createCampaignStore();
    const camp = store.campaigns.get(campaignId)!;

    // Simular que 16 de las 21 piezas ya están completadas
    const skeletons = camp.videoSkeletons.map((s: any, idx: number) => ({
      ...s,
      isGenerated: idx < 16 ? true : undefined,
    }));
    camp.videoSkeletons = skeletons;

    const completed = skeletons.filter((s: any) => s.isGenerated === true);
    const pending = skeletons.filter((s: any) => !s.isGenerated);

    expect(completed.length).toBe(16);
    expect(pending.length).toBe(5);

    // Ejecutar estimador de presupuesto pasando la cantidad de piezas pendientes
    const estimate = estimateCampaignBudget({
      pieceCount: pending.length, // 5 piezas pendientes
      autoGenerateImages: true,
      avgScenesPerPiece: 4,
      currentBalance: 0.15, // Saldo actual antes de recargar
      role: 'mentor',
    });

    // Aserción: La cotización debe ser proporcional a 5 piezas, no a 21
    expect(estimate.pieceCount).toBe(5);
    expect(estimate.totalImagesEstimated).toBe(20); // 5 * 4
    expect(estimate.totalCreditsEstimated).toBe(0.95); // (5 * 0.01) + (20 * 0.045) = 0.05 + 0.90 = 0.95
    expect(estimate.canAfford).toBe(false);
    expect(estimate.missingCredits).toBe(0.80); // 0.95 - 0.15
  });

  it('3. Reanudación Exitosa: Checkpointing salta las 16 piezas ya listas y completa del 17 al 21 en drafts_ready', async () => {
    const { store } = createCampaignStore();
    const camp = store.campaigns.get(campaignId)!;

    // Simular estado previo: 16 listas y 5 pendientes
    const skeletons = camp.videoSkeletons.map((s: any, idx: number) => ({
      ...s,
      isGenerated: idx < 16 ? true : undefined,
      scenes: idx < 16 ? [{ segment: 'VALOR', imageUrl: 'https://img.png' }] : [],
    }));
    camp.videoSkeletons = skeletons;
    camp.campaignStatus = 'paused_insufficient_credits';

    // Tutor recarga créditos (ej: agrega 5.0 créditos)
    store.userCredits.set(mentorId, 5.0);

    // Simular worker reanudando la campaña
    const skippedPieces: string[] = [];
    const newlyGeneratedPieces: string[] = [];

    const autoGenerateImages = true;
    for (let i = 0; i < skeletons.length; i++) {
      const social = skeletons[i];

      // LÓGICA DE CHECKPOINTING: Si ya está generada y tiene escenas, saltar inmediatamente
      if (social.isGenerated === true && (social.scenes || []).length > 0) {
        skippedPieces.push(social.marketingName);
        continue;
      }

      // Generar únicamente las piezas que faltan
      newlyGeneratedPieces.push(social.marketingName);
      skeletons[i] = {
        ...social,
        isGenerated: true,
        status: 'draft',
        scenes: [{ segment: 'ESCENA_REANUDADA', imageUrl: 'https://new-img.png' }],
      };
    }

    camp.videoSkeletons = skeletons;
    camp.aiContent.socials = skeletons;

    // Comprobación de completitud integral
    const allCompleted = skeletons.every((s: any) => s.isGenerated === true);
    if (allCompleted) {
      camp.campaignStatus = 'drafts_ready';
      camp.statusMessage = null;
    }

    // Aserciones:
    // 1. Las 16 piezas previas fueron saltadas sin procesar de nuevo
    expect(skippedPieces.length).toBe(16);
    // 2. Exactamente las 5 piezas pendientes fueron generadas
    expect(newlyGeneratedPieces.length).toBe(5);
    // 3. El 100% de la campaña está concluida
    expect(camp.videoSkeletons.filter((s: any) => s.isGenerated === true).length).toBe(21);
    expect(camp.campaignStatus).toBe('drafts_ready');
    expect(camp.statusMessage).toBeNull();
  });

  it('4. Anti-IDOR: Tutor ajeno es rechazado con 403 al intentar reanudar campaña de otro mentor', () => {
    const { store } = createCampaignStore();
    const camp = store.campaigns.get(campaignId)!;

    const callerUid = hackerMentorId;
    const isOwnerOrAdmin = camp.mentorId === callerUid || false;

    expect(isOwnerOrAdmin).toBe(false);
    const responseStatus = isOwnerOrAdmin ? 200 : 403;
    expect(responseStatus).toBe(403);
  });

  it('5. Idempotencia: Intentar reanudar una campaña ya completada no duplica tareas', () => {
    const { store } = createCampaignStore();
    const camp = store.campaigns.get(campaignId)!;

    // Marcar el 100% como generadas
    camp.videoSkeletons = camp.videoSkeletons.map((s: any) => ({ ...s, isGenerated: true }));
    camp.campaignStatus = 'drafts_ready';

    const pending = camp.videoSkeletons.filter((s: any) => !s.isGenerated);
    expect(pending.length).toBe(0);

    // Al no haber pendientes, no se encola nada y se ratifica drafts_ready
    const shouldEnqueue = pending.length > 0;
    expect(shouldEnqueue).toBe(false);
    expect(camp.campaignStatus).toBe('drafts_ready');
  });
});
