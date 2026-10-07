import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/firebase/admin';
import { enqueueVideoTask } from '@/lib/cloud-tasks';

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

    const body = await req.json();
    const { campaignId, assets, targetAudience, campaignMission, googleToken, coordinationPlan } = body;

    if (!campaignId || !assets) {
      return NextResponse.json({ success: false, error: 'Faltan parámetros' }, { status: 400 });
    }

    console.log(`[DraftCampaign] Orquestando redacción de borradores para campaña: ${campaignId}`);
    
    await enqueueVideoTask({
      action: 'draft-full-campaign',
      campaignId,
      courseId: campaignId,
      assets,
      uid: decoded.uid,
      role: decoded.role || 'mentor',
      data: {
        ...assets,
        googleToken
      },
      targetAudience,
      campaignMission,
      coordinationPlan
    });

    return NextResponse.json({ success: true, message: 'Borradores encolados en Cloud Tasks' });

  } catch (error: any) {
    console.error('🔥 [DraftCampaign] Error orquestando campaña:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
