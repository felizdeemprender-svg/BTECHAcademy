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
    imageUrl: z.string(),
    microBullets: z.array(z.string()).length(3).describe('Genera exactamente 3 viñetas persuasivas por sección.'),
  })).describe('Genera exactamente el número de secciones indicadas en el blueprint (sectionCount).'),
  benefits: z.array(z.string()),
  aboutMentor: z.string(),
});

const EmailFilledSchema = z.object({
  type: z.string(),
  marketingName: z.string().describe('Nombre interno/comercial del email.'),
  subject: z.string().describe('Asunto final del email.'),
  body: z.string().describe('Cuerpo COMPLETO del email redactado.'),
  preheader: z.string(),
});

const SocialSlideSchema = z.object({
  text: z.string().describe('Texto visual final para la placa.'),
  imageUrl: z.string().describe('URL sugerida o descriptiva.'),
});

const SocialFilledSchema = z.object({
  platform: z.enum(['instagram', 'linkedin', 'twitter', 'tiktok']),
  type: z.string(),
  marketingName: z.string().describe('Gancho comercial del post.'),
  hook: z.string().describe('Gancho inicial final.'),
  caption: z.string().describe('Cuerpo del post optimizado para la plataforma.'),
  hashtags: z.array(z.string()),
  slides: z.array(SocialSlideSchema).describe('Genera exactamente el número de slides indicados en el blueprint (slideCount).'),
});

const AdsFilledSchema = z.object({
  type: z.string(),
  marketingName: z.string().describe('Nombre del set de anuncios.'),
  headlines: z.array(z.string()).describe('Titulares finales.'),
  descriptions: z.array(z.string()).describe('Descripciones finales.'),
  keywords: z.array(z.string()),
});

const GenerateCampaignInputSchema = z.object({
  courseTitle: z.string(),
  courseDescription: z.string(),
  mentorName: z.string(),
  mentorBio: z.string().optional(),
  mentorSocials: z.record(z.string()).optional(),
  templateDirectives: z.string(),
  templateStructure: z.any().describe('Estructura de blueprints detallada.'),
  targetAudience: z.string().optional(),
  courseTags: z.array(z.string()).optional().default([]),
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
    // Utilizamos el modelo predeterminado configurado en ai
    const { output } = await ai.generate({
      prompt: `Actúa como un Director de Marketing y Copywriter Senior de Respuesta Directa. 
Tu tarea es llenar una arquitectura de marketing (Blueprint) con el contenido real de un curso para crear una campaña de alto rendimiento.

REGLAS CRÍTICAS DE CONSTRUCCIÓN:
1. **Landings**: Para cada landing, observa el campo 'sectionCount'. Debes generar EXACTAMENTE esa cantidad de objetos dentro del array 'sections'. Cada sección debe tener EXACTAMENTE 3 viñetas (microBullets) potentes. La narrativa debe ser educativa y persuasiva.
2. **Social Media**: 
   - Observa el campo 'slideCount' en cada blueprint social. Debes generar EXACTAMENTE esa cantidad de objetos en el array 'slides'.
   - Adapta el tono al canal (LinkedIn: profesional/autoridad, TikTok: dinámico/entretenido, Twitter: directo/informativo, Instagram: aspiracional/visual).
3. **Ads**: Genera las variantes respetando estrictamente su tipo (Search, Visual, Retargeting).
4. **Imágenes**: Si el blueprint incluye recomendaciones, guías de estilo o descripciones sugeridas para las imágenes, DEBES respetarlas y usarlas como base primordial para proponer el 'imageUrl' descriptivo.

DATOS DEL CURSO:
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

Genera todas las piezas con el copywriting final listo para publicar. Asegúrate de que el JSON de salida cumpla estrictamente con el esquema solicitado.
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
