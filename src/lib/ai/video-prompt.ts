import { loadAdnConfig } from '@/lib/adn-utils';

/**
 * @fileOverview Genera prompts de video promocional a partir del ADN activo + datos de venta del curso.
 * Implementa `video-prompt-template.md` §1 (Omni), §2 (avatar) y §3 (export por motor).
 * La fuente única es el ADN (mood/guion/visual) + la landing del curso (precio/CTA).
 */

export interface LandingData {
  courseTitle?: string;
  price?: number;
  oldPrice?: number;
  activeUntil?: string;
  ctaText?: string;
  benefit?: string;
}

export interface VideoPromptInput {
  adnId: string;
  landing: LandingData;
  format: string; // 9:16 | 1:1 | 16:9 | 4:5
  engine: 'gemini-omni' | 'seedance' | 'veo' | 'runway' | 'pika' | 'wan';
  avatar?: boolean;
}

export interface VideoPromptResult {
  prompt: string;
  adnId: string;
  adnName?: string;
  mood?: string;
  targetFormat?: string;
  voiceId?: string;
  slices: any[];
}

// Mapeo segmento del ADN → estructura de conversión (video-prompt-template.md §1.4)
const SEGMENT_TO_COPY: Record<string, string> = {
  GANCHO: 'HOOK',
  VALOR: 'PROBLEMA / SOLUCIÓN',
  CTA: 'OFERTA',
  CIERRE: 'CTA'
};

const CAMERA_MODE_DESC: Record<string, string> = {
  zoom: 'slow push-in',
  pan: 'gentle pan',
  static: 'locked-off static shot'
};

function aspectRatioFromFormat(format: string): string {
  const map: Record<string, string> = {
    '9:16': 'vertical 9:16',
    '1:1': 'square 1:1',
    '16:9': 'horizontal 16:9',
    '4:5': 'portrait 4:5'
  };
  return map[format] || 'vertical 9:16';
}

/**
 * Construye el bloque ADN (§0.5 del template) a partir del config cargado.
 */
export function buildAdnBlock(adn: any, landing: LandingData): string {
  const slices = (adn.slices || []).map((s: any) =>
    `  ${s.segment_label}: texto "${s.text || ''}" · voiceover "${s.voiceover || ''}" · ${s.duration || 5}s`
  ).join('\n');

  const voiceId = adn.audio_engine?.voice_id || adn.voice_id || 'mateo';

  return `ADN ACTIVO — ${adn.id || adn.name || ''} (${adn.name || 'Sin nombre'})
MOOD: ${adn.description || 'estilo no definido'}

GUION (del blueprint — NO inventar texto):
${slices || '  (sin slices en blueprint)'}

VISUAL:
  Formato: ${adn.target_format || 'vertical'}
  Motion: camera segment_rules del motion.json
  Voz en off: ${voiceId}

CURSO A VENDER:
  Título: ${landing.courseTitle || '—'}
  Precio: ${landing.price ?? '—'}${landing.oldPrice ? ` (antes ${landing.oldPrice})` : ''}${landing.activeUntil ? ` · Urgencia: ${landing.activeUntil}` : ''}
  CTA: ${landing.ctaText || '—'}

REGLAS FIJAS:
  - El guion (texto + voiceover) viene del ADN: no se reescribe ni se inventa.
  - Sin texto quemado en el video (subtítulos en .srt aparte).
  - Sin clichés de éxito (dólares, coches, "hacete rico").
  - Voz en off siempre ${voiceId}; música de fondo -16 LUFS con ducking.`;
}

/**
 * Prompt de escena por slice (video-prompt-template.md §1.2) usado en export a Veo/Runway/Pika/Wan.
 */
function buildScenePrompt(adn: any, slice: any, index: number, total: number): string {
  const rules = adn.camera?.segment_rules?.[slice.segment_label] || adn.camera?.segment_rules?.['GANCHO'] || {};
  const mode = CAMERA_MODE_DESC[rules.mode] || 'subtle motion';
  const intensity = rules.intensity ? ` (intensity ${rules.intensity})` : '';
  const transition = rules.transition || 'fade';

  return `ESCENA ${index + 1}/${total} — segmento: ${slice.segment_label}
Imagen: ${slice.imageUrl || 'generar acorde al mood del ADN, sin texto'}
Motion: ${mode}${intensity}, duración ${slice.duration || 5}s
Texto en pantalla (SRT): "${slice.text || ''}"
Voz en off: "${slice.voiceover || ''}" — voz ${adn.audio_engine?.voice_id || 'mateo'}
Transición de salida: ${transition} ${rules.transition_duration || 0.5}s`;
}

/**
 * Prompt Omni end-to-end text-to-video (§1.4–1.5 del template).
 * Estructura de conversión: HOOK → PROBLEMA → SOLUCIÓN/OFERTA → CTA.
 */
