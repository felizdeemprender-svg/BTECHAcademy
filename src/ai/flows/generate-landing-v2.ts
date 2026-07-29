'use server';
/**
 * @fileOverview Nuevo flujo de Genkit para generar el contenido de Landings de Venta (V2).
 * Usa el sistema atómico de LandingStyles, y genera una ÚNICA versión de altísima calidad.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getLandingStyle } from '@/lib/landing-styles';

const LandingSectionContentSchema = z.object({
  id: z.string().describe('El ID exacto de la sección (ej: "heroVideo", "narrativeSections")'),
  title: z.string().optional().describe('Título principal de la sección, si aplica.'),
  content: z.string().optional().describe('Texto persuasivo o párrafo de la sección.'),
  bullets: z.array(z.string()).optional().describe('Lista de viñetas, si la sección lo requiere.'),
  ctaText: z.string().optional().describe('Texto para el botón, si la sección tiene uno.'),
  videoUrl: z.string().optional().describe('URL del video (YouTube/Vimeo) si aplica.'),
  imageUrl: z.string().optional().describe('URL de la imagen si aplica.'),
});

const LandingV2FilledSchema = z.object({
  marketingName: z.string().describe('Nombre comercial persuasivo para la oferta.'),
  colorPaletteName: z.string().describe('Nombre de la paleta de colores elegida (ej: "Océano"). Debe coincidir exactamente con una de las propuestas del estilo.'),
  typographyVariantName: z.string().describe('Nombre de la variante tipográfica elegida (ej: "Moderna"). Debe coincidir exactamente con una de las opciones del estilo.'),
  sections: z.array(LandingSectionContentSchema).describe('Array con el contenido redactado para CADA UNA de las secciones requeridas por el estilo.'),
});

const GenerateLandingV2InputSchema = z.object({
  courseTitle: z.string(),
  courseDescription: z.string(),
  mentorName: z.string(),
  price: z.number(),
  targetAudience: z.string(),
  styleId: z.string(),
  directives: z.string().optional(),
  colorPaletteName: z.string().optional(),
  typographyVariantName: z.string().optional(),
  requestedSections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    required: z.boolean(),
  })).optional(),
});
export type GenerateLandingV2Input = z.infer<typeof GenerateLandingV2InputSchema>;

export type GenerateLandingV2Output = z.infer<typeof LandingV2FilledSchema>;

export async function generateLandingV2(input: GenerateLandingV2Input): Promise<GenerateLandingV2Output> {
  try {
    return await generateLandingV2Flow(input);
  } catch (e: any) {
    console.error("[Flow: GenerateLandingV2] Critical failure:", e);
    throw new Error(e.message || "Fallo crítico en el motor de generación de landings V2.");
  }
}

const generateLandingV2Flow = ai.defineFlow(
  {
    name: 'generateLandingV2Flow',
    inputSchema: GenerateLandingV2InputSchema,
    outputSchema: LandingV2FilledSchema,
  },
  async (input) => {
    const style = getLandingStyle(input.styleId);
    if (!style) {
      throw new Error(`Estilo no encontrado: ${input.styleId}`);
    }

    const availableColors = style.colorProposals.map(c => c.name).join(', ');
    const availableFonts = style.typography.map(t => t.name).join(', ');
    
    // Si el usuario proporcionó requestedSections (Paso 2 config), usamos eso y sufijamos para repetidas.
    // Si no, caemos en el default de availableSections.
    const requiredSections = input.requestedSections && input.requestedSections.length > 0
      ? input.requestedSections.map((rs, idx) => {
          const secDef = style.availableSections.find(s => s.id === rs.id);
          return {
            id: `${rs.id}_${idx}`,
            name: rs.title,
            description: secDef?.description || ''
          };
        })
      : style.availableSections.map((s, idx) => ({
          id: `${s.id}_${idx}`,
          name: s.name,
          description: s.description
        }));

    const promptText = `Actúa como un Copywriter Senior de Respuesta Directa experto en Venta de Infoproductos.
Tu tarea es redactar el contenido de UNA Landing Page de altísima conversión.

DATOS CLAVE DEL CURSO:
- Título: "${input.courseTitle}"
- Descripción: "${input.courseDescription}"
- Creador/Mentor: ${input.mentorName}
- Precio: $${input.price} (Úsalo para justificar la inversión)
- Público Objetivo: ${input.targetAudience}
- Directivas Extra: ${input.directives || 'Ninguna'}

DIRECTIVAS DEL ESTILO (${style.name}):
${style.aiDirectives || 'Ninguna directiva específica del estilo.'}

RESTRICCIONES ARQUITECTÓNICAS:
El diseño ya está definido. NO debes inventar código HTML ni CSS. Tu trabajo es puramente redactar textos brillantes y elegir variables estéticas.

1. DEBES devolver EXACTAMENTE esta paleta de color en el JSON: "${input.colorPaletteName || availableColors.split(',')[0]}"
2. DEBES devolver EXACTAMENTE esta tipografía en el JSON: "${input.typographyVariantName || availableFonts.split(',')[0]}"
3. DEBES proveer contenido EXACTAMENTE para las siguientes secciones solicitadas (usa sus IDs textualmente y respeta el orden):
${JSON.stringify(requiredSections, null, 2)}

REGLAS DE COPYWRITING:
1. Dirígete exclusivamente al Público Objetivo (${input.targetAudience}), usando su lenguaje y empatizando profundamente con sus dolores.
2. Habla siempre al lector en segunda persona ("tú").
3. Sigue las directivas del estilo (${style.name}) al pie de la letra.
4. Cada frase debe ganarse su lugar; sé conciso, elegante y persuasivo.
`;

    const { output } = await ai.generate({
      prompt: promptText,
      output: { schema: LandingV2FilledSchema },
      config: { temperature: 0.5 }
    });

    if (!output) throw new Error('La IA no devolvió respuesta.');
    return output;
  }
);

// --- SECCIÓN: Regeneración de Sección Individual ---

const RegenerateSectionInputSchema = z.object({
  courseTitle: z.string(),
  courseDescription: z.string(),
  mentorName: z.string(),
  targetAudience: z.string(),
  styleId: z.string(),
  sectionId: z.string().describe('El ID de la sección actual (ej: "narrativeSections_0")'),
  sectionName: z.string().describe('El nombre de la sección (ej: "Sección Narrativa")'),
  sectionDescription: z.string().optional().describe('La descripción de lo que debe hacer la sección según el estilo'),
});

export type RegenerateSectionInput = z.infer<typeof RegenerateSectionInputSchema>;
export type RegenerateSectionOutput = z.infer<typeof LandingSectionContentSchema>;

export async function regenerateSectionV2(input: RegenerateSectionInput): Promise<RegenerateSectionOutput> {
  try {
    return await regenerateSectionV2Flow(input);
  } catch (e: any) {
    console.error("[Flow: RegenerateSectionV2] Critical failure:", e);
    throw new Error(e.message || "Fallo crítico al re-generar la sección.");
  }
}

const regenerateSectionV2Flow = ai.defineFlow(
  {
    name: 'regenerateSectionV2Flow',
    inputSchema: RegenerateSectionInputSchema,
    outputSchema: LandingSectionContentSchema,
  },
  async (input) => {
    const style = getLandingStyle(input.styleId);
    
    const promptText = `Actúa como un Copywriter Senior experto en Venta de Infoproductos.
Tu tarea es RE-ESCRIBIR exclusivamente el contenido de UNA sola sección de una Landing Page de altísima conversión.

DATOS CLAVE DEL CURSO (Para dar contexto):
- Título: "${input.courseTitle}"
- Descripción: "${input.courseDescription}"
- Mentor: ${input.mentorName}
- Público Objetivo: ${input.targetAudience}

ESTILO VISUAL: ${style?.name || 'Estándar'}
${style?.aiDirectives ? 'Directivas de estilo: ' + style.aiDirectives : ''}

LA SECCIÓN A RE-ESCRIBIR:
- ID de Sección: "${input.sectionId}"
- Tipo de Sección: "${input.sectionName}"
- Propósito/Descripción de la sección: "${input.sectionDescription || 'Generar interés y persuasión.'}"

INSTRUCCIONES:
1. Devuelve ÚNICAMENTE el objeto JSON que representa esta sección, asegurándote de que la propiedad "id" sea EXACTAMENTE "${input.sectionId}".
2. Redacta títulos, textos y viñetas (si aplica) mucho más persuasivos, frescos y orientados al Público Objetivo.
3. No incluyas URLs de video o imagen a menos que ya las deduzcas o dejes en blanco, el usuario las subirá.
`;

    const { output } = await ai.generate({
      prompt: promptText,
      output: { schema: LandingSectionContentSchema },
      config: { temperature: 0.7 }
    });

    if (!output) throw new Error('La IA no devolvió respuesta para la regeneración.');
    
    // Forzar el ID para que coincida exactamente
    output.id = input.sectionId;
    
    return output;
  }
);
