'use server';
/**
 * @fileOverview Un flujo de Genkit para fusionar un curso con una colección de plantillas.
 * Crea variantes de activos de publicación finales (Landing, Email, Social, Ads) 
 * inyectando el contenido pedagógico en la estructura exacta de marketing definida en los blueprints.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LandingFilledSchema = z.object({
  type: z.string(),
  marketingName: z.string().describe('Nombre comercial pegadizo (ej: "Masterclass VIP", "Oferta Relámpago").'),
  headline: z.string().describe('Titular persuasivo final.'),
  subheadline: z.string().describe('Bajada estratégica final.'),
  ctaText: z.string(),
  videoUrl: z.string().optional().describe('URL de vídeo de ventas relevante.'),
  sections: z.array(z.object({
    title: z.string(),
    paragraph: z.string(),
    imageUrl: z.string().optional(),
    videoUrl: z.string().optional().describe('URL de video si la sección es de tipo video (común en la sección 1).'),
    microBullets: z.array(z.string()).min(1).max(5).describe('Genera entre 2 y 4 viñetas persuasivas por sección.'),
  })).describe('Genera exactamente el número de secciones indicadas en el blueprint (sectionCount).'),
  benefits: z.array(z.string()).optional().default([]),
  aboutMentor: z.string().optional().default(''),
});

const EmailFilledSchema = z.object({
  type: z.string(),
  marketingName: z.string().describe('Nombre interno/comercial del email.'),
  subject: z.string().describe('Asunto final del email.'),
  body: z.string().describe('Cuerpo COMPLETO del email redactado.'),
  preheader: z.string(),
});

const SocialSlideSchema = z.object({
  segment_label: z.string().describe('Categoría narrativa: "GANCHO", "VALOR", "CTA", etc.'),
  text: z.string().describe('Texto visual corto de impacto (3-5 palabras).'),
  voiceover: z.string().describe('Guion de voz específico para este fragmento.'),
  duration: z.number().default(5).describe('Duración sugerida en segundos.'),
  imageUrl: z.string().describe('Descripción sugerida de la imagen.'),
});

const SocialFilledSchema = z.object({
  platform: z.enum(['instagram', 'twitter', 'tiktok']),
  type: z.string(),
  marketingName: z.string().describe('Gancho comercial del post.'),
  hook: z.string().describe('Gancho inicial final.'),
  caption: z.string().describe('Cuerpo del post optimizado para la plataforma.'),
  hashtags: z.array(z.string()).optional().default([]),
  voiceover: z.string().optional().describe('Guion maestro continuo para video.'),
  slides: z.array(SocialSlideSchema).describe('Genera exactamente el número de elementos indicados en el blueprint (sceneCount o slideCount).'),
  production_notes: z.object({
    music_vibe: z.string().describe('Estilo de música sugerido.'),
    watermark_text: z.string().describe('Texto para marca de agua.'),
    visual_style: z.string().optional(),
    voice_id: z.string().optional().default('mateo'),
  }).optional(),
});

const AdsFilledSchema = z.object({
  type: z.string(),
  marketingName: z.string().describe('Nombre del set de anuncios.'),
  headlines: z.array(z.string()).optional().default([]).describe('Titulares finales.'),
  descriptions: z.array(z.string()).optional().default([]).describe('Descripciones finales.'),
  keywords: z.array(z.string()).optional().default([]),
});

const GenerateCampaignInputSchema = z.object({
  courseTitle: z.string(),
  courseDescription: z.string(),
  mentorName: z.string(),
  mission: z.enum(['venta', 'autoridad', 'lanzamiento', 'leads']).optional().default('venta').describe('Objetivo estratégico de la campaña.'),
  mentorBio: z.string().optional(),
  mentorSocials: z.record(z.string()).optional(),
  templateDirectives: z.string(),
  templateStructure: z.any().describe('Estructura de blueprints detallada.'),
  targetAudience: z.string().optional(),
  courseTags: z.array(z.string()).optional().default([]),
  masterAdns: z.record(z.any()).optional().describe('Mapa de ADNs maestros (JSONs cargados) por ID.'),
});
export type GenerateCampaignInput = z.infer<typeof GenerateCampaignInputSchema>;

const GenerateCampaignOutputSchema = z.object({
  landings: z.array(LandingFilledSchema).optional().default([]),
  emails: z.array(EmailFilledSchema).optional().default([]),
  socials: z.array(SocialFilledSchema).optional().default([]),
  ads: z.array(AdsFilledSchema).optional().default([]),
});
export type GenerateCampaignOutput = z.infer<typeof GenerateCampaignOutputSchema>;

export async function generateCampaignAssets(input: GenerateCampaignInput): Promise<GenerateCampaignOutput> {
  try {
    return await generateCampaignFlow(input);
  } catch (e: any) {
    console.error("[Flow: GenerateCampaignAssets] Critical failure:", e);
    throw new Error(e.message || "Fallo crítico en el motor de generación de activos.");
  }
}

const generateCampaignFlow = ai.defineFlow(
  {
    name: 'generateCampaignFlow',
    inputSchema: GenerateCampaignInputSchema,
    outputSchema: GenerateCampaignOutputSchema,
  },
  async (input) => {
    // Definición de Estilos por Misión
    const missionDirectives = {
      venta: "ENFOQUE: Venta Directa / Hard Sell. REGLAS: Usa urgencia real, escasez ('Plazas Limitadas'), resalta el ROI y el dolor de no actuar ahora.",
      autoridad: "ENFOQUE: Autoridad / Branding. REGLAS: Posiciona al mentor como el máximo referente, usa lenguaje sofisticado, resalta la metodología única y la confianza.",
      lanzamiento: "ENFOQUE: Lanzamiento de Evento. REGLAS: Genera Hype/Expectativa, habla de una 'Oportunidad Única' y usa bonos exclusivos que desaparecen pronto.",
      leads: "ENFOQUE: Lead Generation. REGLAS: Enfócate 100% en la transformación rápida y el valor gratuito inicial. El CTA debe ser irresistible y de bajo roce."
    };

    // Preparar contexto de ADNs para el prompt
    const adnContext = input.masterAdns ? Object.entries(input.masterAdns).map(([id, adn]) => {
      return `ADN [${id}]: ${adn.name} - ${adn.description}. Reglas de IA: ${JSON.stringify(adn.ai_prompts)}`;
    }).join('\n') : 'No se proveyeron definiciones extendidas de ADN.';

    // Utilizamos el modelo predeterminado configurado en ai
    const { output } = await ai.generate({
      prompt: `Actúa como un Director de Marketing y Copywriter Senior de Respuesta Directa con mentalidad de estratega. 
Tu tarea es llenar una arquitectura de marketing (Blueprint) con el contenido real de un curso para crear una campaña de alto rendimiento.

MISIÓN ESTRATÉGICA DE ESTA CAMPAÑA:
${missionDirectives[input.mission || 'venta']}

CONTEXTO DE ADNs MAESTROS (REGLAS DE ESTILO):
${adnContext}

CONSTRUCCIÓN BASADA EN EL CURSO (REGLA DE ORO):
El EJE CENTRAL de todo el contenido es el CURSO ("${input.courseTitle}"). 
Si las directivas del ADN, del Blueprint o del Público Objetivo mencionan temáticas de otra industria (ej. si el blueprint dice "salud" pero el curso es de "peluquería"), DEBES IGNORAR la industria del blueprint y usar únicamente su ESTRUCTURA DE MARKETING o TONO, aplicándolo 100% a la realidad y temática del CURSO. ¡El contenido jamás debe mezclar industrias que no tengan que ver con el curso!

REGLAS CRÍTICAS DE CONSTRUCCIÓN:
1. **Landings**: Para cada landing, observa el campo 'sectionCount'. Debes generar EXACTAMENTE esa cantidad de objetos dentro del array 'sections'. 
   - RECUERDA: La landing tiene un campo raíz 'videoUrl'. DEBES poner allí una URL de marcador de posición (ej: YouTube) para el video de ventas principal.
   - Las secciones del array 'sections' (incluyendo la index 0) deben ser ahora todas de CONTENIDO (Título, Párrafo, Imagen y Bullets). Ya no son contenedores de video.
   - Cada sección debe tener entre 2 y 4 viñetas (microBullets) potentes.
   - DEBES incluir el campo 'benefits' con un listado de 3-5 beneficios del curso.
   - **Sobre el Mentor**: DEBES incluir el campo 'aboutMentor'. Si la 'Bio del Mentor' provista es genérica o corta, sintetiza una descripción autoritaria basándote en los 'Tags/Temáticas' del curso. (Ej: Si el curso es de Citricultura, describe al mentor como un experto con años de experiencia optimizando cultivos cítricos y negocios agrícolas). Nunca digas "No provista".
   - La narrativa debe ser educativa y persuasiva.
2. **Social Media**: 
   - Observa el campo 'blueprintConfig' en cada ítem.
   - REGLA DE CANTIDAD: Si es un formato de video (Story, TikTok, Reels), busca 'sceneCount'. Si es un carrusel o estático, busca 'slideCount'.
   - DEBES generar EXACTAMENTE esa cantidad de objetos dentro del array 'slides'. (Ej: si sceneCount es 5, el array 'slides' debe tener 5 objetos independientes).
   - **NARRATIVA DUAL (CRÍTICO)**: 
     - Genera un 'voiceover' raíz que sea el guion maestro.
     - Divide ese guion en las 'voiceover' de cada slide.
     - El 'text' en cada slide debe ser una frase de impacto ultra-corta (3-5 palabras) que resuma lo que se está diciendo en ese momento.
    - Adapta el tono al canal (Instagram: dinámico, TikTok: rápido, etc.).
3. **Ads**: Genera las variantes respetando estrictamente su tipo (Search, Visual, Retargeting).
4. **Imágenes**: Propon el 'imageUrl' descriptivo basado en la temática del contenido.
5. **Producción**: Propón una vibra musical y marca de agua coherente.

DATOS DEL CURSO:
Título: ${input.courseTitle}
Descripción: ${input.courseDescription}
Tags/Temáticas: ${input.courseTags?.join(', ')}
Mentor: ${input.mentorName}
Bio del Mentor: ${input.mentorBio || 'No provista'}
Redes Sociales del Mentor: ${input.mentorSocials ? JSON.stringify(input.mentorSocials) : 'No provistas'}
PÚBLICO OBJETIVO (Buyer Persona): ${input.targetAudience}

INSTRUCCIÓN DE IDENTIDAD:
Es CRÍTICO que utilices las redes sociales y el tono de la bio del mentor en las piezas. 
Por ejemplo, si es para Instagram, usa su handle específico @... si está disponible. 
En los emails, usa su estilo de comunicación reflejado en la bio.

BLUEPRINTS ESTRATÉGICOS (ESTRUCTURA A LLENAR):
${JSON.stringify(input.templateStructure)}

Genera todas las piezas con el copywriting final listo para publicar adaptado a la MISIÓN ESTRATÉGICA. Asegúrate de que el JSON de salida cumpla estrictamente con el esquema solicitado.
Para los campos 'imageUrl', propón una descripción corta (3-5 palabras en inglés) que sea altamente relevante al tema del curso y a los tags proporcionados. Por ejemplo, si el tag es 'IA' y 'Salud', propón 'doctor using ai tablet'.
Para los campos 'marketingName', genera nombres cortos, persuasivos y comerciales que inciten al clic (Ganchos de marketing). Evita nombres genéricos como 'landing-1'.`,
      output: { schema: GenerateCampaignOutputSchema },
      config: { 
        temperature: 0.4,
        maxOutputTokens: 8192 
      }
    });

    if (!output) {
      throw new Error('La IA no pudo procesar la fusión de contenidos. El modelo devolvió una respuesta vacía o inválida.');
    }
    
    return output;
  }
);