export function buildOmniPrompt(adn: any, landing: LandingData, format: string): string {
  const block = buildAdnBlock(adn, landing);
  const slices = adn.slices || [];

  // Mapear slices reales del ADN a la estructura de conversión, en orden del blueprint
  const copySegments: string[] = [];
  slices.forEach((s: any) => {
    const label = SEGMENT_TO_COPY[s.segment_label] || s.segment_label;
    copySegments.push(`${label}: ${s.voiceover || s.text || ''}`);
  });
  if (copySegments.length === 0) {
    copySegments.push('HOOK: gancho emocional sobre el problema del alumno');
    copySegments.push('PROBLEMA / SOLUCIÓN: fricción que resuelve el curso');
    copySegments.push('OFERTA: promesa + precio');
    copySegments.push('CTA: urgencia + llamado a la acción');
  }

  return `[ADN DEL GUION]
${block}

VIDEO PROMOCIONAL DE CURSO — text-to-video, 10s máx por clip
Aspecto: ${aspectRatioFromFormat(format)} · estilo de marca: del ADN
Guion (estructura de conversión, respetando voiceover/textos del ADN):
${copySegments.map(s => `  ${s}`).join('\n')}
Reglas: del ADN — voz ${adn.audio_engine?.voice_id || 'mateo'}, tono según mood, sin texto quemado, sin clichés.`;
}

/**
 * Prompt export por motor (§3.1–3.2 del template).
 * Omni: text-to-video (§1.4). Seedance: segmentos temporales. Veo: control de cámara. Runway/Pika/Wan: escena simple.
 */
export function buildExportPrompt(adn: any, landing: LandingData, format: string, engine: VideoPromptInput['engine'], avatar: boolean): string {
  const block = buildAdnBlock(adn, landing);
  const slices = adn.slices || [];
  const aspect = aspectRatioFromFormat(format);
  const totalDuration = slices.reduce((acc: number, s: any) => acc + (s.duration || 5), 0) || 15;
  const char = avatar
    ? 'a warm presenter on camera, consistent face, clothing and hairstyle throughout without deformation'
    : 'cinematic product/context scenes';

  const scenes: string[] = slices.map((s: any, i: number) => buildScenePrompt(adn, s, i, slices.length));

  switch (engine) {
    case 'seedance': {
      // Seedance 2.0: segmentos temporales acumulativos (video-prompt-template.md §3.2)
      let cursor = 0;
      const segments = slices.map((s: any) => {
        const start = cursor;
        cursor += s.duration || 5;
        return `  ${start}-${cursor} seconds: [${s.segment_label}] ${s.voiceover || s.text || ''}, camera ${s.segment_label?.toLowerCase() === 'cta' ? 'gentle push' : 'natural motion'}, ${char}`;
      });
      return `[ADN DEL GUION]
${block}

${totalDuration}-second cinematic promo for the online course "${landing.courseTitle || 'curso'}",
ultra-realistic quality, warm cinematic light, ${aspect},
characters maintain consistent face, clothing and hairstyle throughout
without deformation, drift or artifacts, shallow depth of field, warm film grain.

${segments.join('\n')}

Sin texto quemado (subtítulos aparte); sin clichés de éxito; voz en off ${adn.audio_engine?.voice_id || 'mateo'}.`;
    }
    case 'veo':
      return `[ADN DEL GUION]
${block}

${totalDuration}-second promo, ${aspect}, cinematic camera (push-in on GANCHO, pan on VALOR, close-up on CTA), lip-sync nativo si hay presentador.
Escenas:
${scenes.map(s => `  ${s}`).join('\n')}

Sin texto quemado; sin clichés de éxito; voz en off ${adn.audio_engine?.voice_id || 'mateo'}.`;
    case 'runway':
    case 'pika':
    case 'wan':
    default:
      return `[ADN DEL GUION]
${block}

${totalDuration}-second promo, ${aspect}, consistent ${char}.
Escenas:
${scenes.map(s => `  ${s}`).join('\n')}

Sin texto quemado; sin clichés de éxito.`;
  }
}

/**
 * Prompt avatar script-to-presenter (§2.2 del template).
 */
export function buildAvatarScript(adn: any, landing: LandingData): string {
  const slices = adn.slices || [];
  const scenes = slices.map((s: any, i: number) =>
    `ESCENA ${i + 1}: ${s.segment_label}
[Avatar mira a cámara]
TEXTO: "${s.voiceover || s.text || ''}"
[Pista de dirección: ${s.segment_label === 'CTA' || s.segment_label === 'CIERRE' ? 'tono decidido, despedida' : 'gesto natural, pausa breve'}]`
  ).join('\n\n');

  return `BRIEF DE VIDEO CON AVATAR
Curso: "${landing.courseTitle || '—'}"
Avatar: presentadora profesional, vestimenta formal-casual, encuadre medio.
Idioma: español rioplatense, tono cálido y empoderante.
Subtítulos: sí, sincronizados con la voz (SRT).

GUION (script-to-presenter):
${scenes}`;
}

/**
 * API principal: carga el ADN activo y devuelve el prompt del motor pedido.
 */
export async function buildVideoPrompt(input: VideoPromptInput): Promise<VideoPromptResult> {
  const adn = await loadAdnConfig(input.adnId);

  let prompt: string;
  if (input.engine === 'gemini-omni') {
    prompt = buildOmniPrompt(adn, input.landing, input.format);
  } else if (input.avatar) {
    prompt = buildAvatarScript(adn, input.landing);
  } else {
    prompt = buildExportPrompt(adn, input.landing, input.format, input.engine, input.avatar || false);
  }

  return {
    prompt,
    adnId: input.adnId,
    adnName: adn.name,
    mood: adn.description,
    targetFormat: adn.target_format,
    voiceId: adn.audio_engine?.voice_id || adn.voice_id || 'mateo',
    slices: adn.slices || []
  };
}
