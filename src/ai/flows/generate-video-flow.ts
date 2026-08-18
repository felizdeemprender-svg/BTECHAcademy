'use server';
/**
 * @fileOverview Flujo de Genkit para la orquestación y generación de Video IA (Branch B).
 * Centraliza la facturación, llamadas a Vertex/Omni, FFmpeg, y subida a Drive.
 */

import { ai, validateApiKey } from '../genkit';
import { z } from 'genkit';
import { calculateVideoCost, deductCredits } from '@/lib/payments/credits';
import { adminDb } from '@/firebase/admin';
import { getOrCreateFolder, uploadToDrive } from '@/lib/drive-utils';
import { generateRegressiveVertexVideo, concatVideos, trimAndFormatVideo, applyFullPostProduction } from '@/lib/ai/vertex-veo';
import { generateOmniVideo, saveOmniBytes, downloadOmniVideo } from '@/lib/ai/gemini-omni';

const SceneSchema = z.object({
  text: z.string().optional(),
  voiceover: z.string().optional(),
  subtitle: z.string().optional(),
  watermark: z.string().optional(),
  duration: z.number().optional(),
  subject_action: z.string().optional(),
  camera_movement: z.string().optional(),
  framing: z.string().optional(),
  lighting: z.string().optional()
}).passthrough();

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

const generateVideoInputSchema = z.object({
  jobId: z.string(),
  uid: z.string(),
  role: z.string(),
  adn: z.any(), // Record<string, any>
  scenes: z.array(SceneSchema).optional(),
  formato: z.string().optional().default('9:16'),
  marketingName: z.string().optional(),
  audioUrl: z.string().optional(),
  enable_tts: z.boolean().optional(),
  isSmokeTest: z.boolean().optional(),
  googleToken: z.string().optional()
});

