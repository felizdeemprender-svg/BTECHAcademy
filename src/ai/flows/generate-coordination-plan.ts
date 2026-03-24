'use server';
/**
 * @fileOverview Un flujo de Genkit para coordinar la emisión de una campaña.
 * Propone un cronograma detallado para desplegar las 3 variantes multimedia de forma estratégica.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TimelineEventSchema = z.object({
  day: z.number().describe('Día relativo del lanzamiento.'),
  phase: z.string().describe('Fase: Expectativa, Venta, Cierre, etc.'),
  variantIndex: z.number().min(0).max(2).describe('Índice de la variante a usar (0, 1 o 2).'),
  action: z.string().describe('Descripción de la acción coordinada.'),
  channels: z.array(z.string()).describe('Canales activos en este hito.'),
});

const CoordinationInputSchema = z.object({
  campaignTitle: z.string(),
  strategyType: z.enum(['flash_sale', 'classic_launch', 'evergreen_warmup']),
  durationDays: z.number().default(7),
  targetAudience: z.string().optional(),
});
export type CoordinationInput = z.infer<typeof CoordinationInputSchema>;

const CoordinationOutputSchema = z.object({
  strategyName: z.string(),
  logic: z.string().describe('Razonamiento de la IA para esta coordinación.'),
  timeline: z.array(TimelineEventSchema),
});
export type CoordinationOutput = z.infer<typeof CoordinationOutputSchema>;

export async function generateCoordinationPlan(input: CoordinationInput): Promise<CoordinationOutput> {
  return generateCoordinationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCoordinationPlanPrompt',
  input: { schema: CoordinationInputSchema },
  output: { schema: CoordinationOutputSchema },
  prompt: `Actúa como un Director de Operaciones de Marketing (Growth Hacker). 
Tu tarea es orquestar la emisión de una campaña que tiene 3 variantes estratégicas:
- Variante 1: Enfoque Mínimo/Directo.
- Variante 2: Enfoque Equilibrado/Persuasivo.
- Variante 3: Enfoque Detallado/Profundo.

DATOS DE CAMPAÑA:
Título: {{{campaignTitle}}}
Estrategia: {{{strategyType}}}
Duración: {{{durationDays}}} días
Público: {{{targetAudience}}}

INSTRUCCIONES:
1. Crea un cronograma (Timeline) que coordine el uso de las 3 variantes. No las uses todas al mismo tiempo.
2. Define hitos claros por día. Por ejemplo, en un lanzamiento de 7 días:
   - Días 1-2: Fase de Expectativa (usualmente variante corta/minimal).
   - Días 3-5: Fase de Valor/Detalle (usualmente variante detallada).
   - Días 6-7: Fase de Cierre/Urgencia (variante equilibrada con CTA fuerte).
3. Asegúrate de que los canales (Email, Social, Ads) estén sincronizados en cada hito.
4. Explica la 'logic' detrás de este orden de emisión para que el mentor entienda el embudo psicológico.`,
});

const generateCoordinationFlow = ai.defineFlow(
  {
    name: 'generateCoordinationFlow',
    inputSchema: CoordinationInputSchema,
    outputSchema: CoordinationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('Fallo al coordinar la estrategia de campaña.');
    return output;
  }
);
