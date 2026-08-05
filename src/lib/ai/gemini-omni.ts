import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * @fileOverview Wrapper de Gemini Omni Flash (Interactions API) para text-to-video.
 * Endpoint: POST https://generativelanguage.googleapis.com/v1beta/interactions
 * Modelo: gemini-omni-flash-preview ($0.10/s 720p, audio sincronizado, 3–10s/clip).
 *
 * Request (plano, referencia ai.google.dev/gemini-api/docs/omni):
 *   { "model": "gemini-omni-flash-preview",
 *     "input": "<prompt>",
 *     "response_format": { "type": "video", "aspect_ratio": "9:16" } }
 *
 * Response: interaction { id, status, steps[] } — el video vive en
 * steps[].content[] con type "video" (data base64 o uri). Polling: GET /v1beta/interactions/{id}.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-omni-flash-preview';
const MAX_DURATION_SECONDS = 10;

export interface OmniVideoRequest {
  prompt: string;
  model?: string;
  format?: string; // 9:16 | 1:1 | 16:9 | 4:5 (Omni solo soporta 9:16 / 16:9)
  durationSeconds?: number;
  delivery?: 'bytes' | 'uri';
}

export interface OmniVideoResult {
  videoPath?: string;      // archivo local (delivery bytes)
  videoUri?: string;       // URL (delivery uri)
  videoBytes?: string;     // base64 (delivery bytes)
  mimeType?: string;
  durationSeconds?: number;
}

// Omni Flash solo soporta 9:16 y 16:9. Los demás formatos se resuelven a vertical.
function aspectRatio(format: string): string {
  return format === '16:9' ? '16:9' : '9:16';
}

/**
 * Extrae el primer parte de video de la respuesta (steps[].content[] con type "video").
 */
function extractVideoPart(data: any): { mime_type?: string; data?: string; uri?: string } | null {
  const steps: any[] = data?.steps || [];
  for (const step of steps) {
    const contents: any[] = step?.content || [];
    for (const part of contents) {
      if (part?.type === 'video') return part;
    }
  }
  // Conveniencia SDK: output_video
  if (data?.output_video?.data || data?.output_video?.uri) return data.output_video;
  return null;
}

/**
 * Crea la interacción (POST /v1beta/interactions). Devuelve el interaction object.
 */
async function createInteraction(apiKey: string, prompt: string, format: string, delivery: 'bytes' | 'uri'): Promise<any> {
  const responseFormat: any = {
    type: 'video',
    aspect_ratio: aspectRatio(format)
  };
  if (delivery === 'uri') responseFormat.delivery = 'uri';

  const body = {
    model: DEFAULT_MODEL,
    input: prompt,
    response_format: responseFormat
  };

  const res = await fetch(`${API_BASE}/interactions?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[Omni:Interactions] HTTP ${res.status}: ${errText}`);
  }
  return res.json();
}

/**
 * Polling GET /v1beta/interactions/{id} hasta que status === 'completed' | 'failed'.
 */
async function pollInteraction(apiKey: string, interactionId: string, timeoutMs: number = 300000): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${API_BASE}/interactions/${interactionId}?key=${apiKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[Omni:Poll] HTTP ${res.status}: ${errText}`);
    }
    const data = await res.json();

    if (data.status === 'completed') return data;
    if (data.status === 'failed') throw new Error(`[Omni:Poll] La interacción falló: ${JSON.stringify(data.error || data)}`);

    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error(`[Omni:Poll] Timeout esperando el video (${timeoutMs / 1000}s).`);
}

/**
 * Genera un clip de video (3–10s) con Gemini Omni Flash.
 * - delivery 'uri': devuelve videoUri (recomendado para >4MB).
 * - delivery 'bytes': devuelve videoBytes base64.
 */
export async function generateOmniVideo(input: OmniVideoRequest): Promise<OmniVideoResult> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new Error('[Omni] No se ha configurado GOOGLE_GENAI_API_KEY.');

  const delivery = input.delivery || 'bytes';
  let result = await createInteraction(apiKey, input.prompt, input.format || '9:16', delivery);

  // Si la creación no devolvió el video aún, hacemos polling por id
  if (result.id && result.status && result.status !== 'completed') {
    result = await pollInteraction(apiKey, result.id);
  }

  const part = extractVideoPart(result);
  if (!part) {
    throw new Error('[Omni] No se encontró video en la respuesta del modelo.');
  }

  const duration = Math.min(input.durationSeconds || MAX_DURATION_SECONDS, MAX_DURATION_SECONDS);

  if (part.uri) {
    return { videoUri: part.uri, mimeType: part.mime_type || 'video/mp4', durationSeconds: duration };
  }
  if (part.data) {
    return { videoBytes: part.data, mimeType: part.mime_type || 'video/mp4', durationSeconds: duration };
  }
  throw new Error('[Omni] El parte de video no tiene data ni uri.');
}

/**
 * Descarga un video remoto (videoUri) a un archivo local.
 */
export async function downloadOmniVideo(uri: string, jobId: string): Promise<string> {
  const outDir = path.join(os.tmpdir(), 'render_jobs_v2', jobId);
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, 'omni_clip.mp4');

  const res = await fetch(uri, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`[Omni:Download] HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, buffer);
  return outPath.replace(/\\/g, '/');
}

/**
 * Guarda bytes base64 a un archivo local.
 */
export async function saveOmniBytes(base64: string, jobId: string): Promise<string> {
  const outDir = path.join(os.tmpdir(), 'render_jobs_v2', jobId);
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, 'omni_clip.mp4');
  await fs.writeFile(outPath, Buffer.from(base64, 'base64'));
  return outPath.replace(/\\/g, '/');
}