export const generateVideoFlow = ai.defineFlow({
  name: 'generateVideoFlow',
  inputSchema: generateVideoInputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    jobId: z.string(),
    result: z.any().optional(),
    error: z.string().optional()
  })
}, async (input) => {
  const { jobId, uid, role, adn, scenes, formato, marketingName, audioUrl, enable_tts, isSmokeTest, googleToken } = input;
  
  validateApiKey();

  const activeScenes = (scenes && scenes.length > 0) ? scenes : (adn.slices || []);
  const totalDuration = activeScenes.reduce((acc: number, s: any) => acc + (s.duration || 5), 0) || 10;
  let finalVideoPath: string | undefined;

  // 1. Cobro por adelantado (Centralización de facturación en Genkit)
  const isAdmin = role === 'admin' || role === 'tutor';
  if (uid && !isSmokeTest && !isAdmin) {
    try {
      const cost = await calculateVideoCost(totalDuration, 'omni');
      await deductCredits(uid, cost, 'video_omni_genkit', role || 'alumno');
    } catch (e: any) {
      console.error('[Genkit:VideoFlow] Error al cobrar:', e);
      await updateJob(jobId, { status: 'failed', progress: 0, stage: 'Error de facturación', error: e.message });
      return { success: false, jobId, error: 'Error de facturación' };
    }
  }

  await updateJob(jobId, { status: 'processing', progress: 5, stage: 'Analizando escenas en Genkit...', branch: 'B' });
  await updateJob(jobId, { progress: 10, stage: 'Preparando flujo de generación por escenas...' });
  
  const chunks: any[][] = activeScenes.map((s: any) => [s]);

  const mood = adn.description || 'estilo corporativo/educativo estándar';
  const char = 'presentador consistente o sujetos consistentes según el mood';
  const visualLock = `\nREGLAS DE CONSISTENCIA: Estilo: ${mood}. Mismos personajes: ${char}. Mantén el mismo peinado, ropa, complexión y tono de piel en toda la pieza. Voz: ${adn.audio_engine?.voice_id || 'mateo'}.`;

  const vertexScenes = chunks.map(chunk => {
    const sceneDescriptions = chunk.map(s => {
      const text = s.text || s.voiceover || '';
      const details = [
        s.subject_action && `Action: ${s.subject_action}`,
        s.camera_movement && `Camera: ${s.camera_movement}`,
        s.framing && `Framing: ${s.framing}`,
        s.lighting && `Lighting: ${s.lighting}`
      ].filter(Boolean).join(' | ');
      return details ? `${text} (${details})` : text;
    });
    const texts = sceneDescriptions.join('. ') + visualLock;
    const dur = chunk.reduce((acc, s) => acc + (s.duration || 5), 0);
    return { prompt: texts, durationSeconds: dur };
  });

  await updateJob(jobId, { progress: 15, stage: `Generando ${chunks.length} módulos con Vertex AI...` });
  
  try {
    const chunkPaths = await generateRegressiveVertexVideo({
      jobId,
      format: formato,
      scenes: vertexScenes
    });

    await updateJob(jobId, { progress: 55, stage: `Ajustando duración de clips (Vertex)...` });
    const trimmedChunkPaths: string[] = [];
    for (let i = 0; i < chunkPaths.length; i++) {
      trimmedChunkPaths.push(await trimAndFormatVideo(chunkPaths[i], vertexScenes[i].durationSeconds, jobId + `_tv_${i}`, formato));
    }

    await updateJob(jobId, { progress: 60, stage: `Ensamblando módulos (Vertex)...` });
    finalVideoPath = await concatVideos(trimmedChunkPaths, jobId);
  } catch (err: any) {
    if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('Publisher model')) {
      await updateJob(jobId, { progress: 20, stage: `Vertex no habilitado aún. Fallback a Omni (${chunks.length} clips)...` });
      
      const chunkPaths: string[] = [];
      for (let i = 0; i < vertexScenes.length; i++) {
        const vs = vertexScenes[i];
        await updateJob(jobId, { progress: 20 + Math.floor((i / vertexScenes.length) * 40), stage: `Generando clip Omni ${i + 1}/${vertexScenes.length}...` });
        
        const oResult = await generateOmniVideo({
          prompt: vs.prompt,
          format: formato,
          durationSeconds: Math.min(Math.round(vs.durationSeconds), 10)
        });
        
        let cPath;
        if (oResult.videoPath) cPath = oResult.videoPath;
        else if (oResult.videoBytes) cPath = await saveOmniBytes(oResult.videoBytes, jobId + `_c${i}`);
        else if (oResult.videoUri) cPath = await downloadOmniVideo(oResult.videoUri, jobId + `_c${i}`);
        
        if (cPath) {
          await updateJob(jobId, { progress: 20 + Math.floor((i / vertexScenes.length) * 40) + 2, stage: `Ajustando duración (Trim) del clip ${i + 1}...` });
          const trimmedPath = await trimAndFormatVideo(cPath, vs.durationSeconds, jobId + `_to_${i}`, formato);
          chunkPaths.push(trimmedPath);
        }
      }
      
      await updateJob(jobId, { progress: 65, stage: `Ensamblando clips de Omni Fallback...` });
      finalVideoPath = await concatVideos(chunkPaths, jobId);
    } else {
      throw err;
    }
  }

  if (!finalVideoPath) throw new Error('[Branch B] No se pudo obtener el video final.');

  // Post-Producción: Voz TTS, Subtítulos, Marca de Agua y Música
  await updateJob(jobId, { progress: 70, stage: 'Aplicando Post-Producción (Voz, Subtítulos, Música)...' });
  try {
    finalVideoPath = await applyFullPostProduction({
      videoPath: finalVideoPath,
      scenes: activeScenes,
      jobId,
      backgroundMusicUrl: audioUrl,
      adn,
      format: formato,
      enable_tts: enable_tts !== false,
      isSmokeTest: isSmokeTest
    });
  } catch (err: any) {
    console.warn('[Genkit:VideoFlow] Falló la post-producción:', err);
  }

  // Ensamble con FFmpeg + subida a Drive
  await updateJob(jobId, { progress: 80, stage: 'Subiendo video a Google Drive...' });

  const safeBaseName = (marketingName || 'EvoAssetV2').replace(/[^a-zA-Z0-9]/g, '_');
  let resultPayload: Record<string, any> = {};
  if (googleToken) {
    const rootFolderId = await getOrCreateFolder(googleToken, 'Aplicacion EVO V2');
    const campaignFolderId = await getOrCreateFolder(googleToken, `Pack_${safeBaseName}`, rootFolderId);
    const mainFile = await uploadToDrive(finalVideoPath, googleToken, `${safeBaseName}_omni_${Date.now()}.mp4`, 'video/mp4', campaignFolderId);
    resultPayload = { webViewLink: mainFile.webViewLink, driveId: mainFile.id, downloadUrl: mainFile.webContentLink };
  } else {
    resultPayload = { videoPath: finalVideoPath };
  }

  await updateJob(jobId, { status: 'completed', progress: 100, stage: 'Completado', result: resultPayload });
  return { success: true, jobId, result: resultPayload };
});
