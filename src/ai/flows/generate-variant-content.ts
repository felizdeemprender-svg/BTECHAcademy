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
  segment_label: z.string().describe('Categoría narrativa: "GANCHO", "VALOR", "CTA", etc.'),
  title: z.string().describe('Título o concepto de la escena.'),
  text: z.string().describe('Texto corto de impacto para aparecer en pantalla (3-5 palabras).'),
  voiceover: z.string().describe('Fracción del guion de voz continuo que corresponde a esta escena.'),
  description: z.string().describe('Descripción detallada de lo que sucede visualmente.'),
  duration: z.number().describe('Duración sugerida en segundos.'),
  overlays: z.array(z.string()).describe('Palabras clave extra.'),
});

const SocialSlideSchema = z.object({
  segment_label: z.string().describe('Categoría narrativa.'),
  text: z.string().describe('Texto visual corto.'),
  voiceover: z.string().describe('Guion de voz para esta placa.'),
  description: z.string().describe('Descripción visual de la placa (Authority/LinkedIn style).'),
  duration: z.number().describe('Duración en segundos.'),
});

const VariantContentSchema = z.object({
  voiceover: z.string().describe('Guion maestro continuo para todo el contenido.'),
  scenes: z.array(SceneContentSchema).optional().describe('Para formatos de video.'),
  slides: z.array(SocialSlideSchema).optional().describe('Para formatos de carrusel.'),
  hook: z.string().optional().describe('Gancho inicial para el copy.'),
  caption: z.string().optional().describe('Cuerpo de la publicación.'),
  hashtags: z.array(z.string()).optional().describe('Hashtags relevantes.'),
  production_notes: z.object({
    voice_id: z.string().optional(),
    music_vibe: z.string().optional(),
    visual_style: z.string().optional(),
  }).optional(),
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
    prompt: `Actúa como un Estratega de Marketing Especializado en el Nicho del Curso y Guionista Senior. 
Tu tarea es realizar "MAQUETADO DE CONTENIDO DUAL" fusionando estrategia comercial con rigor técnico.

=== MISIÓN ESTRATÉGICA ===
${missionTones[mission]}

=== REGLA DE ORO: EL CURSO ES EL REY (FUSIÓN DE NICHO) ===
1. EJE CENTRAL: El curso trata sobre "${courseTitle}". La descripción es: "${courseDescription}". 
2. Si las directivas del ADN, del Blueprint o del Público Objetivo mencionan temáticas de otra industria (ej. si el blueprint dice "salud" pero el curso es de "peluquería"), DEBES IGNORAR la industria del blueprint y usar únicamente su ESTRUCTURA DE MARKETING o TONO, aplicándolo 100% a la realidad y temática del CURSO. ¡El contenido jamás debe mezclar industrias que no tengan que ver con el curso!
3. HABLA EL LENGUAJE DEL EXPERTO: Utiliza terminología específica basada en la descripción.
4. APLICA EL MARKETING AL NICHO: Usa ganchos comerciales (ROI, éxito, escala, transformación) pero SIEMPRE aplicados al tema.
   - Mal: "Alcanza el éxito digital".
   - Bien: "Alcanza el éxito en tu cosecha maximizando el rendimiento por árbol".
5. PROHIBIDO: Ignorar el tema técnico para usar relleno de marketing genérico. Cada escena/placa DEBE mencionar al menos un elemento físico o técnico del curso.

=== CONTEXTO DEL PÚBLICO OBJETIVO ===
Dirígete a: ${targetAudience || 'General'} (Usa el tono y nivel de sofisticación que ellos esperan).

=== DIRECTIVAS ESTRATÉGICAS ===
"${directives}"

${dualNarrativeInstruction}

CONTEXTO TÉCNICO (OBLIGATORIO RESPETAR):
- Plataforma: ${variant.platform || 'General'}
- Tipo de Contenido: ${variant.type}
- Blueprint (Límites): ${JSON.stringify(variant.blueprintConfig || {})}
- ADN: ${adnDef.name}

TAREAS DE DIRECCIÓN DUAL:
${injectedAdnRule}

1. COORDINACIÓN VISUAL Y ESTRUCTURA:
   - Genera un GUION MAESTRO ('voiceover' a nivel raíz) que sea un relato FLUIDO y experto.
   - Genera un desglose detallado en 'scenes' o 'slides'.
   - **REGLA DE CANTIDAD (INNEGOCIABLE)**: DEBES GENERAR EXACTAMENTE ${expectedCount} ELEMENTOS.
   - **REGLA DE SINCRONIZACIÓN**: Debes REPARTIR el Guion Maestro dentro de cada escena/placa en el campo 'voiceover'. Cada escena DEBE tener su propio fragmento de voz.
   - Para cada elemento:
     * El 'voiceover' de la escena debe durar aproximadamente lo que indica 'duration'.
     * El 'text' de pantalla debe ser un resumen potente de lo que se oye en esa placa (Narrativa Dual).
     * La 'description' visual debe ser dinámica y de alto impacto.
     * Sigue la estructura: GANCHO (Problema), VALOR (Solución), CTA (Acción).

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
