'use server';
/**
 * @fileOverview Un flujo de Genkit para refinar variantes individuales de un blueprint.
 * Permite ajustar Design Tokens y estructura basándose en directivas específicas.
 * Ahora utiliza el modelo predeterminado del sistema para evitar errores de versión.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RefineVariantInputSchema = z.object({
  channel: z.string().describe('Canal: landing, email, social, ads'),
  variant: z.any().describe('El objeto de la variante actual.'),
  directives: z.string().describe('Instrucciones para el refinamiento.'),
});
export type RefineVariantInput = z.infer<typeof RefineVariantInputSchema>;

const RefineVariantOutputSchema = z.object({
  refinedVariant: z.any().describe('El objeto de la variante refinada.'),
  explanation: z.string().describe('Una explicación de los cambios propuestos y su justificación estratégica.'),
});
export type RefineVariantOutput = z.infer<typeof RefineVariantOutputSchema>;

export async function refineVariant(input: RefineVariantInput): Promise<RefineVariantOutput> {
  return refineVariantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'refineVariantPrompt',
  input: { schema: RefineVariantInputSchema },
  output: { schema: RefineVariantOutputSchema },
  prompt: `Actúa como un Director de Arte Senior y Estratega de Marketing. Tu tarea es ANALIZAR y REFINAR una variante específica de un blueprint de marketing.

CANAL: {{{channel}}}
VARIANTE ACTUAL: {{{variant}}}
DIRECTIVAS DE REFINAMIENTO: {{{directives}}}

TAREA:
1. Genera una versión optimizada de la variante. 
2. Mejora los designTokens (colores, fuentes) para maximizar el impacto visual y la coherencia con las directivas.
3. Si es una Landing, ajusta el 'sectionCount' si crees que la densidad no es la óptima para las directivas (Minimal 1-3, Balanced 3-5, Detailed 5-7).
4. Si es un carrusel (Social), ajusta 'slideCount' para asegurar que el mensaje se cubra por completo (entre 5 y 10).
5. Redacta una explicación breve y profesional de por qué estos cambios mejorarán la conversión o la autoridad de la marca.

REGLA CRÍTICA:
Devuelve un objeto JSON con dos campos:
- 'refinedVariant': El objeto de la variante con los valores actualizados.
- 'explanation': Un párrafo explicando la estrategia detrás de los cambios.`,
});

const refineVariantFlow = ai.defineFlow(
  {
    name: 'refineVariantFlow',
    inputSchema: RefineVariantInputSchema,
    outputSchema: RefineVariantOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('No se pudo refinar la variante con la IA.');
    return output;
  }
);
