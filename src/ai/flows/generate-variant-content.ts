'use server';
/**
 * @fileOverview Flujo de Genkit para generar el desglose de contenido detallado
 * a partir de un Blueprint técnico aprobado (Fase 2).
 */

import { ai, validateApiKey } from '../genkit';
import { z } from 'genkit';
import path from 'path';
import fs from 'fs/promises';

const SceneContentSchema = z.object({
  segment_label: z.string().describe('CRÍTICO: Copia exactamente el nombre de la etiqueta solicitada en la secuencia (ej: GANCHO, VALOR, CTA). No repitas la misma si la secuencia pide distintas.'),
  text: z.string().describe('Texto de impacto visual ultra-corto (2-4 palabras).'),
  subtitle: z.string().describe('Texto secundario o de apoyo (6-8 palabras). Obligatorio generar.'),
  watermark: z.string().describe('El @usuario (handle) de la red social.'),
  voiceover: z.string().describe('Guion narrativo. ¡CRÍTICO!: Escribe un guion fluido y continuo que dure por lo menos 10 SEGUNDOS de lectura hablada (aprox 25-35 palabras).'),
  media_hint: z.string().describe('Keywords precisas para buscar el fondo visual (ej: "minimalist luxury office", "dark cyber technology abstract").'),
  duration: z.number().describe('Duración exacta en segundos (MÍNIMO 10s, ej: 10-15s).'),
  production_notes: z.string().optional().describe('Notas sobre el estilo de animación o tono específico para esta escena.'),
  subject_action: z.string().optional().describe('Para IA: Acción detallada del sujeto. Ej: "Mentor sonriendo", "Usuario escribiendo".'),
  camera_movement: z.string().optional().describe('Para IA: Movimiento de cámara. Ej: "slow push-in", "steady pan", "static".'),
  framing: z.string().optional().describe('Para IA: Encuadre. Ej: "close-up", "medium shot", "wide shot".'),
  lighting: z.string().optional().describe('Para IA: Iluminación/Entorno. Ej: "luz cálida", "estudio cinemático".'),
});

const SocialSlideSchema = z.object({
  segment_label: z.string().describe('CRÍTICO: Copia exactamente el nombre de la etiqueta solicitada en la secuencia (ej: GANCHO, VALOR, CTA). No repitas la misma si la secuencia pide distintas.'),
  text: z.string().describe('Texto visual para la placa.'),
  subtitle: z.string().describe('Subtítulo de apoyo. Obligatorio generar.'),
  watermark: z.string().describe('El @usuario (handle) de la red social.'),
  voiceover: z.string().describe('Guion de voz. ¡CRÍTICO!: Escribe un texto lo suficientemente largo para cubrir 10 SEGUNDOS mínimos de lectura.'),
  media_hint: z.string().describe('Keywords para el fondo de la placa.'),
  duration: z.number().describe('Duración en segundos (MÍNIMO 10s).'),
  subject_action: z.string().optional().describe('Para IA: Acción detallada del sujeto. Ej: "Mentor sonriendo", "Usuario escribiendo".'),
  camera_movement: z.string().optional().describe('Para IA: Movimiento de cámara. Ej: "slow push-in", "steady pan", "static".'),
  framing: z.string().optional().describe('Para IA: Encuadre. Ej: "close-up", "medium shot", "wide shot".'),
  lighting: z.string().optional().describe('Para IA: Iluminación/Entorno. Ej: "luz cálida", "estudio cinemático".'),
});

const VariantContentSchema = z.object({
  voiceover: z.string().describe('Guion maestro continuo.'),
  scenes: z.array(SceneContentSchema).optional().describe('Desglose para VIDEO (Reels/TikTok).'),
  slides: z.array(SocialSlideSchema).optional().describe('Desglose para CARRUSEL.'),
  hook: z.string().optional().describe('Copy inicial.'),
  caption: z.string().optional().describe('Cuerpo del copy.'),
  hashtags: z.array(z.string()).optional(),
  production_notes: z.object({
    visual_style: z.string().optional(),
    music_vibe: z.string().optional(),
    watermark_text: z.string().optional(),
    music_url: z.string().optional(),
    music_duration: z.number().optional(),
  }).optional().describe('Notas de producción para la pieza.'),
});

