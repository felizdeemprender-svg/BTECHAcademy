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

    console.log(`[AutoCampaign] Orquestando generación automática para campaña: ${campaignId}`);
    console.log(`[AutoCampaign] Estrategia: ${campaignMission}, Audiencia: ${targetAudience}`);
    console.log(`[AutoCampaign] Google Token recibido desde UI:`, !!googleToken);

    // Si hay videos sociales para renderizar, los encolamos.
    // Iteramos sobre todos los socials y creamos una tarea por cada uno,
    // o enviamos toda la campaña para que el Worker la procese entera.
    // Aquí delegamos TODO el trabajo al worker con una acción maestra.
    
    await enqueueVideoTask({
      action: 'generate-full-campaign',
      campaignId,
      courseId: campaignId,
      assets,
      uid: decoded.uid,
      role: decoded.role || 'mentor',
      data: {
        ...assets,
        googleToken // Pasa el token para el guardado en Drive
      },
      targetAudience,
      campaignMission,
      coordinationPlan
    });

    return NextResponse.json({ success: true, message: 'Campaña encolada en Cloud Tasks' });

  } catch (error: any) {
    console.error('🔥 [AutoCampaign] Error orquestando campaña:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
