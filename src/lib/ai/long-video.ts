import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * @fileOverview Wrapper de AI Video API — modelo `long-video`.
 * Genera un video continuo de 4–180s en un solo request (sin encadenar clips).
 * Endpoint: POST https://api.aivideoapi.ai/v1/videos/generations
 * Providers: happyhorse (default) | seedance (Seedance 2.0).
 * Continuity: consistent (mismo personaje/fondo con imágenes de referencia) | seamless.
 */

const API_BASE = 'https://api.aivideoapi.ai';

export type LongVideoProvider = 'happyhorse' | 'seedance';
export type LongVideoContinuity = 'consistent' | 'seamless';

export interface LongVideoRequest {
  prompt: string;
  duration: number; // 4–180 segundos
  provider?: LongVideoProvider;
  resolution?: '480p' | '720p' | '1080p';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  continuityMode?: LongVideoContinuity;
  style?: string;
  imageUrls?: string[]; // hasta 5 imágenes de referencia globales (personaje)
  nativeAudioContinuity?: boolean; // solo seedance
}

export interface LongVideoResult {
  videoPath?: string; // archivo local descargado
  videoUri?: string;  // URL del proveedor
  mimeType?: string;
  durationSeconds?: number;
  taskId?: string;
}

function apiKey(): string {
  const key = process.env.AIVIDEO_API_KEY;
  if (!key) throw new Error('[LongVideo] No se ha configurado AIVIDEO_API_KEY.');
  return key;
}

/**
 * Crea la tarea de generación (POST /v1/videos/generations). Devuelve { taskId, status }.
 */
async function createTask(key: string, input: LongVideoRequest): Promise<any> {
  const body = {
    model: 'long-video',
    input: {
      prompt: input.prompt,
      duration: input.duration,
      provider: input.provider || 'seedance',
      resolution: input.resolution || '720p',
      aspect_ratio: input.aspectRatio || '16:9',
      continuity_mode: input.continuityMode || 'consistent',
      ...(input.style ? { style: input.style } : {}),
      ...(input.imageUrls && input.imageUrls.length > 0 ? { image_urls: input.imageUrls.slice(0, 5) } : {}),
      ...(input.provider === 'seedance' ? { native_audio_continuity: input.nativeAudioContinuity ?? true } : {})
    }
  };

  const res = await fetch(`${API_BASE}/v1/videos/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[LongVideo:Create] HTTP ${res.status}: ${errText}`);
  }
  return res.json();
}

/**
 * Polling GET /v1/tasks/{id} hasta status completed | failed.
 */
async function pollTask(key: string, taskId: string, timeoutMs: number = 600000): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${API_BASE}/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[LongVideo:Poll] HTTP ${res.status}: ${errText}`);
    }
    const data = await res.json();

    if (data.status === 'completed') return data;
    if (data.status === 'failed') {
      throw new Error(`[LongVideo:Poll] La tarea falló: ${JSON.stringify(data.error || data)}`);
    }

    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error(`[LongVideo:Poll] Timeout esperando el video (${timeoutMs / 1000}s).`);
}

/**
 * Extrae la primera URL de video del resultado de la tarea.
 */
function extractVideoUrl(data: any): string | null {
  if (data?.output?.urls && data.output.urls.length > 0) return data.output.urls[0];
  if (data?.output?.url) return data.output.url;
  if (Array.isArray(data?.output)) return data.output[0] || null;
  return null;
}

/**
 * Genera un video largo (4–180s) con AI Video API.
 * Devuelve el archivo local descargado (videoPath) para subir a Drive.
 */
export async function generateLongVideo(input: LongVideoRequest): Promise<LongVideoResult> {
  const key = apiKey();
  const created = await createTask(key, input);

  const taskId = created.taskId || created.id || created.data?.taskId;
  if (!taskId) throw new Error(`[LongVideo] No se obtuvo taskId: ${JSON.stringify(created)}`);

  const task = await pollTask(key, taskId);
  const videoUri = extractVideoUrl(task);
  if (!videoUri) throw new Error('[LongVideo] No se encontró URL de video en la respuesta.');

  return {
    videoUri,
    taskId,
    mimeType: 'video/mp4',
    durationSeconds: input.duration
  };
}

/**
 * Descarga el video remoto (videoUri) a un archivo local para subir a Drive.
 */
export async function downloadLongVideo(uri: string, jobId: string): Promise<string> {
  const outDir = path.join(os.tmpdir(), 'render_jobs_v2', jobId);
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, 'long_clip.mp4');

  const res = await fetch(uri, { signal: AbortSignal.timeout(300000) });
  if (!res.ok) throw new Error(`[LongVideo:Download] HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, buffer);
  return outPath.replace(/\\/g, '/');
}
