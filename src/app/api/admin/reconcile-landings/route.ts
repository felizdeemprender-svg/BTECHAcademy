import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import { authenticateCaller } from '@/lib/api/mentor-auth';
import { isAffiliateLanding, getEffectiveLandingStatus } from '@/domain/sales-pages/landing-lifecycle';

/**
 * POST /api/admin/reconcile-landings
 * Endpoint administrativo para reconciliar y normalizar el ciclo de vida de landings en Testing y Producción.
 * 
 * Acciones:
 * 1. Garantiza la regla de exactamente 1 landing activa por curso/producto en el canal oficial del tutor.
 *    Si un curso preexistente tiene múltiples landings con isActive=true, conserva la mejor (promoción vigente
 *    o la más reciente) y degrada las duplicadas a status='pendiente' e isActive=false.
 * 2. Normaliza el campo 'status' en documentos legacy que tengan 'published' o carezcan del campo.
 */
export async function POST(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller || !caller.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const snap = await adminDb.collection('salesPages').get();
    const docs = snap.docs;

    const updates: { id: string; data: Record<string, unknown>; reason: string }[] = [];
    const groupedByMentorAndProduct: Record<string, any[]> = {};

    for (const doc of docs) {
      const data = doc.data();
      const pageId = doc.id;
      const page = { id: pageId, ...data } as any;

      // Normalizar status en documentos legacy
      if (!data.status || data.status === 'published') {
        const isCurrentlyActive = data.isActive === true;
        updates.push({
          id: pageId,
          data: {
            status: isCurrentlyActive ? 'activa' : 'pendiente',
            isActive: isCurrentlyActive,
          },
          reason: 'legacy_status_normalization',
        });
        page.status = isCurrentlyActive ? 'activa' : 'pendiente';
      }

      // Agrupar solo landings del canal oficial (no embajadores)
      if (!isAffiliateLanding(page) && page.type !== 'campaign_pack' && page.type !== 'campaign_videos') {
        const mentorId = page.mentorId || 'unknown';
        const targetId = page.courseId || page.productId || pageId;
        const groupKey = `${mentorId}_${targetId}`;

        if (!groupedByMentorAndProduct[groupKey]) {
          groupedByMentorAndProduct[groupKey] = [];
        }
        groupedByMentorAndProduct[groupKey].push(page);
      }
    }

    // Identificar y resolver duplicados de activas por producto
    const demotedPageIds: string[] = [];

    for (const [groupKey, pages] of Object.entries(groupedByMentorAndProduct)) {
      const activePages = pages.filter((p) => getEffectiveLandingStatus(p) === 'activa');

      if (activePages.length > 1) {
        // Ordenar para elegir la autoritativa: promoción vigente primero, luego la más reciente por createdAt
        activePages.sort((a, b) => {
          const isPromoA = a.landingType === 'promocion';
          const isPromoB = b.landingType === 'promocion';
          if (isPromoA && !isPromoB) return -1;
          if (!isPromoA && isPromoB) return 1;

          const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
          const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });

        // La primera [0] se conserva activa. Las demás se degradan a 'pendiente'
        const authoritative = activePages[0];
        const toDemote = activePages.slice(1);

        for (const demoted of toDemote) {
          demotedPageIds.push(demoted.id);
          updates.push({
            id: demoted.id,
            data: {
              status: 'pendiente',
              isActive: false,
            },
            reason: `duplicate_active_for_product_${groupKey}_kept_${authoritative.id}`,
          });
        }
      }
    }

    // Ejecutar actualizaciones en batches de 450 (límite de Firestore es 500)
    let appliedUpdatesCount = 0;
    const chunkSize = 450;

    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      const batch = adminDb.batch();

      for (const item of chunk) {
        const ref = adminDb.collection('salesPages').doc(item.id);
        batch.set(ref, item.data, { merge: true });
        appliedUpdatesCount++;
      }

      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      totalExamined: docs.length,
      totalUpdates: appliedUpdatesCount,
      demotedDuplicatesCount: demotedPageIds.length,
      demotedPageIds,
      details: updates.map((u) => ({ id: u.id, reason: u.reason })),
    });
  } catch (error: any) {
    console.error('[Admin Reconcile Landings] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
