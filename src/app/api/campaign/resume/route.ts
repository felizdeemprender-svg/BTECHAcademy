import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, adminDb } from '@/firebase/admin';
import { enqueueVideoTask } from '@/lib/cloud-tasks';
import { checkSufficientCredits } from '@/lib/payments/credits';
import { estimateCampaignBudget } from '@/domain/marketing/use-cases/estimate-campaign-budget';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await getAdminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { campaignId, autoGenerateImages = true } = body;

    if (!campaignId) {
      return NextResponse.json({ success: false, error: 'Falta parámetro campaignId' }, { status: 400 });
    }

    const campRef = adminDb.collection('campaigns').doc(campaignId);
    const campDoc = await campRef.get();

    if (!campDoc.exists) {
      return NextResponse.json({ success: false, error: 'Campaña no encontrada' }, { status: 404 });
    }

    const campData = campDoc.data() || {};
    const mentorId = campData.mentorId || campData.uid;

    if (mentorId && mentorId !== decoded.uid && decoded.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado para esta campaña' }, { status: 403 });
    }

    const skeletons = (campData.videoSkeletons || campData.aiContent?.socials || []) as Array<Record<string, unknown>>;
    const completed = skeletons.filter((s) => s.isGenerated === true);
    const pending = skeletons.filter((s) => !s.isGenerated);

    if (pending.length === 0 && skeletons.length > 0) {
      await campRef.update({
        campaignStatus: 'drafts_ready',
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({
        success: true,
        message: 'Todas las piezas ya se encuentran generadas',
        completedPieces: skeletons.length,
        pendingPieces: 0,
        totalPieces: skeletons.length,
      });
    }

    // Comprobación de saldo de créditos para las piezas pendientes
    const creditsCheck = await checkSufficientCredits(decoded.uid, 0, decoded.role || 'mentor');
    const currentBalance = creditsCheck.balance || 0;

    const estimate = estimateCampaignBudget({
      pieceCount: pending.length || 1,
      autoGenerateImages: autoGenerateImages !== false,
      avgScenesPerPiece: 4,
      currentBalance,
      role: decoded.role || 'mentor',
    });

    if (!estimate.canAfford) {
      await campRef.update({
        campaignStatus: 'paused_insufficient_credits',
        statusMessage: `Pausado: requiere ${estimate.missingCredits} créditos adicionales para completar las ${pending.length} piezas restantes.`,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'insufficient_credits',
          message: 'Créditos insuficientes para completar las piezas restantes',
          estimate,
          completedPieces: completed.length,
          pendingPieces: pending.length,
          totalPieces: skeletons.length,
        },
        { status: 402 }
      );
    }

    // Actualizar estado a processing
    await campRef.update({
      campaignStatus: 'processing',
      statusMessage: `Reanudando generación: procesando ${pending.length} piezas pendientes (${completed.length} ya completadas).`,
      updatedAt: new Date().toISOString(),
    });

    const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const forwardedProto = req.headers.get('x-forwarded-proto') || (forwardedHost.includes('localhost') ? 'http' : 'https');
    const requestOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : req.nextUrl.origin;

    const campaignLanguage = campData.language || 'es-AR';

    await enqueueVideoTask({
      action: 'draft-full-campaign',
      origin: requestOrigin,
      campaignId,
      courseId: campData.courseId || campaignId,
      assets: {
        socials: skeletons,
        language: campaignLanguage,
      },
      uid: decoded.uid,
      role: decoded.role || 'mentor',
      language: campaignLanguage,
      data: {
        socials: skeletons,
        language: campaignLanguage,
        autoGenerateImages: autoGenerateImages !== false,
      },
      targetAudience: campData.targetAudience,
      campaignMission: campData.strategyType || campData.campaignMission || 'venta',
      coordinationPlan: campData.campaignStrategy || campData.strategy,
      autoGenerateImages: autoGenerateImages !== false,
    });

    return NextResponse.json({
      success: true,
      message: 'Reanudación encolada exitosamente',
      completedPieces: completed.length,
      pendingPieces: pending.length,
      totalPieces: skeletons.length,
    });
  } catch (error: any) {
    console.error('🔥 [ResumeCampaign] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error interno' }, { status: 500 });
  }
}
