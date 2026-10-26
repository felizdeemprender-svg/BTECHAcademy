import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import { RenderRequest, runRenderJob } from '@/lib/video/render-job';

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT POST: Recibe la solicitud y encola el trabajo
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    let rawText = '';
    try {
      rawText = await req.text();
    } catch (readErr: any) {
      console.error('🔥 [Render V2] Error al leer el cuerpo del request:', readErr.message);
      return NextResponse.json(
        { success: false, error: 'No se pudo leer el cuerpo de la petición HTTP.' },
        { status: 400 }
      );
    }

    if (!rawText || !rawText.trim()) {
      console.warn('⚠️ [Render V2] Request POST recibido con body vacío. Headers:', {
        contentType: req.headers.get('content-type'),
        contentLength: req.headers.get('content-length'),
        referer: req.headers.get('referer'),
        origin: req.headers.get('origin'),
        userAgent: req.headers.get('user-agent'),
      });
      return NextResponse.json(
        { success: false, error: 'El cuerpo de la petición está vacío. Se requiere un objeto JSON con "scenes".' },
        { status: 400 }
      );
    }

    let body: RenderRequest;
    try {
      body = JSON.parse(rawText);
    } catch (jsonErr: any) {
      console.error('🔥 [Render V2] Error de sintaxis JSON al parsear body:', jsonErr.message, 'Raw recibido (120 chars):', rawText.slice(0, 120));
      return NextResponse.json(
        { success: false, error: `JSON malformado o incompleto: ${jsonErr.message}` },
        { status: 400 }
      );
    }

    // Extraer UID del usuario desde las cookies para facturación/tracking
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const uid = cookieStore.get('btech_uid')?.value || body.uid || '';
    const role = cookieStore.get('btech_role')?.value || body.role || 'alumno';

    if (!body.scenes || body.scenes.length === 0) {
      return NextResponse.json({ success: false, error: 'No hay escenas para renderizar.' }, { status: 400 });
    }

    const jobId = body.jobId || `job_v2_${Date.now()}`;

    // Crear el ticket en Firestore ANTES de responder al cliente
    await adminDb.collection('video_jobs').doc(jobId).set({
      jobId,
      uid,
      role,
      status: 'pending',
      progress: 0,
      stage: 'En cola...',
      isCarousel: body.isCarousel || false,
      marketingName: body.marketingName || 'Video',
      sceneCount: body.scenes.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      result: null,
      error: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // TTL 7 días
    });

    // ── Encolar proceso hacia el Worker (o Cloud Tasks) ──────────────────────
    // Para evitar CPU Throttling en Cloud Run, delegamos la ejecución pesada
    // al endpoint /api/video/worker, el cual mantiene la conexión HTTP abierta
    // asegurando el 100% de CPU durante todo el renderizado de FFmpeg.
    const { enqueueVideoTask } = await import('@/lib/cloud-tasks');
    enqueueVideoTask({
      action: 'render-v2',
      jobId,
      renderRequest: { ...body, uid, role }
    }).catch(taskErr => {
      console.warn(`[Render V2] Falló despacho hacia worker vía Cloud Tasks / HTTP (${taskErr?.message}). Ejecutando fallback local...`);
      runRenderJob(jobId, { ...body, uid, role }).catch(e =>
        console.error(`[JobQueue] Uncaught error en fallback local para job ${jobId}:`, e)
      );
    });

    // Responder inmediatamente al cliente con el ID del ticket
    return NextResponse.json({
      success: true,
      jobId,
      status: 'pending',
      message: 'El renderizado fue encolado. Escucha el jobId en Firestore para obtener el resultado.'
    });

  } catch (err: any) {
    console.error('🔥 [Render V2] Error al encolar job:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
