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
export interface Scene {
  imageUrl: string;
  text: string;
  subtitle?: string;
  watermark?: string;
  voiceover?: string;
  segment_label?: string;
  duration?: number;
}

export interface RenderRequest {
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
  campaignTitle?: string;
  isSmokeTest?: boolean;
  salesPageId?: string;
  // datos del tutor para cobro y tracking
  uid?: string;
  role?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GARBAGE COLLECTOR (limpia directorios temporales > 24h)
// ─────────────────────────────────────────────────────────────────────────────
export async function runGarbageCollector(basePath: string) {
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
export async function updateJob(jobId: string, data: Record<string, any>) {
  try {
    await adminDb.collection('video_jobs').doc(jobId).update({
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('[JobQueue] Error actualizando job en Firestore:', e);
  }
}

export async function uploadToFirebaseStorage(filePath: string, destination: string): Promise<string> {
  const { adminStorage, uploadFileAndGetPublicUrl } = await import('@/firebase/admin');
  const bucket = adminStorage.bucket();
  return uploadFileAndGetPublicUrl(bucket, filePath, destination, 'video/mp4');
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKER: Proceso de renderizado
// ─────────────────────────────────────────────────────────────────────────────
export async function runRenderJob(jobId: string, body: RenderRequest) {
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
      isSmokeTest, uid, role, salesPageId
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
        camera: motion.camera,
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
    const { generateSpeechV2, getAudioDuration } = await import('../tts');

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
      backgroundMusicUrl,
      onSliceProgress: async (sliceIdx: number, total: number) => {
        const p = 55 + Math.round((sliceIdx / Math.max(total, 1)) * 20); // 55% -> 75%
        await updateJob(jobId, {
          progress: p,
          stage: `Renderizando escena ${sliceIdx + 1} de ${total} con FFmpeg...`
        });
      }
    };

    const renderResult = await renderFullVideo(engineReq);

    // ── PASO 5: Subir a Google Drive / Firebase Storage ─────────────────────
    await updateJob(jobId, { progress: 80, stage: 'Subiendo video a Google Drive...' });

    const safeBaseName = (marketingName || 'EvoAssetV2').replace(/[\\/:*?"<>|]/g, '_');
    const safeCampaignName = (body.campaignTitle || 'Campañas').replace(/[\\/:*?"<>|]/g, '_');
    let resultPayload: Record<string, any> = {};

    if (typeof renderResult === 'string') {
      // VIDEO ÚNICO
      let driveLink = '', driveId = '', downloadUrl = '';
      let isDrive = false;

      if (googleToken) {
        console.log(`>>> [DEBUG DRIVE] Google Token presente. Iniciando subida a Drive...`);
        try {
          const rootFolderId = await getOrCreateFolder(googleToken, 'fastoria');
          const staticCampanasFolderId = await getOrCreateFolder(googleToken, 'Campañas', rootFolderId);
          const campaignFolderId = await getOrCreateFolder(googleToken, safeCampaignName, staticCampanasFolderId);
          const pieceFolderId = await getOrCreateFolder(googleToken, safeBaseName, campaignFolderId);
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const mainFile = await uploadToDrive(renderResult, googleToken, `${safeBaseName}_${timestamp}.mp4`, 'video/mp4', pieceFolderId);
          
          driveLink = mainFile.webViewLink;
          driveId = mainFile.id;
          downloadUrl = mainFile.webContentLink;
          isDrive = true;
          console.log(`>>> [DEBUG DRIVE] Subida exitosa. Link: ${driveLink}`);
        } catch (driveErr: any) {
          console.error(`>>> [DEBUG DRIVE] Error al subir a Drive. Cayendo a fallback Firebase Storage:`, driveErr.message);
        }
      } else {
        console.log(`>>> [DEBUG DRIVE] No hay Google Token. Cayendo a fallback Firebase Storage.`);
      }

      // FALLBACK A FIREBASE STORAGE SI DRIVE FALLÓ O NO HABÍA TOKEN
      if (!isDrive) {
        console.log(`>>> [DEBUG STORAGE] Subiendo video a Firebase Storage...`);
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const storageDestination = `videos/${jobId}/${safeBaseName}_${timestamp}.mp4`;
          const storageUrl = await uploadToFirebaseStorage(renderResult, storageDestination);
          driveLink = storageUrl;
          downloadUrl = storageUrl;
          driveId = storageDestination;
          console.log(`>>> [DEBUG STORAGE] Subida exitosa a Storage. URL: ${storageUrl}`);
        } catch (storageErr: any) {
          console.error(`>>> [DEBUG STORAGE] Error al subir a Firebase Storage:`, storageErr.message);
        }
      }

      resultPayload = {
        type: 'single',
        videoPath: renderResult,
        webViewLink: driveLink,
        downloadUrl: downloadUrl,
        driveId: driveId
      };
    } else if (typeof renderResult === 'object' && renderResult.slices) {
      // SLICES INDIVIDUALES (Carrusel / Multi-clip)
      const uploadedSlices = [];
      let rootFolderId = '';
      let pieceFolderId = '';

      if (googleToken) {
        try {
          rootFolderId = await getOrCreateFolder(googleToken, 'fastoria');
          const staticCampanasFolderId = await getOrCreateFolder(googleToken, 'Campañas', rootFolderId);
          const campaignFolderId = await getOrCreateFolder(googleToken, safeCampaignName, staticCampanasFolderId);
          pieceFolderId = await getOrCreateFolder(googleToken, safeBaseName, campaignFolderId);
        } catch (e) {
          console.warn('[GoogleDrive] Falló estructuración de carpetas para slices:', e);
        }
      }

      for (let sIdx = 0; sIdx < renderResult.slices.length; sIdx++) {
        const slice = renderResult.slices[sIdx];
        let sliceLink = '';
        let sliceDriveId = '';
        let isSliceDrive = false;

        if (googleToken && pieceFolderId) {
          try {
            const fileName = `${safeBaseName}_Slice_${sIdx + 1}_${slice.segment}.mp4`;
            const fileMeta = await uploadToDrive(slice.path, googleToken, fileName, 'video/mp4', pieceFolderId);
            sliceLink = fileMeta.webViewLink;
            sliceDriveId = fileMeta.id;
            isSliceDrive = true;
          } catch (e) {
            console.warn(`[GoogleDrive] Falló subida a Drive del slice ${sIdx + 1}:`, e);
          }
        }

        if (!isSliceDrive) {
          try {
            const storageDestination = `videos/${jobId}/slices/${safeBaseName}_Slice_${sIdx + 1}_${slice.segment}.mp4`;
            sliceLink = await uploadToFirebaseStorage(slice.path, storageDestination);
            sliceDriveId = storageDestination;
          } catch (storageErr: any) {
            console.error(`[FirebaseStorage] Falló subida a Storage del slice ${sIdx + 1}:`, storageErr);
          }
        }

        uploadedSlices.push({
          segment: slice.segment,
          videoPath: slice.path,
          webViewLink: sliceLink,
          driveId: sliceDriveId
        });
      }

      resultPayload = {
        type: 'multi',
        slices: uploadedSlices,
        message: renderResult.message
      };
    }

    // ── PASO 6: Facturación de créditos ─────────────────────────────────────
    if (uid) {
      try {
        const { calculateVideoCost, deductCredits } = await import('@/lib/payments/credits');
        const cost = await calculateVideoCost(60, 'ffmpeg');
        await deductCredits(uid, cost, 'video_render_v2', role || 'alumno');
        console.log(`[JobQueue] Facturación completada para usuario: ${uid}`);
      } catch (billingErr: any) {
        console.warn(`[JobQueue] Advertencia en facturación: ${billingErr.message}`);
      }
    }

    // ── PASO 7: Marcar job como completado en Firestore ─────────────────────
    await updateJob(jobId, {
      status: 'completed',
      progress: 100,
      stage: '¡Renderizado completado!',
      result: resultPayload,
      completedAt: new Date().toISOString()
    });

    // ── PASO 8: Actualizar campaña o salesPage vinculada ────────────────────
    if (salesPageId) {
      try {
        let isCampaign = false;
        let docRef = adminDb.collection('campaigns').doc(salesPageId);
        let docSnap = await docRef.get();
        if (docSnap.exists) {
           isCampaign = true;
        } else {
           docRef = adminDb.collection('salesPages').doc(salesPageId);
           docSnap = await docRef.get();
        }

        if (docSnap.exists) {
           const docData = docSnap.data();
           const socials = (isCampaign ? docData?.videoSkeletons : docData?.aiContent?.socials) || [];
           let updated = false;
           for (let s of socials) {
              if (s.marketingName === body.marketingName) {
                 if (!s.production_notes) s.production_notes = {};
                 s.production_notes.video_url = resultPayload.downloadUrl || resultPayload.webViewLink || resultPayload.videoPath;
                 s.production_notes.video_drive_id = resultPayload.driveId;
                 s.production_notes.video_download_url = resultPayload.downloadUrl;
                 s.videoJobId = jobId;
                 updated = true;
              }
           }
           if (updated) {
              await docRef.update(
                 isCampaign ? { 'videoSkeletons': socials, 'aiContent.socials': socials } : { 'aiContent.socials': socials }
              );
              console.log(`[JobQueue] Updated ${isCampaign ? 'campaign' : 'salesPage'} ${salesPageId} with video URL for ${body.marketingName}`);
           }
        }
      } catch(e) { console.error("Error updating campaign/salesPage:", e); }
    }

    console.log(`✅ [JobQueue] Job ${jobId} completado.`);

  } catch (err: any) {
    console.error(`🔥 [JobQueue] Job ${jobId} falló:`, err.message);
    await updateJob(jobId, { status: 'failed', stage: 'Error', error: err.message });
  } finally {
    try {
      await fsPromises.rm(workDir, { recursive: true, force: true });
      console.log(`🧹 [Render V2] Directorio temporal limpiado: ${workDir}`);
    } catch (e) {
      console.error(`❌ [Render V2] Falla al limpiar ${workDir}:`, e);
    }
  }
}
