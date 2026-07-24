'use server';
/**
 * @fileOverview Un flujo de Genkit para generar el contenido de Landings de Venta de forma atómica.
 * Crea 3 variantes de landing (Mínima, Equilibrada, Detallada) basándose en el precio y el curso.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { CLASSIC_STYLE_CONFIG } from '@/app/mentoria/marketing/templates/styles/classic-style-config';

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
    videoUrl: z.string().optional(),
    microBullets: z.array(z.string()).min(1).max(5).describe('Genera entre 2 y 4 viñetas persuasivas por sección.'),
  })).describe('Genera exactamente el número de secciones indicadas en el blueprint (sectionCount).'),
  benefits: z.array(z.string()).optional().default([]),
  aboutMentor: z.string().optional().default(''),
});

const GenerateLandingInputSchema = z.object({
  courseTitle: z.string(),
  courseDescription: z.string(),
  mentorName: z.string(),
  mentorBio: z.string().optional(),
  price: z.number().describe('Precio del curso para contextualizar la oferta.'),
  mission: z.enum(['venta', 'autoridad', 'lanzamiento', 'leads']).optional().default('venta'),
  templateStructure: z.any().describe('Estructura de las 3 variantes de landing a llenar.'),
  targetAudience: z.string().optional(),
  courseTags: z.array(z.string()).optional().default([]),
  templateDirectives: z.string().optional().default(''),
  styleId: z.string().optional().describe('ID del estilo visual de la colección (classic, modern, etc.)'),
});
export type GenerateLandingInput = z.infer<typeof GenerateLandingInputSchema>;

const GenerateLandingOutputSchema = z.object({
  landings: z.array(LandingFilledSchema),
});
export type GenerateLandingOutput = z.infer<typeof GenerateLandingOutputSchema>;

/**
 * Regenera el contenido de una sola variante de landing.
 */
export async function generateLandingVariantContent(
  variant: any,
  courseTitle: string,
  courseDescription: string,
  price: number,
  mission: 'venta' | 'autoridad' | 'lanzamiento' | 'leads',
  targetAudience: string,
  directives: string
): Promise<any> {
  const { output } = await ai.generate({
    prompt: `Actúa como un Copywriter Senior de Respuesta Directa. 
Tu tarea es RE-GENERAR el copy para UNA variante de landing de venta.

TIPO DE VARIANTE: ${variant.type}
CURSO: "${courseTitle}"
DESCRIPCIÓN: "${courseDescription}"
MISIÓN (Objetivo): ${mission}
PÚBLICO (Buyer Persona): ${targetAudience}
DIRECTIVAS EXTRA: "${directives}"

REGLAS DE ORO (INNEGOCIABLES):
1. EL CURSO ES EL EJE CENTRAL: El curso es "${courseTitle}" (${courseDescription}). Todo el contenido debe ser 100% fiel a esta temática.
2. LENGUAJE DEL PÚBLICO: Adapta el vocabulario, la sofisticación y el tono al PÚBLICO OBJETIVO (${targetAudience}). Habla su lenguaje técnico o emocional.
3. INTENCIÓN ESTRATÉGICA: Usa la MISIÓN (${mission}) para guiar el cierre de venta y la urgencia.
4. IGNORAR INDUSTRIAS AJENAS: Si el público menciona otra industria (ej: salud), aplica solo su estilo de lenguaje al tema del curso (${courseTitle}).
5. Mantén exactamente el número de secciones: ${variant.sections?.length || 0} y resalta el precio ($${price}).
6. IMPORTANTE: El nuevo copy debe ser SIGNIFICATIVAMENTE distinto y mejorado respecto al actual.

ESTRUCTURA ACTUAL A MEJORAR:
${JSON.stringify(variant)}

Devuelve el objeto de la landing relleno siguiendo el esquema.`,
    output: { schema: LandingFilledSchema },
    config: { temperature: 0.7 }
  });
  return output;
}

export async function generateLandingContent(input: GenerateLandingInput): Promise<GenerateLandingOutput> {
  try {
    return await generateLandingFlow(input);
  } catch (e: any) {
    console.error("[Flow: GenerateLandingContent] Critical failure:", e);
    throw new Error(e.message || "Fallo crítico en el motor de generación de landings.");
  }
}

