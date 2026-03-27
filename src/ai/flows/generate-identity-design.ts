'use server';
/**
 * @fileOverview Flujo de Genkit para generar diseño de identidad visual
 * Utiliza el modelo predeterminado configurado en el núcleo de Genkit
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DesignTokensSchema = z.object({
  primary: z.string().describe('Color primario en formato HEX'),
  secondary: z.string().describe('Color secundario en formato HEX'),
  accent: z.string().describe('Color de acento en formato HEX'),
  fontHeading: z.string().describe('Fuente para titulares'),
  fontBody: z.string().describe('Fuente para cuerpo de texto')
});

const ColorPaletteSchema = z.object({
  primary: z.string().describe('Color primario en HEX'),
  secondary: z.string().describe('Color secundario en HEX'),
  accent: z.string().describe('Color de acento en HEX'),
  neutrals: z.array(z.string()).describe('Array de colores neutros en HEX'),
  complements: z.array(z.string()).describe('Array de colores complementarios en HEX')
});

const TypographySchema = z.object({
  heading: z.object({
    font: z.string().describe('Nombre de la fuente para titulares'),
    weights: z.array(z.string()).describe('Array de pesos disponibles'),
    sizes: z.array(z.string()).describe('Array de tamaños disponibles')
  }),
  body: z.object({
    font: z.string().describe('Nombre de la fuente para cuerpo'),
    weights: z.array(z.string()).describe('Array de pesos disponibles'),
    sizes: z.array(z.string()).describe('Array de tamaños disponibles')
  })
});

const RationaleSchema = z.object({
  colors: z.string().describe('Justificación de la paleta de colores seleccionada'),
  typography: z.string().describe('Justificación de las tipografías seleccionadas'),
  overall: z.string().describe('Justificación general del diseño')
});

const IdentityDesignSchema = z.object({
  designTokens: DesignTokensSchema,
  colorPalette: ColorPaletteSchema,
  typography: TypographySchema,
  rationale: RationaleSchema
});

const DesignInputSchema = z.object({
  directives: z.string().describe('Directivas de diseño del usuario')
});

export type DesignInput = z.infer<typeof DesignInputSchema>;
export type IdentityDesign = z.infer<typeof IdentityDesignSchema>;

export async function generateIdentityDesign(input: DesignInput): Promise<IdentityDesign> {
  try {
    const result = await generateIdentityDesignFlow(input);
    return result;
  } catch (error: any) {
    console.error("[Flow Error: GenerateIdentityDesign]", error);
    // En caso de error, devolver un diseño por defecto en lugar de null
    return {
      designTokens: {
        primary: "#3B82F6",
        secondary: "#F3F4F6",
        accent: "#10B981",
        fontHeading: "Inter",
        fontBody: "Inter"
      },
      colorPalette: {
        primary: "#3B82F6",
        secondary: "#F3F4F6",
        accent: "#10B981",
        neutrals: ["#1F2937", "#6B7280", "#D1D5DB", "#F9FAFB"],
        complements: ["#8B5CF6"]
      },
      typography: {
        heading: {
          font: "Inter",
          weights: ["700", "600", "500"],
          sizes: ["48px", "36px", "24px", "20px"]
        },
        body: {
          font: "Inter",
          weights: ["400", "500", "600"],
          sizes: ["16px", "14px", "12px"]
        }
      },
      rationale: {
        colors: "Paleta predeterminada debido a un error en la generación.",
        typography: "Tipografía predeterminada debido a un error en la generación.",
        overall: "Diseño predeterminado debido a un error en la generación con IA."
      }
    };
  }
}

const IdentityDesignArraySchema = z.array(IdentityDesignSchema);

export type IdentityDesignArray = z.infer<typeof IdentityDesignArraySchema>;

export async function generateIdentityDesignBatch(input: DesignInput): Promise<IdentityDesignArray> {
  try {
    const result = await generateIdentityDesignBatchFlow(input);
    return result;
  } catch (error: any) {
    console.error("[Flow Error: GenerateIdentityDesignBatch]", error);
    // En caso de error, devolver 5 diseños por defecto
    return Array(5).fill(null).map((_, index) => ({
      designTokens: {
        primary: "#3B82F6",
        secondary: "#F3F4F6",
        accent: "#10B981",
        fontHeading: "Inter",
        fontBody: "Inter"
      },
      colorPalette: {
        primary: "#3B82F6",
        secondary: "#F3F4F6",
        accent: "#10B981",
        neutrals: ["#1F2937", "#6B7280", "#D1D5DB", "#F9FAFB"],
        complements: ["#8B5CF6"]
      },
      typography: {
        heading: {
          font: "Inter",
          weights: ["700", "600", "500"],
          sizes: ["48px", "36px", "24px", "20px"]
        },
        body: {
          font: "Inter",
          weights: ["400", "500", "600"],
          sizes: ["16px", "14px", "12px"]
        }
      },
      rationale: {
        colors: `Diseño predeterminado ${index + 1} debido a un error en la generación.`,
        typography: `Tipografía predeterminada ${index + 1} debido a un error en la generación.`,
        overall: `Diseño predeterminado ${index + 1} debido a un error en la generación con IA.`
      }
    }));
  }
}

const generateIdentityDesignBatchFlow = ai.defineFlow(
  {
    name: 'generateIdentityDesignBatchFlow',
    inputSchema: DesignInputSchema,
    outputSchema: IdentityDesignArraySchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      prompt: `Actúa como un Director de Arte y Diseñador Gráfico experto. Tu tarea es generar 5 identidades visuales únicas y profesionales basadas en las directivas del usuario.

DIRECTIVAS DEL USUARIO:
${input.directives}

INSTRUCCIONES DE DISEÑO:
1. Genera 5 paletas de colores diferentes y coherentes basadas en las directivas
2. Selecciona 5 combinaciones de tipografías modernas y apropiadas
3. Cada diseño debe ser único y diferente de los otros 4
4. Proporciona justificaciones claras para cada diseño
5. Asegúrate de que todos los diseños sean profesionales y efectivos

REQUISITOS TÉCNICOS:
- Colores en formato HEX (ej: #3B82F6)
- Tipografías web modernas (Inter, Roboto, Poppins, Montserrat, Open Sans, Lato, Nunito, Raleway)
- Cada paleta debe incluir: primario, secundario, acento, 4 neutros, 2 complementarios
- Justificaciones deben ser específicas y profesionales
- Los 5 diseños deben ser notablemente diferentes entre sí

Genera exactamente 5 identidades visuales completamente nuevas y únicas para esta solicitud. No repitas diseños anteriores y asegúrate de que cada uno sea distinto de los otros.`,
      output: {
        schema: IdentityDesignArraySchema,
      },
    });

    return output;
  }
);
