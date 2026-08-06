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

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT POR ESCENAS REALES (§3.3 — multi-escena, específico por motor)
// Usa las escenas que el usuario editó (slides) en lugar de los slices del ADN,
// más datos de producción: persona, subtítulos, marca de agua, voz y formato.
// ─────────────────────────────────────────────────────────────────────────────

export interface ScenePromptScene {
  segment?: string;
  text?: string;
  subtitle?: string;
  voiceover?: string;
  watermark?: string;
  imageUrl?: string;
  duration?: number;
}

export interface ScenePromptOptions {
  adn: any;
  landing: LandingData;
  format: string;
  engine: 'seedance' | 'veo' | 'runway' | 'pika' | 'wan';
  scenes: ScenePromptScene[];
  persona?: { enabled?: boolean; description?: string };
  subtitles?: boolean;
  voiceId?: string;
  marketingName?: string;
  /** true solo en el perScene de la ÚLTIMA escena (para el cierre con música). */
  finalScene?: boolean;
}

export interface ScenePromptResult {
  prompt: string;
  perScene: string[];
  totalDuration: number;
  engine: string;
  format: string;
}

// Helpers de cámara según la sintaxis nativa de cada editor (basado en guías oficiales)
function cameraMoveFor(adn: any, segment?: string): string {
  const rules = adn.camera?.segment_rules?.[segment || 'GANCHO'] || adn.camera?.segment_rules?.['GANCHO'] || {};
  const move = rules.mode === 'zoom' ? 'slow push-in' : rules.mode === 'pan' ? 'steady pan' : 'locked-off static shot';
  return move;
}

function cameraFramingFor(segment?: string): string {
  const seg = (segment || '').toLowerCase();
  if (seg === 'gancho' || seg === 'hook') return 'close-up';
  if (seg === 'cta' || seg === 'cierre') return 'medium shot';
  return 'medium close-up';
}

function voiceName(opts: ScenePromptOptions, adn: any): string {
  return opts.voiceId || adn.audio_engine?.voice_id || adn.voice_id || 'mateo';
}

function personaText(opts: ScenePromptOptions): string | null {
  if (!opts.persona?.enabled) return null;
  return opts.persona.description || 'presentadora profesional, consistente';
}

function courseLine(landing: LandingData): string {
  const cta = landing.ctaText ? ` · CTA: "${landing.ctaText}"` : '';
  const price = landing.price != null ? ` · precio: ${landing.price}` : '';
  return `curso "${landing.courseTitle || 'curso'}"${cta}${price}`;
}

function moodOf(adn: any): string {
  return adn.description || 'estilo de marca definido por el ADN';
}

/**
 * Candado de consistencia multi-clip para montaje con FFmpeg.
 * Fuerza que TODOS los clips compartan: misma voz, mismo personaje (ropa/look),
 * mismo fondo cuando el segmento es el mismo, y música que cierra en la última escena.
 */
function consistencyLock(opts: ScenePromptOptions, adn: any, lang: 'es' | 'en'): string {
  const persona = personaText(opts);
  const voice = voiceName(opts, adn);
  const identity = persona
    ? persona
    : 'escena sin presentador/a, sujetos de producto consistentes';
  const mood = moodOf(adn);

  if (lang === 'en') {
    return `CONSISTENCY (multi-clip, final edit in FFmpeg):
- Same narrator voice (${voice}) across every clip; identical delivery, no pitch change.
- Same character: ${identity}. Same clothing, hairstyle, build and framing in every clip.
- Same background/set whenever the scene shares the same message/segment; no set redesign between clips.
- Music: one continuous background track across all clips${opts.finalScene ? ', ending with a final swell and fade-out in this last clip.' : '.'}`;
  }

  return `CONSISTENCIA (multi-clip, montaje final con FFmpeg):
- Misma voz de narrador (${voice}) en todos los clips; misma entonación, sin cambios de tono.
- Mismo personaje: ${identity}. Misma ropa, peinado, contextura y encuadre en cada clip.
- Mismo fondo/escenografía siempre que la escena comparta el mismo mensaje/segmento; no rediseñar el set entre clips.
- Música: una sola pista de fondo continua en todos los clips${opts.finalScene ? ', cerrando con crescendo y fade-out en este último clip.' : '.'}`;
}

