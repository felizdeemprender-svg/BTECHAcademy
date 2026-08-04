import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * @fileOverview Wrapper de Gemini Omni Flash (Interactions API) para text-to-video.
 * Endpoint: POST https://generativelanguage.googleapis.com/v1beta/interactions
 * Modelo: gemini-omni-flash-preview ($0.10/s 720p, audio sincronizado, 10s máx/clip).
 * Patrón HTTP directo (sin SDK) como ya hace generate-image/route.ts.
 *
 * Referencia: plan-generacion-video.md §6 + video-prompt-template.md §1.4
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-omni-flash-preview';
const MAX_DURATION_SECONDS = 10;

export interface OmniVideoRequest {
  prompt: string;
  model?: string;
  format?: string; // 9:16 | 1:1 | 16:9 | 4:5
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

function aspectRatio(format: string): string {
  const map: Record<string, string> = {
    '9:16': '9:16',
    '1:1': '1:1',
    '16:9': '16:9',
    '4:5': '4:5'
  };
  return map[format] || '9:16';
}

/**
 * POST /v1beta/interactions — crea la interacción (long-running operation).
 * Devuelve el operation `name` para hacer polling con GET.
 */
async function createInteraction(
  apiKey: string,
  prompt: string,
  format: string,
  durationSeconds: number,
  delivery: 'bytes' | 'uri'
): Promise<string> {
  const model = DEFAULT_MODEL;
  const interactionBody = {
    model: `models/${model}`,
    request: {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseModalities: ['video'],
        video: {
          durationSeconds: Math.min(Math.max(1, durationSeconds), MAX_DURATION_SECONDS),
          aspectRatio: aspectRatio(format)
        }
      },
      responseFormat: {
        type: 'video'
      }
    },
    delivery: {
      type: delivery
    }
  };

  const res = await fetch(`${API_BASE}/interactions?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(interactionBody)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[Omni:Interactions] HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();

  // La respuesta puede ser un operation { name, ... } o el contenido directo.
  if (data.name) return data.name;
  if (data.interaction?.name) return data.interaction.name;
  throw new Error('[Omni:Interactions] No se recibió un operation name.');
}

/**
 * Polling GET /v1beta/{operation} hasta que done === true.
 */
async function pollOperation(apiKey: string, operationName: string, timeoutMs: number = 300000): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${API_BASE}/${operationName}?key=${apiKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[Omni:Poll] HTTP ${res.status}: ${errText}`);
    }
    const data = await res.json();

    if (data.done) {
      if (data.error) throw new Error(`[Omni:Poll] Operation error: ${JSON.stringify(data.error)}`);
      return data.response || data;
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error(`[Omni:Poll] Timeout esperando el video (${timeoutMs / 1000}s).`);
}

/**
 * Genera un clip de video (≤10s) con Gemini Omni Flash.
 * - delivery 'uri': devuelve videoUri (recomendado para >4MB).
 * - delivery 'bytes': descarga a un archivo temporal y devuelve videoPath.
 */
export async function generateOmniVideo(input: OmniVideoRequest): Promise<OmniVideoResult> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new Error('[Omni] No se ha configurado GOOGLE_GENAI_API_KEY.');

  const duration = Math.min(Math.max(1, input.durationSeconds || MAX_DURATION_SECONDS), MAX_DURATION_SECONDS);
  const delivery = input.delivery || (duration >= 8 ? 'uri' : 'bytes');

  const operationName = await createInteraction(apiKey, input.prompt, input.format || '9:16', duration, delivery);
  const result = await pollOperation(apiKey, operationName);

  // Formato posible de la respuesta con video
  const videoPart = (result?.candidates?.[0]?.content?.parts || result?.parts || []).find(
    (p: any) => p.inlineVideo?.mimeType || p.video?.uri || p.inlineData
  );

  if (videoPart?.inlineVideo) {
    const { mimeType, data } = videoPart.inlineVideo;
    return {
      videoBytes: data,
      mimeType: mimeType || 'video/mp4',
      durationSeconds: duration
    };
  }

  if (videoPart?.inlineData) {
    const { mimeType, data } = videoPart.inlineData;
    return {
      videoBytes: data,
      mimeType: mimeType || 'video/mp4',
      durationSeconds: duration
    };
  }

  if (videoPart?.video?.uri) {
    return {
      videoUri: videoPart.video.uri,
      mimeType: videoPart.video.mimeType || 'video/mp4',
      durationSeconds: duration
    };
  }

  // Fallback: campo delivery.uri a nivel raíz
  if (result?.delivery?.uri) {
    return {
      videoUri: result.delivery.uri,
      durationSeconds: duration
    };
  }

  throw new Error('[Omni] No se encontró video en la respuesta del modelo.');
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
