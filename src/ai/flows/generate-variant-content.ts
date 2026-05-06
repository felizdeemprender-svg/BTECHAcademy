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
  segment_label: z.enum(['GANCHO', 'VALOR', 'VALOR_CONT', 'CTA', 'CIERRE']).describe('Etiqueta lógica para el motor ADN 2.0: GANCHO (atención), VALOR (contenido), CTA (llamado acción), CIERRE (despedida).'),
  text: z.string().describe('Texto de impacto visual ultra-corto (2-4 palabras).'),
  voiceover: z.string().describe('Guion narrativo para el locutor (TTS).'),
  media_hint: z.string().describe('Keywords precisas para buscar el fondo visual (ej: "minimalist luxury office", "dark cyber technology abstract").'),
  duration: z.number().describe('Duración exacta en segundos (3-8s).'),
  production_notes: z.string().optional().describe('Notas sobre el estilo de animación o tono específico para esta escena.'),
});

const SocialSlideSchema = z.object({
  segment_label: z.enum(['GANCHO', 'VALOR', 'VALOR_CONT', 'CTA', 'CIERRE']),
  text: z.string().describe('Texto visual para la placa.'),
  voiceover: z.string().describe('Guion de voz.'),
  media_hint: z.string().describe('Keywords para el fondo de la placa.'),
  duration: z.number().describe('Duración en segundos.'),
});

const VariantContentSchema = z.object({
  voiceover: z.string().describe('Guion maestro continuo.'),
  scenes: z.array(SceneContentSchema).optional().describe('Desglose para VIDEO (Reels/TikTok).'),
  slides: z.array(SocialSlideSchema).optional().describe('Desglose para CARRUSEL.'),
  hook: z.string().optional().describe('Copy inicial.'),
  caption: z.string().optional().describe('Cuerpo del copy.'),
  hashtags: z.array(z.string()).optional(),
});

