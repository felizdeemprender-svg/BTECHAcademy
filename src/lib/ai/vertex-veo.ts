import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { GoogleAuth } from 'google-auth-library';
import type { OmniVideoRequest, OmniVideoResult } from './gemini-omni';
import { generateSpeechV2 } from '../tts';
import { generateAssFile } from '../video/engine';

export interface VertexVideoScene {
  prompt: string;
  durationSeconds: number;
}

export interface VertexVideoOptions {
  jobId: string;
  format: string; // '9:16' | '16:9'
  scenes: VertexVideoScene[];
}

/**
 * Ejecuta FFmpeg.
 */
function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolvedFfmpeg: string = ffmpegPath as string;
    const proc = spawn(resolvedFfmpeg, args, { env: process.env });
    
    let errorLog = '';
    proc.stderr.on('data', (data) => { errorLog += data.toString(); });
    
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg failed with code ${code}: ${errorLog}`));
    });
  });
}

/**
 * Extrae el último frame de un video usando FFmpeg y lo devuelve en base64.
 */
async function extractLastFrame(videoPath: string, outDir: string): Promise<string> {
  const outJpg = path.join(outDir, `frame_${Date.now()}.jpg`);
  
  // Como simplificación, asumimos que todos los videos tienen al menos 3s y saltamos al final
  // Una mejor solución leería la duración real. Aquí usaremos un filtro simple.
  await runFfmpeg([
    '-sseof', '-0.5', // buscar medio segundo antes del final
    '-i', videoPath,
    '-update', '1',
    '-q:v', '2',
    '-vframes', '1',
    '-y',
    outJpg
  ]);
  
  const buffer = await fs.readFile(outJpg);
  return buffer.toString('base64');
}

/**
 * Llama a Vertex AI (Veo) para generar un clip. Si se provee imageBase64, hace Image-to-Video.
 */
async function callVertexPredict(prompt: string, format: string, duration: number, imageBase64?: string): Promise<string> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
  
  if (!projectId) {
    throw new Error('[Vertex] Faltan las variables de entorno de Google Cloud (GOOGLE_CLOUD_PROJECT_ID).');
  }

  const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = tokenResponse.token;

  if (!accessToken) throw new Error('[Vertex] No se pudo obtener el token de Google Cloud.');

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/veo-2.0-generate:predict`;
  
  const instance: any = { prompt };
  if (imageBase64) {
    instance.image = { bytesBase64: imageBase64 };
  }

  const payload = {
    instances: [instance],
    parameters: {
      aspectRatio: format === '16:9' ? '16:9' : '9:16',
      durationSeconds: duration
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Vertex Error]', errorText);
    throw new Error(`[Vertex] Error HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const prediction = data.predictions?.[0];
  if (!prediction) throw new Error('[Vertex] La API no devolvió una predicción válida.');
  
  const base64Video = prediction.bytesBase64 || prediction.video;
  if (!base64Video) throw new Error('[Vertex] No se encontró video base64 en la respuesta.');

  return base64Video;
}

/**
 * Orquestador Auto-Regresivo: Genera los clips de forma secuencial,
 * pasando el último frame del clip N-1 como imagen inicial del clip N.
 */
export async function generateRegressiveVertexVideo(opts: VertexVideoOptions): Promise<string[]> {
  const { scenes, format, jobId } = opts;
  const outDir = path.join(os.tmpdir(), 'vertex_jobs', jobId);
  await fs.mkdir(outDir, { recursive: true });

  const generatedVideoPaths: string[] = [];
  let lastFrameBase64: string | undefined = undefined;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`[Vertex] Generando escena ${i + 1}/${scenes.length}...`);
    
    // Llamada a la IA
    const base64Video = await callVertexPredict(scene.prompt, format, scene.durationSeconds, lastFrameBase64);
    
    // Guardar el clip a disco
    const clipPath = path.join(outDir, `clip_${i}.mp4`);
    await fs.writeFile(clipPath, Buffer.from(base64Video, 'base64'));
    generatedVideoPaths.push(clipPath);

    // Si no es la última escena, extraer el frame final para la siguiente vuelta
    if (i < scenes.length - 1) {
      console.log(`[Vertex] Extrayendo último frame de escena ${i + 1} para la escena ${i + 2}...`);
      lastFrameBase64 = await extractLastFrame(clipPath, outDir);
    }
  }

  return generatedVideoPaths;
}

/**
 * Concatena múltiples videos en uno solo usando el demuxer concat de FFmpeg.
 */
export async function concatVideos(videoPaths: string[], jobId: string): Promise<string> {
  if (videoPaths.length === 1) return videoPaths[0];

  const outDir = path.join(os.tmpdir(), 'vertex_jobs', jobId);
  await fs.mkdir(outDir, { recursive: true });
  
  const listPath = path.join(outDir, 'concat_list.txt');
  const outPath = path.join(outDir, `final_vertex_${Date.now()}.mp4`);
  
  const listContent = videoPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  await fs.writeFile(listPath, listContent);
  
  await runFfmpeg([
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c', 'copy',
    '-y',
    outPath
  ]);
  
  return outPath;
}

export async function hasAudioStream(videoPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ff = spawn(ffmpegPath as string, ['-i', videoPath]);
    let output = '';
    ff.stderr.on('data', (d) => { output += d.toString(); });
    ff.on('close', () => {
      resolve(output.includes('Stream #') && output.includes(': Audio:'));
    });
  });
}

export async function trimAndFormatVideo(videoPath: string, durationSeconds: number, jobId: string, format?: string): Promise<string> {
  const outDir = path.join(os.tmpdir(), 'vertex_jobs', jobId);
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `trimmed_${Date.now()}.mp4`);
  
  const hasAudio = await hasAudioStream(videoPath);
  
  const ffmpegArgs = ['-i', videoPath];
  if (!hasAudio) {
    ffmpegArgs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
  }
  
  if (!hasAudio) {
    ffmpegArgs.push('-map', '0:v', '-map', '1:a', '-shortest');
  } else {
    ffmpegArgs.push('-map', '0:v', '-map', '0:a');
  }

  let videoFilters: string[] = [];
  if (format === '1:1' || format === 'square' || format === 'single_post') {
    videoFilters.push('crop=min(iw\\,ih):min(iw\\,ih)');
  } else if (format === '4:5' || format === 'portrait' || format === 'portrait_post') {
    videoFilters.push('crop=iw:iw*5/4');
  }

  if (videoFilters.length > 0) {
    ffmpegArgs.push('-vf', videoFilters.join(','));
  }
  
  ffmpegArgs.push('-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', '-b:a', '128k', '-y', outPath);
  
  await runFfmpeg(ffmpegArgs);
  return outPath;
}

/**
 * Mezcla el video final con una pista de audio de fondo (MP3).
 * Aplica ducking (baja el volumen de la música para que no tape la voz).
 */
export async function mixAudioWithVideo(videoPath: string, audioUrl: string, jobId: string): Promise<string> {
  const outDir = path.join(os.tmpdir(), 'vertex_jobs', jobId);
  await fs.mkdir(outDir, { recursive: true });
  
  const audioPath = path.join(outDir, 'bgm.mp3');
  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error('No se pudo descargar el MP3 de fondo.');
  const arrayBuffer = await res.arrayBuffer();
  await fs.writeFile(audioPath, Buffer.from(arrayBuffer));
  
  const outPath = path.join(outDir, `final_mixed_${Date.now()}.mp4`);
  
  await runFfmpeg([
    '-i', videoPath,
    '-i', audioPath,
    '-filter_complex', '[1:a]volume=0.10[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]',
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-y',
    outPath
  ]);
  
  return outPath;
}

function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Aplica post-producción completa a un video crudo generado por IA:
 * - Reemplaza el audio nativo por TTS exacto.
 * - Quema los subtítulos (SRT) en pantalla.
 * - Añade marca de agua.
 * - Mezcla música de fondo con ducking.
 */
export async function applyFullPostProduction(opts: {
  videoPath: string;
  scenes: any[];
  jobId: string;
  backgroundMusicUrl?: string;
  adn: any;
  format: string;
  enable_tts?: boolean;
  isSmokeTest?: boolean;
}): Promise<string> {
  const { videoPath, scenes, jobId, backgroundMusicUrl, adn, format, enable_tts, isSmokeTest } = opts;
  const outDir = path.join(os.tmpdir(), 'vertex_jobs', jobId, 'post');
  await fs.mkdir(outDir, { recursive: true });

  const voiceId = adn.audio_engine?.voice_id || adn.voice_id || 'mateo';
  
  const resMap: Record<string, [number, number]> = {
    '9:16': [1080, 1920], '4:5': [1080, 1350], '1:1': [1080, 1080], '16:9': [1920, 1080]
  };
  const [width, height] = resMap[format] || resMap['9:16'];
  
  // 1. Generate combined ASS and TTS clips
  let fullAss = '';
  let cumulativeTime = 0;
  let globalWatermark = '@' + (adn.name?.replace(/\s+/g, '') || 'felizdeemprender');
  
  interface TtsClip {
    path: string;
    delayMs: number;
  }
  const ttsClips: TtsClip[] = [];
  
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const dur = s.duration || 5;
    const rawSubtitle = s.subtitle || s.text || ''; 
    const rawWatermark = s.watermark || globalWatermark;
    
    // Convertir saltos de línea reales a \\N para que libass (FFmpeg) los procese sin romper el archivo
    const subtitleText = rawSubtitle.replace(/\r?\n/g, '\\N');
    const watermarkText = rawWatermark.replace(/\r?\n/g, '\\N');
    const titleText = (s.title || s.text || '').replace(/\r?\n/g, '\\N');
    
    const sceneAss = generateAssFile(adn, s.segment_label || '', titleText, subtitleText, watermarkText, dur, width, height);
    
    if (i === 0) {
      fullAss = sceneAss.substring(0, sceneAss.indexOf('Dialogue:'));
    }
    
    const lines = sceneAss.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith('Dialogue:')) {
         const parts = line.split(',');
         parts[1] = formatAssTime(cumulativeTime);
         parts[2] = formatAssTime(cumulativeTime + dur);
         fullAss += parts.join(',') + '\n';
      }
    }
    
    const vText = s.voiceover || '';
    if (vText.trim() && enable_tts !== false) {
      const clipPath = await generateSpeechV2(vText.trim(), voiceId, isSmokeTest);
      ttsClips.push({ path: clipPath, delayMs: Math.round(cumulativeTime * 1000) });
    }
    
    cumulativeTime += dur;
  }
  
  const assPath = path.join(outDir, 'subs.ass');
  await fs.writeFile(assPath, fullAss, 'utf-8');

  // 2. Download background music
  let bgmPath: string | null = null;
  if (backgroundMusicUrl && backgroundMusicUrl.startsWith('http')) {
    bgmPath = path.join(outDir, 'bgm.mp3');
    try {
      const res = await fetch(backgroundMusicUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        await fs.writeFile(bgmPath, Buffer.from(arrayBuffer));
      }
    } catch (e) {
      console.warn('[PostProduction] Error downloading BGM:', e);
      bgmPath = null;
    }
  }

  // 3. Prepare FFmpeg complex filter
  const absAss = path.resolve(assPath).replace(/\\/g, '/');
  const fontsDir = process.platform === 'win32' 
      ? 'public/fonts' 
      : path.join(process.cwd(), 'public', 'fonts').replace(/\\/g, '/');
  
  const subtitlesFilter = process.platform === 'win32'
      ? `subtitles='${path.relative(process.cwd(), assPath).replace(/\\/g, '/')}':fontsdir='${fontsDir}'`
      : `subtitles=filename='${absAss}':fontsdir='${fontsDir}'`;
      
  const finalVideo = path.join(outDir, `final_post_${Date.now()}.mp4`);
  
  const ffmpegArgs = ['-i', videoPath];
  let filterComplex = '';
  let mapArgs: string[] = [];
  let nextInputIndex = 1;

  const ttsLabels: string[] = [];
  for (let i = 0; i < ttsClips.length; i++) {
    const clip = ttsClips[i];
    ffmpegArgs.push('-i', clip.path);
    const idx = nextInputIndex++;
    const label = `[tts${i}]`;
    // adelay on all channels
    filterComplex += `[${idx}:a]adelay=${clip.delayMs}|${clip.delayMs}${label};`;
    ttsLabels.push(label);
  }

  let masterTtsLabel = '';
  if (ttsLabels.length > 1) {
    const inputs = ttsLabels.join('');
    filterComplex += `${inputs}amix=inputs=${ttsLabels.length}:duration=longest:dropout_transition=2:normalize=0[master_tts];`;
    masterTtsLabel = '[master_tts]';
  } else if (ttsLabels.length === 1) {
    masterTtsLabel = ttsLabels[0];
  }

  let bgmLabel = '';
  if (bgmPath) {
    ffmpegArgs.push('-i', bgmPath);
    const idx = nextInputIndex++;
    filterComplex += `[${idx}:a]volume=0.10[bgm];`;
    bgmLabel = '[bgm]';
  }

  let finalAudioLabel = '';
  if (masterTtsLabel && bgmLabel) {
    // TTS + BGM -> Duck original video audio, mix TTS and BGM
    filterComplex += `[0:a]volume=0.3[va];[va]${masterTtsLabel}${bgmLabel}amix=inputs=3:duration=first:dropout_transition=2:normalize=0[aout]`;
    finalAudioLabel = '[aout]';
  } else if (masterTtsLabel) {
    // TTS only -> Duck original video audio, mix TTS
    filterComplex += `[0:a]volume=0.3[va];[va]${masterTtsLabel}amix=inputs=2:duration=first:dropout_transition=2:normalize=0[aout]`;
    finalAudioLabel = '[aout]';
  } else if (bgmLabel) {
    // BGM only -> DON'T duck original video audio, just mix with BGM smoothly
    filterComplex += `[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[aout]`;
    finalAudioLabel = '[aout]';
  } else {
    finalAudioLabel = '0:a?';
  }
  
  if (filterComplex) {
    filterComplex += `;[0:v]${subtitlesFilter}[vout]`;
    mapArgs = ['-map', '[vout]', '-map', finalAudioLabel];
  } else {
    filterComplex = `[0:v]${subtitlesFilter}[vout]`;
    mapArgs = ['-map', '[vout]', '-map', finalAudioLabel];
  }
  
  ffmpegArgs.push('-filter_complex', filterComplex);
  ffmpegArgs.push(...mapArgs);
  ffmpegArgs.push('-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', '-b:a', '128k', '-y', finalVideo);
  
  console.log(`[PostProduction] Running FFmpeg...`);
  await runFfmpeg(ffmpegArgs);
  
  return finalVideo;
}
