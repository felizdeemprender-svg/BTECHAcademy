import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, adminDb } from '@/firebase/admin';
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
    const { campaignId, autoGenerateImages = true, avgScenesPerPiece = 4 } = body;

    let targetPieceCount = Number(body.pieceCount) || 0;
    let completedPieces = 0;
    let pendingPieces = 0;
    let campaignTitle = '';

    if (campaignId) {
      const campDoc = await adminDb.collection('campaigns').doc(campaignId).get();
      if (!campDoc.exists) {
        return NextResponse.json({ success: false, error: 'Campaña no encontrada' }, { status: 404 });
      }
      const data = campDoc.data() || {};
      campaignTitle = data.title || data.name || '';
      const skeletons = (data.videoSkeletons || data.aiContent?.socials || []) as Array<Record<string, unknown>>;
      const completed = skeletons.filter((s) => s.isGenerated === true);
      const pending = skeletons.filter((s) => !s.isGenerated);

      completedPieces = completed.length;
      pendingPieces = pending.length;
      // Si la campaña ya tiene esqueletos, estimamos solo sobre las piezas que faltan por generar
      targetPieceCount = pendingPieces > 0 ? pendingPieces : skeletons.length;
    }

    if (targetPieceCount <= 0) {
      targetPieceCount = 21; // fallback por defecto para embudos estándar
    }

    // Consultar saldo real de créditos del usuario
    const creditsCheck = await checkSufficientCredits(decoded.uid, 0, decoded.role || 'mentor');
    const currentBalance = creditsCheck.balance || 0;

    const estimate = estimateCampaignBudget({
      pieceCount: targetPieceCount,
      autoGenerateImages: autoGenerateImages !== false,
      avgScenesPerPiece: avgScenesPerPiece || 4,
      currentBalance,
      role: decoded.role || 'mentor',
    });

    return NextResponse.json({
      success: true,
      campaignId: campaignId || null,
      campaignTitle: campaignTitle || null,
      completedPieces,
      pendingPieces,
      estimate,
    });
  } catch (error: any) {
    console.error('🔥 [EstimateCampaignBudget] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error interno' }, { status: 500 });
  }
}