/**
 * SKIN SEEDANCE 2.0 (ByteDance) — sintaxis oficial:
 * Fórmula por shot: Sujeto + Acción + Escena + Luz/color + Cámara + Estilo + Calidad + Restricciones.
 * Símbolos: {} diálogo · 【】subtítulos on-screen · （）música · <> efectos de sonido.
 * Shot list numerado secuencial: el orden del listado define la secuencia.
 */
function buildSeedancePrompt(adn: any, opts: ScenePromptOptions): string {
  const { scenes, landing } = opts;
  const persona = personaText(opts);

  const shots = scenes.map((s, i) => {
    const segment = s.segment || 'VALOR';
    const subject = persona || 'escena cinematográfica de producto';
    const action = s.voiceover || s.text || `contenido del segmento ${segment}`;
    const camera = cameraMoveFor(adn, segment);
    const framing = cameraFramingFor(segment);
    const onScreen = s.text ? `, 【${s.text}】` : '';
    return `Shot ${i + 1}: ${subject} realizando ${action}${onScreen}. Luz cálida de ${moodOf(adn)}. ${framing}, ${camera}. Estilo realista premium, calidad 4K. Audio: {${s.voiceover || ''}}${s.watermark ? `, marca de agua "${s.watermark}"` : ''}, （música de fondo）.`;
  }).join('\n');

  const constraint = opts.subtitles
    ? 'Restricciones: mantener consistencia de identidad y sin deformación; subtítulos solo entre 【】.'
    : 'Restricciones: mantener consistencia de identidad y sin deformación; sin texto quemado.';

  return `Promo de ${courseLine(landing)} para ${opts.format}.
${shots}

${constraint}

${consistencyLock(opts, adn, 'es')}`;
}

/**
 * SKIN VEO 3 (Google) — 7 capas, AUDIO PRIMERO (el diálogo es la palanca más fuerte):
 * Audio → Sujeto → Acción → Escena → Cámara → Iluminación → Estilo.
 * Cada capa en su propia frase; una sola acción dominante por clip.
 */
function buildVeoPrompt(adn: any, opts: ScenePromptOptions): string {
  const { scenes, landing } = opts;
  const persona = personaText(opts);
  const voice = voiceName(opts, adn);

  const shots = scenes.map((s, i) => {
    const segment = s.segment || 'VALOR';
    const subject = persona || `el contexto del segmento ${segment}`;
    const action = s.voiceover || s.text || `mostrar el valor de ${segment}`;
    const camera = cameraMoveFor(adn, segment);
    const framing = cameraFramingFor(segment);
    const audio = s.voiceover
      ? `"${s.voiceover}"` 
      : `sonido ambiente discreto acorde a ${moodOf(adn)}`;
    return `Audio: ${audio}, narración en ${voice}. Sujeto: ${subject}. Acción: ${action}. Escena: ${moodOf(adn)}. Cámara: ${framing}, ${camera}. Iluminación: cálida cinematográfica. Estilo: fotografía premium, grano sutil, sin clichés de éxito.`;
  }).join('\n');

  return `Promo de ${courseLine(landing)} para ${opts.format}. Narración: ${voice}.
${shots}

Regla: mantener la misma identidad visual entre clips; una sola acción dominante por clip.

${consistencyLock(opts, adn, 'es')}`;
}

/**
 * SKIN RUNWAY GEN-4 — MOTION FIRST (la imagen fija look/composición):
 * "The camera [motion] as the subject [action]". Positivo, directo.
 * Una escena por generación; estructura mínima porque el look ya viene de la imagen.
 */
function buildRunwayPrompt(adn: any, opts: ScenePromptOptions): string {
  const { scenes, landing } = opts;
  const persona = personaText(opts);

  const shots = scenes.map((s, i) => {
    const segment = s.segment || 'VALOR';
    const subject = persona || 'the subject';
    const action = s.voiceover || s.text || `move to express ${segment}`;
    const camera = cameraMoveFor(adn, segment);
    return `The ${camera} as ${subject} ${action}.`;
  }).join('\n');

  return `Motion-first promo for ${landing.courseTitle || 'a course'} (${opts.format}). The reference image sets the look; only describe movement.
${shots}

Positive instructions only. One scene per generation.

${consistencyLock(opts, adn, 'en')}`;
}