export async function generateVariantContent(
  variant: any, 
  directives: string,
  courseTitle?: string,
  courseDescription?: string,
  targetAudience?: string,
  mission: 'venta' | 'autoridad' | 'lanzamiento' | 'leads' = 'venta',
  landingContext?: string
): Promise<any> {
  console.log(`[AI:Flow] Generando contenido para: ${variant.platform} - ${variant.type} | Misión: ${mission}`);
  
  validateApiKey();
  
  // CARGA DINÁMICA DE ADN
  const adnId = variant.blueprintConfig?.presetId || variant.blueprintConfig?.adn || variant.production_notes?.adnId || '01';
  console.log(`[AI:Flow] Buscando ADN con ID: ${adnId}`);
  
  const { loadAdnConfig } = await import('@/lib/adn-utils');
  let adnDef: any = {};
  try {
    adnDef = await loadAdnConfig(adnId);
  } catch (err: any) {
    console.warn(`[AI:Flow] Falló la carga del ADN ${adnId}: ${err.message}. Usando estructura default.`);
  }

  // Extraer conteo de escenas real del ADN
  const adnSceneCount = adnDef.slices?.length || adnDef.scenes?.length || (adnDef.logic_segments ? Object.keys(adnDef.logic_segments).length : 0);
  console.log(`[AI:Flow] Estructura detectada: ${adnSceneCount} escenas.`);
  
  // Extraer Estrategia Individual del Blueprint si existe
  const bConfig = variant.blueprintConfig || {};
  const customVector = bConfig.strategyVector;
  const customTone = bConfig.commercialTone;

  const strategyContext = (customVector || customTone) 
    ? `== ESTRATEGIA ESPECIFICA DE ESTA PIEZA (PRIORIDAD SOBRE GENERAL) ==\n- Vector de Venta: ${customVector || 'Usar general'}\n- Tono comercial: ${customTone || 'Usar general'}`
    : `== USAR ESTRATEGIA GENERAL DE LA CAMPAÑA: ${mission.toUpperCase()} ==`;
  
  const courseContext = courseTitle ? `\n\n== CONTEXTO DEL PRODUCTO ==\n- Curso/Producto a vender: "${courseTitle}"\n- Descripción: ${courseDescription || 'N/A'}\n- Información de la Landing (¡EXTRAE HECHOS DE AQUÍ!): ${landingContext ? landingContext : 'No provista.'}` : '';

  const injectedAdnRule = `${strategyContext}${courseContext}\n\n== REGLAS DE NARRATIVA DUAL (OBLIGATORIO) ==
Tu misión es coordinar lo que se OYE con lo que se VE:
1. VOZ (voiceover): Relato fluido, humano y persuasivo. Es el guion de radio/podcast.
2. PANTALLA (text): Refuerzo visual. Frases ultra-cortas (2-4 palabras) que clavan el concepto.

== REGLA DE CIERRE COMERCIAL (CRÍTICO) ==
¡ESTO ES UNA VENTA DE CURSOS! No te quedes solo atacando los síntomas o el dolor. La ÚLTIMA escena (CTA) DEBE ser un llamado a la acción DIRECTO y EXPLÍCITO para COMPRAR O UNIRSE AL CURSO. 
- Debes mencionar explícitamente el curso (ej: "Únete a [Nombre del Curso]").
- Debes decirles cómo conseguirlo (ej: "Haz clic en el enlace de mi perfil", "Ve al link en mi bio").

[LIMITACIONES ESPECÍFICAS DEL ADN]
- GANCHO: ${adnDef.ai_prompts?.GANCHO || ''}
- VALOR: ${adnDef.ai_prompts?.VALOR || ''}
- CTA: ${adnDef.ai_prompts?.CTA || ''}`;

  const missionTones = {
    venta: "Tono altamente persuasivo, enfocado en RESULTADOS tangibles, RENTABILIDAD y ESCASEZ (importante: varía el vocabulario sobre retorno de inversión, no uses siempre la frase literal 'ROI asegurado'). El CTA debe ser un cierre de venta directo.",
    autoridad: "Tono sofisticado, enfocado en CREDIBILIDAD, EXPERIENCIA y VALOR. El CTA debe invitar a aprender más o confiar en el mentor.",
    lanzamiento: "Tono vibrante, enfocado en ANTICIPACIÓN y EXCLUSIVIDAD. El CTA debe ser un registro para un evento o aprovechamiento de bono.",
    leads: "Tono directo y servicial, enfocado en la solución de un PROBLEMA específico mediante el curso. El CTA debe ser la descarga o acceso inicial."
  };

  // --- CALCULAR LÍMITES ESTRICTOS DEL BLUEPRINT ---
  // Prioridad: ADN Real > Config del Blueprint > Default 5
  const slices = adnDef.slices || adnDef.scenes || [];
  let sequenceList = '';
  if (slices.length > 0) {
     sequenceList = slices.map((s: any, i: number) => `${i + 1}. ${s.segment_label || 'VALOR'} (Duración max: ${s.duration || 5}s)`).join('\n');
  } else if (adnDef.logic_segments) {
     sequenceList = Object.keys(adnDef.logic_segments).map((k, i) => `${i + 1}. ${k} (Duración max: 5s)`).join('\n');
  } else {
     sequenceList = "1. GANCHO (3s)\n2. VALOR (5s)\n3. CIERRE (3s)\n4. CTA (4s)";
  }
  const expectedCount = adnSceneCount || bConfig.sceneCount || bConfig.slideCount || 5;

  try {
  const isLinkedinDoc = (variant.platform?.toLowerCase() === 'linkedin') && (variant.type === 'document' || variant.type === 'carousel');
  const isAiEngine = variant.production_notes?.video_engine && variant.production_notes.video_engine !== 'ffmpeg';

  let dualNarrativeInstruction = '';
  if (isLinkedinDoc) {
    dualNarrativeInstruction = `== REGLA ESPECIAL PARA LINKEDIN (DOCUMENTO/PDF) ==
- NO HAY LOCUCIÓN NI MÚSICA. Todo el valor debe estar en el TEXTO de las placas ('text').
- EL TEXTO EN PANTALLA DEBE SER EXTENSO: Genera un párrafo educativo sólido y persuasivo (mínimo 30 palabras) en el campo 'text' para cada slide.
- No uses frases cortas. Cada placa debe entregar un "Dato" o concepto completo que aporte valor por sí mismo sin necesidad de leer nada más.
- El campo 'voiceover' sigue siendo requerido por el esquema pero puedes usarlo para notas internas del mentor.`;
  } else {
    dualNarrativeInstruction = `REGLA DE NARRATIVA DUAL:
- La VOZ (voiceover) lleva la carga emocional y técnica detallada. Es un guion hablado (lo que dice el presentador).
- LA PANTALLA (text) reafirma con frases de PODER (3-5 palabras) que subrayan el beneficio técnico.`;
  }

  const generatePrompt = `Actúa como un Director Creativo y Guionista Senior especializado en Marketing Cinético.
Tu tarea es realizar un "MAQUETADO DE CONTENIDO ADN 2.0" fusionando estrategia comercial con precisión de renderizado.

=== MISIÓN ESTRATÉGICA ===
${missionTones[mission]}

=== REGLA DE ORO: EL CURSO ES EL REY (FUSIÓN DE NICHO) ===
1. EJE CENTRAL: El curso trata sobre "${courseTitle}". Descripción: "${courseDescription}". 
2. IGNORA INDUSTRIAS AJENAS: Si el blueprint menciona una industria distinta, usa solo su estructura técnica y aplícala 100% al nicho del curso.
3. HABLA EL LENGUAJE DEL EXPERTO: Usa terminología técnica específica. Prohibido el relleno genérico.
4. ANCLAJE CONTEXTUAL (FLEXIBLE): Evita la abstracción. Extrae los diferenciales reales de la "Información de la Landing" que más aporten a la venta. Dependiendo del caso, resalta la metodología, las herramientas o los módulos prácticos. Usa el sentido común para elegir el dato más persuasivo sin forzar listas aburridas o métricas irrelevantes.
5. AUTORIDAD DEL TUTOR (SIN SATURAR): Si hay un tutor experto, usa su autoridad para validar la solución de forma natural (ej: nombrando su expertise una sola vez en un punto clave). No repitas su nombre en cada escena para no saturar.

=== DIRECTRICES ADN 2.0 (CALIDAD CINEMATOGRÁFICA) ===
1. ESTRUCTURA LÓGICA REQUERIDA (SECUENCIA NARRATIVA):
Debes generar exactamente ${expectedCount} escenas con los siguientes segment_label EXACTOS en este orden:
${sequenceList}

2. PANTALLA (text): Frases 
    - TEXTO IMPACTO: 2-4 palabras máximo, estilo Punchy.
    - SUBTÍTULO: Una frase corta de apoyo que dé contexto al texto de impacto. ¡OBLIGATORIO!.
    - MARCA DE AGUA (watermark): Inserta el handle exacto "${variant.handle ? (variant.handle.startsWith('@') ? variant.handle : '@'+variant.handle) : '@usuario'}" en cada escena.
3. BACKGROUNDS (media_hint): Escribe keywords descriptivas para la generación visual. IMPORTANTE: Usa términos de género neutro (ej: "person", "speaker", "professional") y NUNCA asumas género masculino ("businessman", "hombre", "tutor"). Esto evita corromper las imágenes de referencia si el usuario sube a una mujer.
4. VOZ (voiceover): Relato fluido, persuasivo y experto. ¡LÍMITE ESTRICTO DE TIEMPO!: El texto generado no debe requerir más segundos al ser hablado que la duración máxima asignada a la escena. Sé muy conciso.

=== CONTEXTO DEL PÚBLICO OBJETIVO ===
Dirígete a: ${targetAudience || 'General'} (Usa el tono y nivel de sofisticación que ellos esperan).

=== DIRECTIVAS ESTRATÉGICAS ===
"${directives}"

${dualNarrativeInstruction}

CONTEXTO TÉCNICO Y VISUAL (ADN 2.0):
- Plataforma: ${variant.platform || 'General'} | Tipo: ${variant.type}
- ADN Modelo: ${adnDef.name}
- Versión: ${adnDef.version || '1.0'}

${adnDef.version === '2.0' ? `
== REGLAS DE DIRECCIÓN ARTÍSTICA 2.0 ==
El motor aplicará automáticamente estos estilos según la etiqueta que elijas:
${Object.entries(adnDef.logic_segments || {}).map(([key, val]: [string, any]) => `- ${key}: Usará estilo "${val.style}" y cámara "${val.camera}".`).join('\n')}

Instrucción de diseño: Asegúrate de que el 'text' sea coherente con el estilo visual y que el 'media_hint' potencie el movimiento de cámara asignado.
` : ''}

TAREAS DE DIRECCIÓN:
${injectedAdnRule}

1. COORDINACIÓN VISUAL Y ESTRUCTURA:
   - Genera un GUION MAESTRO ('voiceover' raíz) fluido.
   - Genera el desglose en 'scenes' o 'slides'.
   - REGLA DE CANTIDAD: Genera EXACTAMENTE ${expectedCount} elementos.
   - Para cada elemento:
     * El 'text' visual debe ser minimalista y potente.
     * El 'media_hint' debe ser cinematográfico y coherente con el curso.
     * El 'voiceover' debe estar perfectamente sincronizado con la 'duration'.
     * Para motores IA: Rellena detalladamente 'subject_action', 'camera_movement' (ej: slow push-in, pan), 'framing' (ej: close-up, medium shot) y 'lighting' (ej: luz cálida) asegurando coherencia visual en cada escena.

3. TEXTOS DE ACOMPAÑAMIENTO:
   - Genera un 'hook' relevante al curso. 
   - Genera un 'caption' persuasivo y adaptado a la plataforma ("Nicho-Persona").
   - Genera un array de 'hashtags'.

REGLAS FINALES:
- ALTA RETENCIÓN. Idioma: Español. No inventar datos falsos.

Devuelve un objeto JSON que siga el ContentBreakdown Schema.`;

  let parsed: any = null;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const { output } = await ai.generate({
        prompt: generatePrompt,
        output: { schema: VariantContentSchema },
        config: { temperature: 0.8 }
      });
      parsed = output;
      break; // Success
    } catch (genErr: any) {
      attempts++;
      console.error(`[AI:Flow] Fallo en intento ${attempts}/${maxAttempts}:`, genErr.message);
      if (attempts >= maxAttempts) throw genErr;
      // Wait 1 second before retrying
      await new Promise(r => setTimeout(r, 1000));
    }
  }

    if (!parsed) {
      throw new Error("La IA no devolvió un desglose válido.");
    }

    // --- SEGURIDAD DE NARRATIVA DUAL (Post-procesado) ---
    // Si la IA generó un guion maestro pero dejó las escenas vacías, lo repartimos nosotros.
    let finalScenes = (parsed.scenes || []).map((s: any) => ({ ...s, overlays: s.overlays || [] }));
    let finalSlides = (parsed.slides || []);

    if (parsed.voiceover && (finalScenes.length > 0 || finalSlides.length > 0)) {
        const targetArray = finalScenes.length > 0 ? finalScenes : finalSlides;
        const allEmpty = targetArray.every((s: any) => !s.voiceover);
        
        if (allEmpty) {
            console.log("[AI:Flow] Detectado guion maestro sin reparto. Iniciando auto-distribución...");
            // Dividir por oraciones o párrafos (mejor por puntos)
            const sentences = parsed.voiceover.match(/[^.!?]+[.!?]+/g) || [parsed.voiceover];
            const avgSentencesPerScene = Math.max(1, Math.ceil(sentences.length / targetArray.length));
            
            targetArray.forEach((scene: any, i: number) => {
                const start = i * avgSentencesPerScene;
                const end = (i === targetArray.length - 1) ? sentences.length : (i + 1) * avgSentencesPerScene;
                const slice = sentences.slice(start, end);
                if (slice.length > 0) {
                    scene.voiceover = slice.join(' ').trim();
                }
            });
        }
    }

    const result = {
      ...parsed,
      production_notes: {
        visual_style: 'Cinematic',
        music_vibe: 'Professional',
        watermark_text: 'Mentor',
        ...parsed.production_notes
      },
      scenes: finalScenes,
      slides: finalSlides
    };

    return result;
  } catch (error: any) {
    console.error("[Content Gen Error]", error);
    const stage = error.message.includes('ADN') ? 'CARGA_ADN' : (error.message.includes('genkit') ? 'IA_GENKIT' : 'MAPPING');
    throw new Error(`Error en ${stage}: ${error.message}`);
  }
}
