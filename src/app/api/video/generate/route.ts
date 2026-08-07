import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import { loadAdnConfig } from '@/lib/adn-utils';
import { buildVideoPrompt, buildSceneExportPrompt } from '@/lib/ai/video-prompt';
import { generateOmniVideo, downloadOmniVideo, saveOmniBytes } from '@/lib/ai/gemini-omni';
import { generateLongVideo, downloadLongVideo } from '@/lib/ai/long-video';
import { generateAvatarVideo } from '@/lib/ai/avatar';
import { uploadToDrive, getOrCreateFolder } from '@/lib/drive-utils';

/**
 * POST /api/video/generate
 * Router del circuito de invocación (circuito-invocacion-video.md §1).
 * Recibe { avatar, formato, cursoId, engine?, adnId?, ... } → decide branch
 * (A FFmpeg / B Omni / C avatar / D export) → crea job en Firestore video_jobs
 * → lanza worker fire-and-forget → responde jobId en <100ms.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
type Engine = 'auto' | 'ffmpeg' | 'gemini-omni' | 'seedance' | 'avatar' | 'export' | 'long';
type Branch = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

interface GenerateRequest {
  cursoId: string;
  formato: string; // 9:16 | 1:1 | 16:9 | 4:5
  avatar: boolean | 'si' | 'no';
  engine?: Engine;
  adnId?: string;
  marketingName?: string;
  googleToken?: string;
  salesPageId?: string;
  avatarProvider?: 'heygen' | 'synthesia' | 'tavus';
  exportEngine?: 'seedance' | 'veo' | 'runway' | 'pika' | 'wan';
  scenes?: Array<{
    segment?: string;
    text?: string;
    subtitle?: string;
    voiceover?: string;
    watermark?: string;
    imageUrl?: string;
    duration?: number;
  }>;
  persona?: { enabled?: boolean; description?: string };
  subtitles?: boolean;
  enable_tts?: boolean;
  voiceId?: string;
  longDuration?: number; // segundos objetivo para engine 'long' (4–180)
  isSmokeTest?: boolean;
  uid?: string;
  role?: string;
}

const RESOLUTIONS: Record<string, string> = {
  '9:16': '1080x1920',
  '1:1': '1080x1080',
  '16:9': '1920x1080',
  '4:5': '1080x1350'
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Actualizar estado del job en Firestore
// ─────────────────────────────────────────────────────────────────────────────
async function updateJob(jobId: string, data: Record<string, any>) {
  try {
    await adminDb.collection('video_jobs').doc(jobId).update({
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('[Generate] Error actualizando job en Firestore:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DECISION ENGINE → branch
// ─────────────────────────────────────────────────────────────────────────────
function decideBranch(avatar: boolean, engine: Engine): Branch {
   if (engine === 'export') return 'D';
   if (engine === 'seedance') return 'E';
   if (engine === 'long') return 'F';
   if (avatar) return 'C';
   if (engine === 'gemini-omni') return 'B';
   return 'A'; // 'auto' | 'ffmpeg' → default FFmpeg
 }

// ─────────────────────────────────────────────────────────────────────────────
// DATOS DE VENTA (salesPages + courses) → landing data
// ─────────────────────────────────────────────────────────────────────────────
async function loadLandingData(cursoId: string, salesPageId?: string) {
  const landing: Record<string, any> = { courseTitle: '' };

  try {
    if (salesPageId) {
      const sp = await adminDb.collection('salesPages').doc(salesPageId).get();
      if (sp.exists) {
        const d = sp.data()!;
        landing.courseTitle = d.title || '';
        landing.price = typeof d.price === 'number' ? d.price : undefined;
        landing.oldPrice = typeof d.oldPrice === 'number' ? d.oldPrice : undefined;
        landing.ctaText = d.ctaText || d.cta || '';
        const until = d.activeUntil;
        landing.activeUntil = until?.toDate ? until.toDate().toISOString().slice(0, 10) : (typeof until === 'string' ? until : undefined);
      }
    } else {
      const snap = await adminDb.collection('salesPages')
        .where('courseId', '==', cursoId)
        .where('isActive', '==', true)
        .limit(1)
        .get();
      if (!snap.empty) {
        const d = snap.docs[0].data();
        landing.courseTitle = d.title || '';
        landing.price = typeof d.price === 'number' ? d.price : undefined;
        landing.oldPrice = typeof d.oldPrice === 'number' ? d.oldPrice : undefined;
        landing.ctaText = d.ctaText || d.cta || '';
        const until = d.activeUntil;
        landing.activeUntil = until?.toDate ? until.toDate().toISOString().slice(0, 10) : (typeof until === 'string' ? until : undefined);
      }
    }
  } catch (e) {
    console.warn('[Generate] No se pudo leer salesPages:', e);
  }

  // Título del curso como fallback
  if (!landing.courseTitle) {
    try {
      const c = await adminDb.collection('courses').doc(cursoId).get();
      if (c.exists) landing.courseTitle = c.data()?.title || landing.courseTitle || cursoId;
    } catch {}
  }
  if (!landing.courseTitle) landing.courseTitle = cursoId;

  return landing;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD SCENES DESDE EL ADN (para Branch A → render-v2)
// ─────────────────────────────────────────────────────────────────────────────
function buildScenesFromAdn(adn: any, width: number, height: number) {
  return (adn.slices || []).map((s: any) => ({
    imageUrl: s.imageUrl || `https://placehold.co/${width}x${height}/1e293b/ffffff.jpg?text=Escena`,
    text: s.text || '',
    subtitle: s.subtitle || '',
    watermark: s.watermark || '',
    voiceover: s.voiceover || s.text || '',
    segment_label: s.segment_label || 'VALOR',
    duration: Number(s.duration) || 5
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH A — FFmpeg (delega a render-v2 existente)
// ─────────────────────────────────────────────────────────────────────────────
async function runBranchA(jobId: string, body: GenerateRequest, adn: any) {
  await updateJob(jobId, { status: 'processing', progress: 5, stage: 'Cargando configuración ADN...', branch: 'A' });

  const [width, height] = (RESOLUTIONS[body.formato] || '1080x1920').split('x').map(Number);
  const scenes = buildScenesFromAdn(adn, width, height);

  const renderPayload = {
    jobId,
    scenes,
    resolution: RESOLUTIONS[body.formato] || '1080x1920',
    adnId: body.adnId || '01_CINEMA',
    audioUrl: adn.background_music_url,
    enable_tts: true,
    voice_id: adn.audio_engine?.voice_id || 'mateo',
    audioEffect: 'auto',
    marketingName: body.marketingName || 'EvoAssetV2',
    googleToken: body.googleToken,
    isSmokeTest: body.isSmokeTest,
    isCarousel: false
  };

  // Delegación interna (mismo patrón que smoke-test): render-v2 crea/actualiza el job
  const origin = process.env.APP_URL || `http://127.0.0.1:9002`;
  const res = await fetch(`${origin}/api/video/render-v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(renderPayload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Error al encolar render FFmpeg.');
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH B — Gemini Omni text-to-video (Centralizado en Genkit)
// ─────────────────────────────────────────────────────────────────────────────
async function runBranchB(jobId: string, body: GenerateRequest, adn: any, landing: any, uid: string, role: string) {
  const { generateVideoFlow } = await import('@/ai/flows/generate-video-flow');
  
  try {
    await generateVideoFlow({
      jobId,
      uid,
      role,
      adn,
      scenes: body.scenes,
      formato: body.formato || '9:16',
      marketingName: body.marketingName,
      audioUrl: (body as any).audioUrl,
      enable_tts: body.enable_tts !== false,
      isSmokeTest: body.isSmokeTest,
      googleToken: body.googleToken
    });
  } catch (err: any) {
    console.error('[Branch B Genkit] Error crítico:', err);
    await updateJob(jobId, { status: 'failed', progress: 0, stage: 'Error en flujo Genkit', error: err.message });
  }
}



// ─────────────────────────────────────────────────────────────────────────────
// BRANCH C — Avatar (HeyGen / Synthesia / Tavus)
// ─────────────────────────────────────────────────────────────────────────────
async function runBranchC(jobId: string, body: GenerateRequest, adn: any, landing: any) {
  await updateJob(jobId, { status: 'processing', progress: 5, stage: 'Preparando guion del avatar...', branch: 'C' });

  const result = await generateAvatarVideo({
    adn,
    landing,
    provider: body.avatarProvider,
    format: body.formato || '9:16'
  });

  if (result.sent) {
    await updateJob(jobId, { progress: 90, stage: 'Avatar generado por el proveedor...' });
  } else {
    await updateJob(jobId, { progress: 90, stage: 'Script-to-presenter listo (copiar/pegar en el proveedor)...' });
  }

  await updateJob(jobId, {
    status: 'completed',
    progress: 100,
    stage: 'Completado',
    result: {
      script: result.script,
      provider: result.provider,
      sent: result.sent,
      videoUri: result.videoUri || null
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH D — Export a proveedor externo (devuelve prompt, no video)
// ─────────────────────────────────────────────────────────────────────────────
async function runBranchD(jobId: string, body: GenerateRequest, adn: any, landing: any) {
  await updateJob(jobId, { status: 'processing', progress: 30, stage: 'Redactando prompt especializado...', branch: 'D' });

  const engine = body.exportEngine || 'seedance';

  if (body.scenes && body.scenes.length > 0) {
    // Multi-escena real: usa las escenas editadas por el usuario
    const result = buildSceneExportPrompt({
      adn,
      landing,
      format: body.formato || '9:16',
      engine,
      scenes: body.scenes,
      persona: body.persona,
      subtitles: body.subtitles,
      voiceId: body.voiceId,
      marketingName: body.marketingName
    });

    await updateJob(jobId, {
      status: 'completed',
      progress: 100,
      stage: 'Completado',
      result: { prompt: result.prompt, perScene: result.perScene, engine, formato: body.formato || '9:16', sceneCount: result.perScene.length }
    });
    return;
  }

  const { prompt } = await buildVideoPrompt({
    adnId: body.adnId || '01_CINEMA',
    landing,
    format: body.formato || '9:16',
    engine,
    avatar: body.avatar === 'si' || body.avatar === true
  });

  await updateJob(jobId, {
    status: 'completed',
    progress: 100,
    stage: 'Completado',
    result: { prompt, engine, formato: body.formato || '9:16' }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH E — Seedance 2.0 (prompt especializado con segmentos temporales)
// ─────────────────────────────────────────────────────────────────────────────
async function runBranchE(jobId: string, body: GenerateRequest, adn: any, landing: any) {
  await updateJob(jobId, { status: 'processing', progress: 30, stage: 'Generando prompt Seedance 2.0...', branch: 'E' });

  if (body.scenes && body.scenes.length > 0) {
    const result = buildSceneExportPrompt({
      adn,
      landing,
      format: body.formato || '9:16',
      engine: 'seedance',
      scenes: body.scenes,
      persona: body.persona,
      subtitles: body.subtitles,
      voiceId: body.voiceId,
      marketingName: body.marketingName
    });

    await updateJob(jobId, {
      status: 'completed',
      progress: 100,
      stage: 'Completado',
      result: { prompt: result.prompt, perScene: result.perScene, engine: 'seedance', formato: body.formato || '9:16', sceneCount: result.perScene.length }
    });
    return;
  }

  const { prompt } = await buildVideoPrompt({
    adnId: body.adnId || '01_CINEMA',
    landing,
    format: body.formato || '9:16',
    engine: 'seedance',
    avatar: body.avatar === 'si' || body.avatar === true
  });

  await updateJob(jobId, {
    status: 'completed',
    progress: 100,
    stage: 'Completado',
    result: { prompt, engine: 'seedance', formato: body.formato || '9:16' }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH F — Video Largo (AI Video API long-video, 4–180s en un solo request)
// Usa la skin Seedance (provider seedance) + candado de consistencia multi-clip,
// imágenes de referencia globales y audio nativo continuo.
// ─────────────────────────────────────────────────────────────────────────────
async function runBranchF(jobId: string, body: GenerateRequest, adn: any, landing: any, uid: string, role: string) {
  await updateJob(jobId, { status: 'processing', progress: 5, stage: 'Redactando prompt de video largo...', branch: 'F' });

  const scenes = (body.scenes && body.scenes.length > 0)
    ? body.scenes
    : (adn.slices || []).map((s: any) => ({
        segment: s.segment_label || 'VALOR',
        text: s.text || '',
        subtitle: s.subtitle || '',
        voiceover: s.voiceover || s.text || '',
        watermark: s.watermark || '',
        imageUrl: s.imageUrl || '',
        duration: Number(s.duration) || 5
      }));

  const built = buildSceneExportPrompt({
    adn,
    landing,
    format: body.formato || '9:16',
    engine: 'seedance',
    scenes,
    persona: body.persona,
    subtitles: body.subtitles,
    voiceId: body.voiceId,
    marketingName: body.marketingName
  });

  const totalSceneSeconds = built.totalDuration;
  const requested = body.longDuration && body.longDuration >= 4 ? body.longDuration : totalSceneSeconds;
  const durationSeconds = Math.min(Math.max(Math.round(requested), 4), 180);

  await updateJob(jobId, { progress: 15, stage: `Generando video largo (${durationSeconds}s, consistencia Seedance)...` });

  const result = await generateLongVideo({
    prompt: built.prompt,
    duration: durationSeconds,
    provider: 'seedance',
    resolution: body.formato === '16:9' ? '1080p' : '720p',
    aspectRatio: (body.formato as any) === '1:1' ? '1:1' : (body.formato as any) === '4:5' || (body.formato as any) === '4:3' ? '4:3' : (body.formato as any) === '16:9' ? '16:9' : '9:16',
    continuityMode: 'consistent',
    style: adn.description || undefined,
    imageUrls: scenes.map((s: any) => s.imageUrl).filter((u: string) => !!u && u.startsWith('http')).slice(0, 5),
    nativeAudioContinuity: true
  });

  // Localizar el video generado
  let videoPath: string | undefined;
  if (result.videoUri) {
    videoPath = await downloadLongVideo(result.videoUri, jobId);
  }
  if (!videoPath) throw new Error('[Branch F] No se pudo obtener el video largo.');

  await updateJob(jobId, { progress: 80, stage: 'Subiendo video a Google Drive...' });

  const safeBaseName = (body.marketingName || 'EvoAssetV2').replace(/[^a-zA-Z0-9]/g, '_');
  let resultPayload: Record<string, any> = {};
  if (body.googleToken) {
    const rootFolderId = await getOrCreateFolder(body.googleToken, 'Aplicacion EVO V2');
    const campaignFolderId = await getOrCreateFolder(body.googleToken, `Pack_${safeBaseName}`, rootFolderId);
    const mainFile = await uploadToDrive(videoPath, body.googleToken, `${safeBaseName}_long_${Date.now()}.mp4`, 'video/mp4', campaignFolderId);
    resultPayload = { webViewLink: mainFile.webViewLink, driveId: mainFile.id, downloadUrl: mainFile.webContentLink };
  } else {
    resultPayload = { videoPath };
  }

  // Billing (mismo patrón que Branch B)
  try {
    const { calculateVideoCost, deductCredits } = await import('@/lib/payments/credits');
    const isAdmin = role === 'admin' || role === 'tutor';
    if (uid && !body.isSmokeTest && !isAdmin) {
      const cost = await calculateVideoCost(durationSeconds);
      await deductCredits(uid, cost, 'video_long', role || 'alumno');
    }
  } catch (e) {
    console.error('[Branch F] Error al procesar cobro:', e);
  }

  await updateJob(jobId, { status: 'completed', progress: 100, stage: 'Completado', result: { ...resultPayload, durationSeconds, engine: 'long', sceneCount: scenes.length } });
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Dispatcher por branch
// ─────────────────────────────────────────────────────────────────────────────
async function runGenerateJob(jobId: string, body: GenerateRequest, uid: string, role: string) {
  try {
    const adn = await loadAdnConfig(body.adnId || '01_CINEMA');
    const landing = await loadLandingData(body.cursoId, body.salesPageId);
    const avatar = body.avatar === 'si' || body.avatar === true;
    const branch = decideBranch(avatar, body.engine || 'auto');

    console.log(`[Generate] Job ${jobId}: branch ${branch} | adn ${body.adnId || '01_CINEMA'} | formato ${body.formato}`);

    switch (branch) {
      case 'A':
        await runBranchA(jobId, body, adn);
        break;
      case 'B':
        await runBranchB(jobId, body, adn, landing, uid, role);
        break;
      case 'C':
        await runBranchC(jobId, body, adn, landing);
        break;
      case 'D':
        await runBranchD(jobId, body, adn, landing);
        break;
      case 'E':
        await runBranchE(jobId, body, adn, landing);
        break;
      case 'F':
        await runBranchF(jobId, body, adn, landing, uid, role);
        break;
    }
  } catch (err: any) {
    console.error(`[Generate] Job ${jobId} falló:`, err.message);
    await updateJob(jobId, { status: 'failed', stage: 'Error', error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/video/generate
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();

    if (!body.cursoId) {
      return NextResponse.json({ success: false, error: 'Falta cursoId.' }, { status: 400 });
    }
    if (!['9:16', '1:1', '16:9', '4:5'].includes(body.formato)) {
      return NextResponse.json({ success: false, error: 'formato debe ser 9:16 | 1:1 | 16:9 | 4:5.' }, { status: 400 });
    }

    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const uid = cookieStore.get('btech_uid')?.value || body.uid || '';
    const role = cookieStore.get('btech_role')?.value || body.role || 'alumno';

    const avatar = body.avatar === 'si' || body.avatar === true;
    const branch = decideBranch(avatar, body.engine || 'auto');
    const jobId = `gen_${branch}_${Date.now()}`;

    // Ticket en Firestore ANTES de responder
    await adminDb.collection('video_jobs').doc(jobId).set({
      jobId,
      uid,
      role,
      status: 'pending',
      progress: 0,
      stage: 'En cola...',
      engine: body.engine || 'auto',
      branch,
      format: body.formato,
      adnId: body.adnId || '01_CINEMA',
      cursoId: body.cursoId,
      marketingName: body.marketingName || 'Video',
      sceneCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      result: null,
      error: null
    });

    // Worker fire-and-forget
    runGenerateJob(jobId, body, uid, role).catch(e =>
      console.error(`[Generate] Uncaught error en job ${jobId}:`, e)
    );

    return NextResponse.json({
      success: true,
      jobId,
      branch,
      status: 'pending',
      message: 'El job fue encolado. Escucha el jobId en Firestore para obtener el resultado.'
    });
  } catch (err: any) {
    console.error('🔥 [Generate] Error al encolar job:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
