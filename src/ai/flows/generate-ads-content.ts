'use server';
/**
 * @fileOverview Flujo de Genkit para generar el contenido FINAL de UN set de
 * anuncios (ads) a partir de un borrador y el curso real (generación individual on-demand).
 */

import { ai, validateApiKey } from '../genkit';
import { z } from 'genkit';

const AdsContentSchema = z.object({
  marketingName: z.string().describe('Nombre del set de anuncios (corto y persuasivo).'),
  headlines: z.array(z.string()).describe('5 titulares finales para el anuncio.'),
  descriptions: z.array(z.string()).describe('4 descripciones finales para el anuncio.'),
  keywords: z.array(z.string()).describe('5 a 10 keywords de segmentación (Google Ads / Meta).'),
});

export type AdsContentOutput = z.infer<typeof AdsContentSchema>;

export interface GenerateAdsContentInput {
  variant: any;
  directives: string;
  courseTitle?: string;
  courseDescription?: string;
  targetAudience?: string;
  mentorName?: string;
  mission?: 'venta' | 'autoridad' | 'lanzamiento' | 'leads';
}

const missionTones: Record<string, string> = {
  venta: "Tono altamente persuasivo, enfocado en RESULTADOS, ROI y ESCASEZ. El CTA debe ser un cierre de venta directo.",
  autoridad: "Tono sofisticado, enfocado en CREDIBILIDAD, EXPERIENCIA y VALOR. El CTA debe invitar a aprender más o confiar en el mentor.",
  lanzamiento: "Tono vibrante, enfocado en ANTICIPACIÓN y EXCLUSIVIDAD. El CTA debe ser un registro para un evento o aprovechamiento de bono.",
  leads: "Tono directo y servicial, enfocado en la solución de un PROBLEMA específico mediante el curso. El CTA debe ser la descarga o acceso inicial."
};

const adTypeInstructions: Record<string, string> = {
  search: "AD DE BÚSQUEDA (Google Ads / Search): Prioriza keywords de alta intención y titulares/descripciones que matcheen la búsqueda del usuario. Incluí la keyword principal en el titular.",
  visual: "AD VISUAL (Meta / Display): Titulares impactantes orientados a beneficio emocional, descripciones cortas y directas que funcionan junto a una imagen o video.",
  retargeting: "AD DE RETARGETING: Dirigido a quien ya conoce la oferta. Rompe objeciones, recordá el problema y la oferta, y usá urgencia. Titulares de re-engagement."
};

export async function generateAdsContent(input: GenerateAdsContentInput): Promise<AdsContentOutput> {
  const {
    variant,
    directives,
    courseTitle,
    courseDescription,
    targetAudience,
    mentorName,
    mission = 'venta',
  } = input;

  console.log(`[AI:Flow] Generando ads individual: ${variant?.marketingName} | Tipo: ${variant?.type || 'search'}`);

  validateApiKey();

  const typeInstruction = adTypeInstructions[variant?.type] || adTypeInstructions.search;

  const { output } = await ai.generate({
    prompt: `Actúa como un Estratega y Copywriter Senior de Publicidad de Respuesta Directa.
Tu tarea es redactar el contenido FINAL de UN set de anuncios para el curso de un mentor.

=== MISIÓN ESTRATÉGICA ===
${missionTones[mission]}

=== REGLA DE ORO: EL CURSO ES EL REY ===
El curso trata sobre "${courseTitle}". Descripción: "${courseDescription}".
Si las directivas o el público objetivo mencionan otra industria, IGNÓRALA y usa solo su tono/estructura, aplicándolo 100% a la realidad del curso.
Dirígete a: ${targetAudience || 'General'}.

=== DATOS DEL MENTOR ===
Nombre: ${mentorName || 'Mentor Experto'}

=== TIPO DE ANUNCIO (ESTRUCTURA OBLIGATORIA) ===
${typeInstruction}

=== DIRECTIVAS ESTRATÉGICAS ===
"${directives}"

=== CONTEXTO DEL BORRADOR ===
Nombre de la pieza: ${variant?.marketingName || 'Set de anuncios'}
Plataforma: ${variant?.platform || 'facebook'}

REGLAS FINALES:
- Idioma: Español rioplatense cálido, profesional y persuasivo. Sin relleno genérico.
- Titulares: máx 30 caracteres cada uno, con promesa clara.
- Descripciones: máx 90 caracteres cada una, directas y con acción.
- Keywords: específicas del nicho del curso, listas para segmentación.
- No inventar datos falsos.`,
    output: { schema: AdsContentSchema },
    config: { temperature: 0.7 }
  });

  if (!output) {
    throw new Error('La IA no devolvió un set de anuncios válido.');
  }

  return output;
}
