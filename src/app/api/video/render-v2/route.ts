import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import * as fsPromises from 'fs/promises';
import os from 'os';
import { uploadToDrive, getOrCreateFolder } from '@/lib/drive-utils';
import { renderFullVideo, EngineRequest, EngineSlice } from '@/lib/video/engine';
import { adminDb } from '@/firebase/admin';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
interface Scene {
  imageUrl: string;
  text: string;
  subtitle?: string;
  watermark?: string;
  voiceover?: string;
  segment_label?: string;
  duration?: number;
}

interface RenderRequest {
  jobId: string;
  scenes: Scene[];
  audioUrl?: string;
  audioDuration?: number;
  resolution?: string;
  brandColor?: string;
  adnId?: string;
  enable_tts?: boolean;
  voice_id?: string;
  voiceover?: string;
  audioEffect?: 'none' | 'studio' | 'auto';
  googleToken?: string;
  isCarousel?: boolean;
  platform?: string;
  marketingName?: string;
  isSmokeTest?: boolean;
  // datos del tutor para cobro y tracking
  uid?: string;
  role?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GARBAGE COLLECTOR (limpia directorios temporales > 24h)
// ─────────────────────────────────────────────────────────────────────────────
async function runGarbageCollector(basePath: string) {
  try {
    const folders = await fsPromises.readdir(basePath);
    const now = Date.now();
    const TTL = 24 * 60 * 60 * 1000;
    for (const folder of folders) {
      const folderPath = path.join(basePath, folder);
      const folderStat = await fsPromises.stat(folderPath);
      if (now - folderStat.mtimeMs > TTL) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }
    }
  } catch (err) { }
}

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
    console.error('[JobQueue] Error actualizando job en Firestore:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Proceso de renderizado en segundo plano
// ─────────────────────────────────────────────────────────────────────────────
async function runRenderJob(jobId: string, body: RenderRequest) {
  const baseRenderPath = path.join(os.tmpdir(), 'render_jobs_v2');
  const workDir = path.join(baseRenderPath, jobId);

  try {
    await fsPromises.mkdir(workDir, { recursive: true });
    await runGarbageCollector(baseRenderPath);

    // ── DIAGNÓSTICO DE BINARIO ──────────────────────────────────────────────
    const customBin = path.join(process.cwd(), 'node_modules', 'custom-ffmpeg-build', 'ffmpeg');
    const staticBin = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
    console.log(`[FFmpeg Diagnostic] Custom GPL binary exists: ${fs.existsSync(customBin)} (${customBin})`);
    console.log(`[FFmpeg Diagnostic] Static binary exists: ${fs.existsSync(staticBin)} (${staticBin})`);
    // ─────────────────────────────────────────────────────────────────────────

    const {
      scenes, audioUrl, resolution, adnId,
      enable_tts, voice_id, voiceover, audioEffect,
      googleToken, isCarousel, marketingName, platform,
      isSmokeTest, uid, role
    } = body;

    // ── PASO 1: Cargar configuración del ADN ────────────────────────────────
    await updateJob(jobId, { status: 'processing', progress: 5, stage: 'Cargando configuración ADN...' });

    let adnsDir = path.join(process.cwd(), 'public', 'adns');
    try {
      await fsPromises.stat(adnsDir);
    } catch {
      const standaloneFallback = path.join(process.cwd(), '..', '..', 'public', 'adns');
      try {
        await fsPromises.stat(standaloneFallback);
        adnsDir = standaloneFallback;
      } catch { }
    }

    const targetPath = path.join(adnsDir, adnId || '01_CINEMA');
    let adnConfig: any;
    const targetStat = await fsPromises.stat(targetPath);

    if (targetStat.isDirectory()) {
      const getJson = async (name: string) => {
        const p = path.join(targetPath, name);
        try { return JSON.parse(await fsPromises.readFile(p, 'utf-8')); }
        catch { return {}; }
      };
      const [manifest, engine, motion, composition, globalFx, typography, blueprint] = await Promise.all([
        getJson('manifest.json'), getJson('engine.json'), getJson('motion.json'),
        getJson('composition.json'), getJson('global-fx.json'), getJson('typography.json'),
        getJson('blueprint.json')
      ]);
      adnConfig = {
        ...manifest,
        ...engine,
        ...composition,
        ...globalFx,
        motion_engine: motion,
        typography_engine: typography,
        default_blueprint: blueprint,
        camera: motion.camera, // Direct access for convenience
        transitions: motion.transitions
      };
    } else {
      adnConfig = JSON.parse(await fsPromises.readFile(targetPath, 'utf-8'));
    }

    const [width, height] = (resolution || '1080x1920').split('x').map(Number);
    let formatStr: 'vertical' | 'portrait' | 'square' | 'horizontal' = 'vertical';
    if (width === height) formatStr = 'square';
    else if (width > height) formatStr = 'horizontal';
    else if (width === 1080 && height === 1350) formatStr = 'portrait';
    else formatStr = 'vertical';

    // ── PASO 2: Descargar audio de fondo ───────────────────────────────────
    await updateJob(jobId, { progress: 10, stage: 'Descargando audio de fondo...' });

    let backgroundMusicUrl = undefined;
    if (audioUrl) {
      try {
        const urlToFetch = audioUrl.startsWith('/') ? `http://127.0.0.1:9002${audioUrl}` : audioUrl;
        const res = await fetch(urlToFetch, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const audioPath = path.join(workDir, 'bg.mp3');
        await fsPromises.writeFile(audioPath, Buffer.from(await res.arrayBuffer()));
        backgroundMusicUrl = audioPath.replace(/\\/g, '/');
      } catch (err: any) {
        console.warn(`[Render V2] Failed to fetch audioUrl. Error: ${err.message}`);
      }
    }

    // ── PASO 3: Generar TTS y descargar imágenes por escena ────────────────
    const activeVoiceId = voice_id || adnConfig.global_fx?.voiceId || 'mateo';
    const engineSlices: EngineSlice[] = [];
    const { generateSpeechV2, getAudioDuration } = await import('../../../../lib/tts');

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneProgress = 10 + Math.round((i / scenes.length) * 40); // 10% → 50%
      await updateJob(jobId, {
        progress: sceneProgress,
        stage: `Procesando escena ${i + 1} de ${scenes.length}...`
      });

      let sceneDuration = scene.duration || 5;
      let voicePath = null;

      if (enable_tts && (scene.voiceover || scene.text)) {
        try {
          const cachedVoicePath = await generateSpeechV2(scene.voiceover || scene.text, activeVoiceId, isSmokeTest);
          const localVoicePath = path.join(workDir, `voice_${i}.mp3`);
          await fsPromises.copyFile(cachedVoicePath, localVoicePath);
          voicePath = localVoicePath;
          sceneDuration = (await getAudioDuration(voicePath)) + 0.3;
        } catch (err: any) {
          console.error(`❌ [TTS Error] Escena ${i}:`, err);
        }
      }

      // Descargar imagen
      const imgPath = path.join(workDir, `img_${i}.jpg`);
      const safeUrl = scene.imageUrl || `https://placehold.co/${width}x${height}/1e293b/ffffff.jpg?text=Escena+${i + 1}`;
      try {
        const urlToFetch = safeUrl.startsWith('/') ? `http://127.0.0.1:9002${safeUrl}` : safeUrl;
        const res = await fetch(urlToFetch, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await fsPromises.writeFile(imgPath, Buffer.from(await res.arrayBuffer()));
      } catch {
        await fsPromises.writeFile(imgPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
      }

      engineSlices.push({
        imagePath: imgPath,
        voicePath,
        duration: sceneDuration,
        text: scene.text || '',
        subtitle: scene.subtitle || '',
        watermark: scene.watermark || '',
        segment_label: scene.segment_label || 'VALOR'
      });
    }

    // ── PASO 4: Renderizar con FFmpeg ───────────────────────────────────────
    await updateJob(jobId, { progress: 55, stage: 'Renderizando video con FFmpeg...' });

    const engineReq: EngineRequest = {
      adn: adnConfig,
      blueprint: { ...(adnConfig.default_blueprint || {}), concatenate_slices: !isCarousel },
      jobId,
      format: formatStr as any,
      workDir,
      slices: engineSlices,
      backgroundMusicUrl
    };

    const renderResult = await renderFullVideo(engineReq);

    // ── PASO 5: Subir a Google Drive ────────────────────────────────────────
    await updateJob(jobId, { progress: 80, stage: 'Subiendo video a Google Drive...' });

    const safeBaseName = (marketingName || 'EvoAssetV2').replace(/[^a-zA-Z0-9]/g, '_');
    let resultPayload: Record<string, any> = {};

    if (typeof renderResult === 'string') {
      // VIDEO ÚNICO
      let driveLink = '', driveId = '', downloadUrl = '';
      if (googleToken) {
        const rootFolderId = await getOrCreateFolder(googleToken, 'Aplicacion EVO V2');
        const campaignFolderId = await getOrCreateFolder(googleToken, `Pack_${safeBaseName}`, rootFolderId);
        const mainFile = await uploadToDrive(renderResult, googleToken, `${safeBaseName}_${Date.now()}.mp4`, 'video/mp4', campaignFolderId);
        driveLink = mainFile.webViewLink;
        driveId = mainFile.id;
        downloadUrl = mainFile.webContentLink;
      }
      resultPayload = { webViewLink: driveLink, driveId, downloadUrl };

    } else if (typeof renderResult === 'object' && renderResult.success && renderResult.slices) {
      // CARRUSEL (múltiples videos)
      const driveLinks: string[] = [], driveIds: string[] = [], downloadUrls: string[] = [];
      if (googleToken) {
        const rootFolderId = await getOrCreateFolder(googleToken, 'Aplicacion EVO V2');
        const campaignFolderId = await getOrCreateFolder(googleToken, `Pack_${safeBaseName}`, rootFolderId);
        for (let i = 0; i < renderResult.slices.length; i++) {
          await updateJob(jobId, {
            progress: 80 + Math.round((i / renderResult.slices.length) * 15),
            stage: `Subiendo placa ${i + 1} de ${renderResult.slices.length}...`
          });
          const mainFile = await uploadToDrive(renderResult.slices[i].path, googleToken, `${safeBaseName}_slide_${i + 1}_${Date.now()}.mp4`, 'video/mp4', campaignFolderId);
          driveLinks.push(mainFile.webViewLink);
          driveIds.push(mainFile.id);
          downloadUrls.push(mainFile.webContentLink);
        }
      }
      resultPayload = { webViewLink: driveLinks.join(','), driveId: driveIds.join(','), downloadUrl: downloadUrls.join(',') };
    } else {
      throw new Error('El motor de renderizado devolvió un resultado inesperado.');
    }

    // ── PASO 6: Facturación ─────────────────────────────────────────────────
    try {
      const { calculateVideoCost, deductCredits } = await import('@/lib/payments/credits');
      const isAdmin = role === 'admin';
      if (uid && !isSmokeTest && !isAdmin) {
        const totalDuration = engineSlices.reduce((acc, s) => acc + s.duration, 0);
        const cost = await calculateVideoCost(totalDuration);
        
        console.log("--- [DEBUG IA] AUDITORÍA AUTOMÁTICA (FFMPEG/RENDER V2) ---");
        console.log(`> Usuario: ${uid} (${role})`);
        console.log(`> Acción Detectada: ${isCarousel ? 'video_carousel_v2' : 'video_render_v2'}`);
        console.log(`> Duración Total: ${totalDuration.toFixed(2)}s`);
        console.log(`> Costo Proveedor: $${cost.providerCost}`);
        console.log(`> Cobro al Tutor: $${cost.billedCost}`);
        console.log("----------------------------------------------------------");
        
        await deductCredits(uid, cost, isCarousel ? 'video_carousel_v2' : 'video_render_v2', role || 'alumno');
      } else if (isAdmin) {
        console.log(`>>> [BILLING] Consumo de Admin (Gratis): render-v2 para UID ${uid}`);
      }
    } catch (e) {
      console.error('[Billing V2] Error al procesar cobro:', e);
    }

    // ── COMPLETADO ──────────────────────────────────────────────────────────
    await updateJob(jobId, {
      status: 'completed',
      progress: 100,
      stage: 'Completado',
      result: resultPayload
    });

    console.log(`✅ [JobQueue] Job ${jobId} completado.`);

  } catch (err: any) {
    console.error(`🔥 [JobQueue] Job ${jobId} falló:`, err.message);
    await updateJob(jobId, { status: 'failed', stage: 'Error', error: err.message });
  } finally {
    // Limpieza garantizada del directorio temporal
    try {
      await fsPromises.rm(workDir, { recursive: true, force: true });
      console.log(`🧹 [Render V2] Directorio temporal limpiado: ${workDir}`);
    } catch (e) {
      console.error(`❌ [Render V2] Falla al limpiar ${workDir}:`, e);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT POST: Recibe la solicitud y encola el trabajo
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: RenderRequest = await req.json();

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
      error: null
    });

    // ── Lanzar proceso en SEGUNDO PLANO (Fire & Forget) ──────────────────────
    // Importante: no usamos await aquí. La función corre en paralelo al
    // response. Esto es lo que permite responder en ~100ms sin bloquear.
    runRenderJob(jobId, { ...body, uid, role }).catch(e =>
      console.error(`[JobQueue] Uncaught error en job ${jobId}:`, e)
    );

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
