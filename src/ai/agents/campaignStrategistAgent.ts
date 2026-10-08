// src/ai/agents/campaignStrategistAgent.ts

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { CoordinationInput, CoordinationOutputSchema } from '../../domain/marketing/coordination-plan';

/**
 * Schema for the strategist input – same as CoordinationInput but enriched with productData.
 */
export const CampaignStrategistInput = z.object({
  campaignTitle: z.string(),
  strategyType: z.enum(['flash_sale', 'classic_launch', 'evergreen_warmup']).optional(),
  durationDays: z.number().int().min(1).default(7),
  targetAudience: z.string().optional(),
  availableVideos: z.array(z.string()).optional(),
  productData: z.object({
    price: z.number().optional(),
    productType: z.string().optional(),
  }).optional(),
  activePlatforms: z.array(z.string()).optional(),
});

/**
 * The core Genkit flow that acts as the "Campaign Strategist" agent.
 * It receives the enriched CoordinationInput and produces a CoordinationOutput
 * (the schedule of posts per platform). The LLM prompt is crafted to consider
 * price tiers and product type to decide which platforms receive which formats.
 */
export const runCampaignStrategist = ai.defineFlow(
  {
    name: 'runCampaignStrategist',
    inputSchema: CampaignStrategistInput,
    outputSchema: CoordinationOutputSchema,
    description: 'Genera el plan de coordinación de campaña adaptado al producto.',
  },
  async (input: z.infer<typeof CampaignStrategistInput>) => {
    const prompt = `
Actúa como un Estratega de Marketing de IA. Basado en los siguientes datos, genera un plan de coordinación en JSON.

- Nombre de campaña: ${input.campaignTitle}
- Tipo de estrategia: ${input.strategyType ?? 'classic_launch'}
- Duración (días): ${input.durationDays}
- Público objetivo: ${input.targetAudience ?? 'general'}
- Redes sociales habilitadas para este embudo: ${input.activePlatforms?.join(', ') ?? 'todas'}
- Videos disponibles: ${input.availableVideos?.join(', ') ?? 'ninguno'}
- Precio del producto: ${input.productData?.price ?? 'desconocido'}
- Tipo de producto: ${input.productData?.productType ?? 'desconocido'}


Reglas Estratégicas:
1. TODO el contenido (fases, acciones, lógica) DEBE estar escrito en Español.
2. IMPORTANTE: Por ahora, la campaña es 100% enfocada en Redes Sociales. El arreglo 'channels' de cada evento del timeline debe ser estrictamente ["Social"].
3. CRÍTICO: SOLO puedes generar contenido para las redes listadas en "Redes sociales habilitadas" (${input.activePlatforms?.join(', ') ?? 'todas'}). Si una red NO está en esa lista, está ESTRICTAMENTE PROHIBIDO generar contenido para ella en 'socialSchedule'.
4. Contexto por Red Social: Si el precio > 500 (High-Ticket), prioriza 'linkedin' y 'youtube'. Si es un "curso" o precio bajo, distribuye más en 'tiktok' e 'instagram'.
5. MULTI-FORMATO (CRÍTICO):
   - El 'socialSchedule' de una plataforma DEBE ser un ARRAY de piezas por día, no un solo objeto.
   - Usa una mezcla de formatos a lo largo del día para mantener a la audiencia activa:
     - Mañana (08:00 - 10:00): format 'reel' (para alcance orgánico y captación).
     - Mediodía (12:00 - 15:00): format 'story' (para interacción y cercanía).
     - Noche (18:00 - 20:00): format 'story' o 'carousel' (para conversión directa o valor extendido).
   - NOTA: El campo 'format' es 100% OBLIGATORIO en cada entrada. DEBE ser 'reel', 'story' o 'carousel'.
6. Asigna uno de los videos disponibles en 'videoName' de acuerdo al estilo de la pieza.
7. Devuelve estrictamente JSON que cumpla con el esquema CoordinationOutput.
`;
    console.log('[CampaignStrategist] activePlatforms received:', input.activePlatforms);
    const { output } = await ai.generate({ 

      prompt,
      output: { format: 'json', schema: CoordinationOutputSchema }
    });
    
    if (!output) {
      throw new Error("No output from strategist model");
    }

    // Post-procesamiento estricto: Eliminar cualquier red que la IA haya incluido por error
    if (input.activePlatforms && input.activePlatforms.length > 0) {
      const normalizedPlatforms = input.activePlatforms.map(p => p.toLowerCase().trim());
      output.timeline.forEach((event: any, idx: number) => {
        // Forzar estrictamente a Social como pidió el usuario para evitar errores
        event.channels = ['Social'];
        if (event.socialSchedule) {
          // Normalizar las claves a minúscula porque el LLM a veces las capitaliza (ej. "Instagram")
          const normalizedSchedule: any = {};
          for (const [key, value] of Object.entries(event.socialSchedule)) {
             normalizedSchedule[key.toLowerCase().trim()] = value;
          }
          
          for (const platform of Object.keys(normalizedSchedule)) {
            if (!normalizedPlatforms.includes(platform)) {
              delete normalizedSchedule[platform];
            }
          }
          event.socialSchedule = Object.keys(normalizedSchedule).length > 0 ? normalizedSchedule : undefined;
        }
      });
    }

    return output;
  }
);

// Export for external usage