/**
 * SKIN PIKA — vocabulario de cámara propio, todo explícito:
 * Sujeto → Escena → Acción → Cámara → Luz → Estilo + Avoid list separada.
 */
function buildPikaPrompt(adn: any, opts: ScenePromptOptions): string {
  const { scenes, landing } = opts;
  const persona = personaText(opts);

  const shots = scenes.map((s, i) => {
    const segment = s.segment || 'VALOR';
    const subject = persona || `visual del segmento ${segment}`;
    const action = s.voiceover || s.text || `desarrollar ${segment}`;
    const camera = cameraMoveFor(adn, segment);
    return `Subject: ${subject}. Scene: ${moodOf(adn)}. Action: ${action}. Camera: ${camera}. Lighting: warm, branded. Style: social-first, high polish.`;
  }).join('\n');

  return `Promo for ${landing.courseTitle || 'a course'} (${opts.format}).
${shots}

Avoid: clichés de éxito, texto ilegible, deformación facial, fondo genérico. Motion clarity: una acción dominante por clip.

${consistencyLock(opts, adn, 'en')}`;
}

/**
 * SKIN WAN (Alibaba) — Entity + Scene + Motion + Aesthetic control + Stylization.
 * Multi-shot: Overall description + shot number por escena.
 */
function buildWanPrompt(adn: any, opts: ScenePromptOptions): string {
  const { scenes, landing } = opts;
  const persona = personaText(opts);

  const shots = scenes.map((s, i) => {
    const segment = s.segment || 'VALOR';
    const entity = persona || `elemento del segmento ${segment}`;
    const motion = s.voiceover || s.text || `movimiento pausado acorde a ${segment}`;
    const camera = cameraMoveFor(adn, segment);
    return `Shot ${i + 1}: Entity ${entity}. Scene: ${moodOf(adn)}. Motion: ${motion}. Camera: ${camera}. Aesthetic control: luz cálida, profundidad de campo. Stylization: cinematográfico de marca.`;
  }).join('\n');

  return `Promo of ${landing.courseTitle || 'a course'} (${opts.format}).
${shots}

Overall description: video de conversión para el curso, ritmo pausado, identidad consistente entre shots.

${consistencyLock(opts, adn, 'es')}`;
}

/**
 * Prompt export multi-escena por motor, con SKIN nativa de cada editor.
 * Cada motor usa su propia sintaxis (Seedance/Veo/Runway/Pika/Wan).
 * perScene es la versión por-clip para editores que generan de a una escena.
 */
export function buildSceneExportPrompt(opts: ScenePromptOptions): ScenePromptResult {
  const { engine, format, scenes } = opts;
  const totalDuration = scenes.reduce((acc, s) => acc + (Number(s.duration) || 5), 0) || 15;

  let prompt: string;
  let perScene: string[];

  const lastIdx = scenes.length - 1;
  const sceneOpts = (s: ScenePromptScene, i: number): ScenePromptOptions => ({
    ...opts,
    scenes: [s],
    finalScene: i === lastIdx
  });

  switch (engine) {
    case 'seedance': {
      const single = buildSeedancePrompt(opts.adn, opts);
      perScene = scenes.map((s, i) => buildSeedancePrompt(opts.adn, sceneOpts(s, i)));
      prompt = single;
      break;
    }
    case 'veo': {
      perScene = scenes.map((s, i) => buildVeoPrompt(opts.adn, sceneOpts(s, i)));
      prompt = buildVeoPrompt(opts.adn, opts);
      break;
    }
    case 'runway': {
      perScene = scenes.map((s, i) => buildRunwayPrompt(opts.adn, sceneOpts(s, i)));
      prompt = buildRunwayPrompt(opts.adn, opts);
      break;
    }
    case 'pika': {
      perScene = scenes.map((s, i) => buildPikaPrompt(opts.adn, sceneOpts(s, i)));
      prompt = buildPikaPrompt(opts.adn, opts);
      break;
    }
    case 'wan':
    default: {
      perScene = scenes.map((s, i) => buildWanPrompt(opts.adn, sceneOpts(s, i)));
      prompt = buildWanPrompt(opts.adn, opts);
      break;
    }
  }

  return { prompt, perScene, totalDuration, engine, format };
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