const generateLandingFlow = ai.defineFlow(
  {
    name: 'generateLandingFlow',
    inputSchema: GenerateLandingInputSchema,
    outputSchema: GenerateLandingOutputSchema,
  },
  async (input) => {
    // Obtener configuración del estilo seleccionado
    const selectedStyleId = input.styleId || 'classic';
    let styleConfig = null;
    
    if (selectedStyleId === 'classic') {
      styleConfig = CLASSIC_STYLE_CONFIG;
    }
    
    // Construir instrucciones específicas del estilo
    let styleSpecificInstructions = '';
    if (styleConfig) {
      styleSpecificInstructions = `
CONFIGURACIÓN DEL ESTILO ${styleConfig.name.toUpperCase()}:
- Layout: ${styleConfig.layout.hero} hero, ${styleConfig.layout.sections} sections, ${styleConfig.layout.footer} footer
- Secciones disponibles: ${styleConfig.availableSections.map(s => s.name).join(', ')}
- Secciones duplicables: ${styleConfig.repeatableSections.join(', ')}
- Número de secciones por defecto: ${styleConfig.defaultSectionCount}
- DEBES respetar exactamente la cantidad de secciones: ${styleConfig.defaultSectionCount}
- INSTRUCCIÓN CRÍTICA ARQUITECTÓNICA: La plataforma ya dibuja de forma automática y por separado el Hero (usando 'headline'), el Tutor (usando 'aboutMentor'), los Beneficios (usando 'benefits') y los Precios (usando 'price'). 
- POR LO TANTO: El array 'sections' sirve ÚNICA Y EXCLUSIVAMENTE para generar los bloques de contenido persuasivo / características del producto (argumentos de venta). ¡NUNCA metas al Tutor, los Beneficios, las Faqs ni los Precios dentro del array 'sections'!
`;
    }
    
    const missionDirectives = {
      venta: "ENFOQUE: Venta Directa / Hard Sell. REGLAS: Usa urgencia real, escasez, resalta el ROI y el valor del precio.",
      autoridad: "ENFOQUE: Autoridad / Branding. REGLAS: Posiciona al mentor, usa lenguaje sofisticado, resalta la metodología.",
      lanzamiento: "ENFOQUE: Lanzamiento de Evento. REGLAS: Genera Hype, habla de una 'Oportunidad Única' y bonos.",
      leads: "ENFOQUE: Lead Generation. REGLAS: Enfócate en la transformación rápida y el valor inicial."
    };

    const { output } = await ai.generate({
      prompt: `Actúa como un Copywriter Senior de Respuesta Directa experto en Infoproductos.
Tu tarea es llenar la estructura de 3 Landings de Venta para el curso: "${input.courseTitle}".

DATOS CLAVE (OBLIGATORIO RESPETAR):
- Precio del Curso: $${input.price} (Usa este dato para justificar la inversión y el valor).
- Misión: ${missionDirectives[input.mission]} (Define el OBJETIVO estratégico).
- Público Objetivo: ${input.targetAudience} (Define el LENGUAJE y el tono).
- Directivas de Copy: ${input.templateDirectives}
${styleSpecificInstructions}

=== REGLA DE ORO: EL CURSO ES EL REY (FUSIÓN DE NICHO) ===
1. EJE CENTRAL: El curso trata sobre "${input.courseTitle}". La descripción es: "${input.courseDescription}". 
2. LENGUAJE Y TONO: Debes fusionar la temática del curso con el LENGUAJE técnico o emocional del PÚBLICO OBJETIVO. Si el público es experto, usa lenguaje avanzado; si es principiante, sé didáctico.
3. ESTRATEGIA: Usa la MISIÓN para dictar la urgencia y el tipo de oferta.
4. FILTRO DE INDUSTRIA: Si el público o directivas mencionan temáticas de otra industria (ej. salud), DEBES IGNORAR esa industria y usar solo su ESTILO de comunicación aplicado al CURSO.
5. REGLA DE CANTIDAD: Genera exactamente las secciones indicadas en 'templateStructure' y respeta la configuración del estilo ${selectedStyleId}.
6. PRECIO: Usa el precio de $${input.price} para justificar la inversión.
7. ESTILO VISUAL: Respeta la estructura del estilo ${selectedStyleId} incluyendo las secciones duplicables definidas.

ESTRUCTURA A LLENAR (3 VARIANTES):
${JSON.stringify(input.templateStructure)}

Instrucción de Salida: Devuelve un objeto con un array 'landings' que contenga las 3 variantes rellenas según el esquema.`,
      output: { schema: GenerateLandingOutputSchema },
      config: { temperature: 0.4 }
    });

    if (!output) throw new Error('La IA no pudo procesar las landings.');
    return output;
  }
);
