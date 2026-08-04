import { buildAvatarScript } from '@/lib/ai/video-prompt';

/**
 * @fileOverview Wrapper de plataformas de avatar (HeyGen / Synthesia / Tavus).
 * Omni NO maneja avatar — el presentador se externaliza con guion script-to-presenter
 * (video-prompt-template.md §2). Si hay API key del proveedor configurada, se envía
 * por API; si no, el job devuelve el script listo para copiar/pegar.
 */

export type AvatarProvider = 'heygen' | 'synthesia' | 'tavus';

export interface AvatarRequest {
  adn: any;
  landing: { courseTitle?: string };
  provider?: AvatarProvider;
  avatarId?: string;
  format?: string;
  duration?: number;
}

export interface AvatarResult {
  script: string;
  provider: AvatarProvider;
  sent?: boolean;
  videoUri?: string;
  videoPath?: string;
}

const PROVIDER_ENV: Record<AvatarProvider, string> = {
  heygen: 'HEYGEN_API_KEY',
  synthesia: 'SYNTHESIA_API_KEY',
  tavus: 'TAVUS_API_KEY'
};

/**
 * Genera el script-to-presenter desde el ADN + landing (siempre disponible).
 */
export function buildScript(req: AvatarRequest): string {
  return buildAvatarScript(req.adn, req.landing);
}

/**
 * Envía el script al proveedor de avatar elegido si hay API key.
 * Si no hay key, devuelve { sent: false } para que el job entregue el script.
 */
export async function generateAvatarVideo(req: AvatarRequest): Promise<AvatarResult> {
  const script = buildScript(req);
  const provider: AvatarProvider = req.provider || 'heygen';
  const apiKey = process.env[PROVIDER_ENV[provider]];

  if (!apiKey) {
    console.warn(`[Avatar] No hay ${PROVIDER_ENV[provider]} configurada — devolviendo script-to-presenter.`);
    return { script, provider, sent: false };
  }

  try {
    switch (provider) {
      case 'heygen': {
        // HeyGen: POST /v1/video.generate (script de texto plano)
        const res = await fetch('https://api.heygen.com/v1/video.generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey
          },
          body: JSON.stringify({
            video_inputs: [
              {
                character: { type: 'avatar', avatar_id: req.avatarId || 'default' },
                voice: { type: 'text', input_text: script }
              }
            ],
            dimension: { width: 1080, height: req.format === '1:1' ? 1080 : 1920 }
          })
        });
        if (!res.ok) throw new Error(`[Avatar:HeyGen] HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return { script, provider, sent: true, videoUri: data?.data?.video_url };
      }
      case 'synthesia': {
        // Synthesia: POST /v2/videos
        const res = await fetch('https://api.synthesia.io/v2/videos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            test: true,
            visibility: 'private',
            title: `Promo ${req.landing.courseTitle || ''}`,
            input: [{ type: 'avatar', avatarId: req.avatarId || 'anna', background: 'green' },
                    { type: 'script', input: script, avatarId: req.avatarId || 'anna' }]
          })
        });
        if (!res.ok) throw new Error(`[Avatar:Synthesia] HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return { script, provider, sent: true, videoUri: data?.data?.download_url || data?.data?.video?.url };
      }
      case 'tavus': {
        // Tavus: POST /v3/videos (talking avatar)
        const res = await fetch('https://tavusapi.com/v3/videos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey
          },
          body: JSON.stringify({
            avatar_id: req.avatarId || 'default',
            script: script,
            audio_voice: 'default'
          })
        });
        if (!res.ok) throw new Error(`[Avatar:Tavus] HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return { script, provider, sent: true, videoUri: data?.data?.url };
      }
      default:
        return { script, provider, sent: false };
    }
  } catch (e: any) {
    console.error('[Avatar] Error al enviar al proveedor:', e.message);
    return { script, provider, sent: false };
  }
}