export async function generateVariantContent(
  variant: any, 
  directives: string,
  courseTitle?: string,
  courseDescription?: string,
  targetAudience?: string,
  mission: 'venta' | 'autoridad' | 'lanzamiento' | 'leads' = 'venta'
): Promise<any> {
  console.log(`[AI:Flow] Generando contenido para: ${variant.platform} - ${variant.type} | Misión: ${mission}`);
  
  validateApiKey();
  
  // CARGA DINÁMICA DE ADN
  let adnsDir = path.join(process.cwd(), 'public', 'adns');
  try {
    await fs.stat(adnsDir);
  } catch {
    // Fallback para entorno standalone (App Hosting / Cloud Run)
    const fallback = path.join(process.cwd(), '..', '..', 'public', 'adns');
    try {
      await fs.stat(fallback);
      adnsDir = fallback;
    } catch {
      console.warn(`[AI:Flow] No se encontró el directorio de ADNs en ${adnsDir} ni en ${fallback}`);
    }
  }

  const adnId = variant.blueprintConfig?.presetId || variant.blueprintConfig?.adn || '01';
  const adnFiles = await fs.readdir(adnsDir);
  const targetFile = adnFiles.find(f => f.startsWith(adnId)) || '01_guru_hormozi.json';
  const adnDef = JSON.parse(await fs.readFile(path.join(adnsDir, targetFile), 'utf-8'));
  
  // Extraer Estrategia Individual del Blueprint si existe
  const bConfig = variant.blueprintConfig || {};
  const customVector = bConfig.strategyVector;
  const customTone = bConfig.commercialTone;

  const strategyContext = (customVector || customTone) 
    ? `== ESTRATEGIA ESPECIFICA DE ESTA PIEZA (PRIORIDAD SOBRE GENERAL) ==\n- Vector de Venta: ${customVector || 'Usar general'}\n- Tono comercial: ${customTone || 'Usar general'}`
    : `== USAR ESTRATEGIA GENERAL DE LA CAMPAÑA: ${mission.toUpperCase()} ==`;
  
  const injectedAdnRule = `${strategyContext}\n\n== REGLAS DE NARRATIVA DUAL (OBLIGATORIO) ==
Tu misión es coordinar lo que se OYE con lo que se VE:
1. VOZ (voiceover): Relato fluido, humano y persuasivo. Es el guion de radio/podcast.
2. PANTALLA (text): Refuerzo visual. Frases ultra-cortas (2-4 palabras) que clavan el concepto.

[LIMITACIONES ESPECÍFICAS DEL ADN]
- GANCHO: ${adnDef.ai_prompts?.GANCHO || ''}
- VALOR: ${adnDef.ai_prompts?.VALOR || ''}
- CTA: ${adnDef.ai_prompts?.CTA || ''}`;

  const missionTones = {
    venta: "Tono altamente persuasivo, enfocado en RESULTADOS, ROI y ESCASEZ. El CTA debe ser un cierre de venta directo.",
    autoridad: "Tono sofisticado, enfocado en CREDIBILIDAD, EXPERIENCIA y VALOR. El CTA debe invitar a aprender más o confiar en el mentor.",
    lanzamiento: "Tono vibrante, enfocado en ANTICIPACIÓN y EXCLUSIVIDAD. El CTA debe ser un registro para un evento o aprovechamiento de bono.",
    leads: "Tono directo y servicial, enfocado en la solución de un PROBLEMA específico mediante el curso. El CTA debe ser la descarga o acceso inicial."
  };

  // --- CALCULAR LÍMITES ESTRICTOS DEL BLUEPRINT ---
  const expectedCount = bConfig.sceneCount || bConfig.slideCount || 5;

  try {
  const isLinkedinDoc = (variant.platform?.toLowerCase() === 'linkedin') && (variant.type === 'document' || variant.type === 'carousel');

  const dualNarrativeInstruction = isLinkedinDoc 
    ? `== REGLA ESPECIAL PARA LINKEDIN (DOCUMENTO/PDF) ==
- NO HAY LOCUCIÓN NI MÚSICA. Todo el valor debe estar en el TEXTO de las placas ('text').
- EL TEXTO EN PANTALLA DEBE SER EXTENSO: Genera un párrafo educativo sólido y persuasivo (mínimo 30 palabras) en el campo 'text' para cada slide.
- No uses frases cortas. Cada placa debe entregar un "Dato" o concepto completo que aporte valor por sí mismo sin necesidad de leer nada más.
- El campo 'voiceover' sigue siendo requerido por el esquema pero puedes usarlo para notas internas del mentor.`
    : `REGLA DE NARRATIVA DUAL:
- La VOZ lleva la carga emocional y técnica detallada.
- LA PANTALLA (text) reafirma con frases de PODER (3-5 palabras) que subrayan el beneficio técnico.`;

  const { output: parsed } = await ai.generate({
    prompt: `Actúa como un Director Creativo y Guionista Senior especializado en Marketing Cinético.
Tu tarea es realizar un "MAQUETADO DE CONTENIDO ADN 2.0" fusionando estrategia comercial con precisión de renderizado.

=== MISIÓN ESTRATÉGICA ===
${missionTones[mission]}

=== REGLA DE ORO: EL CURSO ES EL REY (FUSIÓN DE NICHO) ===
1. EJE CENTRAL: El curso trata sobre "${courseTitle}". Descripción: "${courseDescription}". 
2. IGNORA INDUSTRIAS AJENAS: Si el blueprint menciona una industria distinta, usa solo su estructura técnica y aplícala 100% al nicho del curso.
3. HABLA EL LENGUAJE DEL EXPERTO: Usa terminología técnica específica. Prohibido el relleno genérico.

=== DIRECTRICES ADN 2.0 (CALIDAD CINEMATOGRÁFICA) ===
1. ESTRUCTURA LÓGICA: Sigue estrictamente la secuencia GANCHO (Atención), VALOR (Cuerpo), CTA (Conversión), CIERRE (Marca).
2. PANTALLA (text): Frases de PODER de 2 a 4 palabras máximo. El diseño visual lo pone el ADN, tú pon el impacto emocional.
3. BACKGROUNDS (media_hint): Escribe keywords descriptivas para el buscador de imágenes (ej: "modern industrial machinery macro", "premium workspace lighting sunset").
4. VOZ (voiceover): Relato fluido, persuasivo y experto.

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

3. TEXTOS DE ACOMPAÑAMIENTO:
   - Genera un 'hook' relevante al curso. 
   - Genera un 'caption' persuasivo y adaptado a la plataforma ("Nicho-Persona").
   - Genera un array de 'hashtags'.

REGLAS FINALES:
- ALTA RETENCIÓN. Idioma: Español. No inventar datos falsos.

Devuelve un objeto JSON que siga el ContentBreakdown Schema.`,
    output: { schema: VariantContentSchema },
    config: { temperature: 0.8 }
  });

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
    throw new Error("Error al generar el desglose de contenido: " + error.message);
  }
}
