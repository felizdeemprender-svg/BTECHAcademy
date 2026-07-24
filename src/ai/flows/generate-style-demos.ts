'use server';
/**
 * @fileOverview Flujo de Genkit para generar demos de estilos
 * Genera 3 variantes de demo usando el mismo circuito que landings reales
 * con imágenes acordes al tema de la colección
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { CLASSIC_STYLE_CONFIG } from '@/app/mentoria/marketing/templates/styles/classic-style-config';

const DemoVariantSchema = z.object({
  variant: z.string().describe('ID de la variante (minimal, balanced, detailed)'),
  marketingName: z.string().describe('Nombre comercial de la variante'),
  headline: z.string().describe('Titular persuasivo'),
  subheadline: z.string().describe('Bajada estratégica'),
  ctaText: z.string(),
  sections: z.array(z.object({
    title: z.string(),
    description: z.string(),
    image: z.string().optional(),
    hasVideo: z.boolean().default(false),
    bulletPoints: z.array(z.string()).optional(),
  })),
  benefits: z.array(z.string()).optional(),
  aboutMentor: z.string().optional(),
  designTokens: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    fontHeading: z.string(),
    fontBody: z.string(),
  }).optional(),
});

const GenerateStyleDemosInputSchema = z.object({
  styleId: z.string().describe('ID del estilo (classic, modern, etc.)'),
  collectionName: z.string().describe('Nombre de la colección'),
  collectionDescription: z.string().describe('Descripción de la colección'),
  designTokens: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    fontHeading: z.string(),
    fontBody: z.string(),
  }).describe('Tokens de diseño de la colección'),
  topic: z.string().describe('Tema principal para las demos (ej: "fábrica de aplicaciones")'),
});

export type GenerateStyleDemosInput = z.infer<typeof GenerateStyleDemosInputSchema>;

const GenerateStyleDemosOutputSchema = z.object({
  demos: z.array(DemoVariantSchema),
});

export type GenerateStyleDemosOutput = z.infer<typeof GenerateStyleDemosOutputSchema>;

/**
 * Genera 3 variantes de demo para un estilo específico
 */
export async function generateStyleDemos(input: GenerateStyleDemosInput): Promise<GenerateStyleDemosOutput> {
  try {
    return await generateStyleDemosFlow(input);
  } catch (e: any) {
    console.error("[Flow: GenerateStyleDemos] Critical failure:", e);
    throw new Error(e.message || "Fallo crítico en el motor de generación de demos.");
  }
}

const generateStyleDemosFlow = ai.defineFlow(
  {
    name: 'generateStyleDemosFlow',
    inputSchema: GenerateStyleDemosInputSchema,
    outputSchema: GenerateStyleDemosOutputSchema,
  },
  async (input) => {
    // Obtener configuración específica del estilo
    const selectedStyleId = input.styleId || 'classic';
    let styleConfig = null;
    
    if (selectedStyleId === 'classic') {
      styleConfig = CLASSIC_STYLE_CONFIG;
    }
    
    // Construir instrucciones específicas del estilo
    let styleSpecificInstructions = '';
    if (styleConfig && styleConfig.layout) {
      styleSpecificInstructions = `
CONFIGURACIÓN DEL ESTILO ${styleConfig.name.toUpperCase()}:
- Layout: ${styleConfig.layout.hero} hero, ${styleConfig.layout.sections} sections, ${styleConfig.layout.footer} footer
- Número de secciones REPETIBLES por defecto: ${styleConfig.defaultSectionCount}
- Secciones disponibles con sus descripciones de contenido:
${styleConfig.availableSections.map(s => `  * ${s.id} (${s.name}): ${(styleConfig as any).prompts?.[s.id] || 'Generar contenido para esta sección'}`).join('\n')}
- INSTRUCCIÓN CRÍTICA ARQUITECTÓNICA: La plataforma ya dibuja de forma automática y por separado el Hero (usando 'headline'), el Tutor (usando 'aboutMentor'), los Beneficios (usando 'benefits') y los Precios (usando 'price'). 
- POR LO TANTO: El array 'sections' sirve ÚNICA Y EXCLUSIVAMENTE para generar los bloques de contenido persuasivo / características del producto (argumentos de venta). ¡NUNCA metas al Tutor, los Beneficios, las Faqs ni los Precios dentro del array 'sections'!
`;
    }
    
    const { output } = await ai.generate({
      prompt: `Actúa como un Director de Arte y Copywriter Senior experto en generación de demos de landing pages.
Tu tarea es generar 3 variantes de demo para el estilo "${selectedStyleId}" basadas en la colección "${input.collectionName}".

TEMA ESTRICTO DE LAS DEMOS: OBLIGATORIAMENTE DEBES ENFOCAR TODO EL CONTENIDO (TÍTULOS, DESCRIPCIONES, BENEFICIOS) EN: "${input.topic}". NO INVENTES TEMAS ALEATORIOS.
DESCRIPCIÓN DE LA COLECCIÓN: ${input.collectionDescription}

IDENTIDAD VISUAL (USA ESTOS COLORES OBLIGATORIAMENTE):
- Color Primario: ${input.designTokens.primary}
- Color Secundario: ${input.designTokens.secondary} 
- Color Acento: ${input.designTokens.accent}
- Fuente Títulos: ${input.designTokens.fontHeading}
- Fuente Cuerpo: ${input.designTokens.fontBody}

${styleSpecificInstructions}

REGLAS DE GENERACIÓN:
1. Genera exactamente 3 variantes de demo: "Variante 1", "Variante 2", "Variante 3" (deben ir en el campo "variant")
2. Cada variante debe enfocarse 100% en los beneficios de FastoriaAcademy.
3. Las imágenes deben ser acordes al tema (ej: tecnología, educación, mentoring).
4. El contenido debe ser altamente persuasivo y profesional.
5. DEBES incluir el campo "styleId" con valor "${selectedStyleId}" en CADA demo generada.
6. EL ARRAY 'sections': Debe contener EXACTAMENTE ${styleConfig?.defaultSectionCount || 3} bloques de contenido persuasivo. ¡NO INCLUYAS SECCIONES DE TUTOR, PRECIOS O BENEFICIOS AQUÍ! Esos van en sus propios campos dedicados ('aboutMentor', 'price', 'benefits').

VARIANTE 1:
- Enfoque: Directo y conciso (menos texto, directo al grano)

VARIANTE 2:
- Enfoque: Equilibrado, enfocado en mostrar beneficios claros y pruebas sociales (si las hay).

VARIANTE 3:
- Enfoque: Detallado, explicando en profundidad por qué la plataforma es la mejor opción.

Instrucción de Salida: Devuelve un objeto con un array 'demos' que contenga las 3 variantes generadas según el esquema.`,
      output: { schema: GenerateStyleDemosOutputSchema },
      config: { temperature: 0.7, maxOutputTokens: 8192 }
    });

    if (!output) throw new Error('La IA no pudo procesar las demos.');
    return output;
  }
);
