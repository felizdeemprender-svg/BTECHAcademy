import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';

/**
 * GET /api/video/job-status?id=job_v2_123456
 * Retorna el estado actual del job de renderizado desde Firestore.
 * El frontend puede hacer polling a este endpoint cada 3 segundos,
 * o usar onSnapshot de Firebase directamente para tiempo real.
 */
export async function GET(req: NextRequest) {
  try {
    const jobId = req.nextUrl.searchParams.get('id');
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Falta el parámetro ?id=' }, { status: 400 });
    }

    const docSnap = await adminDb.collection('video_jobs').doc(jobId).get();
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Job no encontrado.' }, { status: 404 });
    }

    const data = docSnap.data()!;

    // HACK: Firebase App Hosting (Cloud Run) asfixia el CPU a 0 cuando no hay peticiones activas.
    // Como el renderizado ocurre en segundo plano (Fire & Forget), necesitamos mantener el contenedor "despierto".
    // Al hacer que este endpoint de polling demore 3 segundos en responder, le obligamos al servidor
    // a mantener el CPU asignado al 100%, permitiendo que FFmpeg trabaje a máxima velocidad.
    if (data.status === 'processing' || data.status === 'pending') {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: data.status,       // 'pending' | 'processing' | 'completed' | 'failed'
      progress: data.progress,   // 0–100
      stage: data.stage,         // Texto descriptivo del paso actual
      result: data.result || null,  // { webViewLink, driveId, downloadUrl } si está 'completed'
      error: data.error || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });

  } catch (err: any) {
    console.error('[Job Status] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
