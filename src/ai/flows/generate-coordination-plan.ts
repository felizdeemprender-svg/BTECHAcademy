'use server';
/**
 * @fileOverview Un flujo de Genkit para coordinar la emisión de una campaña.
 * Propone un cronograma detallado para desplegar las 3 variantes multimedia de forma estratégica.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { runCampaignStrategist } from '../agents/campaignStrategistAgent';

const SocialPlatformScheduleSchema = z.object({
  videoName: z.string().describe('Nombre de la variante sugerida para esta red social (ej: Variante 1, Variante 2).'),
  time: z.string().describe('Hora recomendada de publicación en formato HH:MM (Instagram 18:00, TikTok 19:30, LinkedIn 08:30, Twitter/X 13:00, etc.).')
});

const TimelineEventSchema = z.object({
  day: z.number().describe('Día relativo del lanzamiento.'),
  phase: z.string().describe('Fase: Expectativa, Venta, Cierre, etc.'),
  variantIndex: z.number().min(0).max(2).describe('Índice de la variante a usar (0, 1 o 2).'),
  action: z.string().describe('Descripción de la acción coordinada.'),
  channels: z.array(z.string()).describe('Canales activos en este hito.'),
  socialSchedule: z.record(SocialPlatformScheduleSchema).optional().describe('Mapa de programación por plataforma social activa (ej: {"instagram": {"videoName": "Variante 1", "time": "18:00"}})'),
});

const CoordinationInputSchema = z.object({
  campaignTitle: z.string(),
  strategyType: z.enum(['flash_sale', 'classic_launch', 'evergreen_warmup']),
  durationDays: z.number().default(7),
  targetAudience: z.string().optional(),
  availableVideos: z.array(z.string()).optional(),
  productData: z.object({
    price: z.number().optional(),
    productType: z.string().optional()
  }).optional(),
  activePlatforms: z.array(z.string()).optional(),
});
export type CoordinationInput = z.infer<typeof CoordinationInputSchema>;

const CoordinationOutputSchema = z.object({
  strategyName: z.string(),
  logic: z.string().describe('Razonamiento de la IA para esta coordinación.'),
  timeline: z.array(TimelineEventSchema),
});
export type CoordinationOutput = z.infer<typeof CoordinationOutputSchema>;

export async function generateCoordinationPlan(input: CoordinationInput): Promise<CoordinationOutput> {
  // Delegar a la lógica del agente estratega que considera productData
  return await runCampaignStrategist(input as any);
}

const prompt = ai.definePrompt({
  name: 'generateCoordinationPlanPrompt',
  input: { schema: CoordinationInputSchema },
  output: { schema: CoordinationOutputSchema },
  prompt: `Actúa como el 'Agente Estratega' (Campaign Strategist) de una Agencia de Marketing de Inteligencia Artificial.
Tu tarea es orquestar la emisión de una campaña en Redes Sociales adaptada ESTRICTAMENTE a la naturaleza y precio del producto.

DATOS DE LA CAMPAÑA Y PRODUCTO:
Título: {{{campaignTitle}}}
Estrategia Base: {{{strategyType}}}
Duración: {{{durationDays}}} días
Público: {{{targetAudience}}}
Precio del Producto: \${{{productData.price}}} (Si es >$100 es High-Ticket, usa lógica de Autoridad. Si es <$50 es Low-Ticket, usa Urgencia).
Tipo de Producto: {{{productData.productType}}}
Videos Disponibles (IDs): {{{availableVideos}}}

PUNTOS DE EMISIÓN ESTRATÉGICOS (HORAS PICO RECOMENDADAS POR RED SOCIAL):
Usa obligatoriamente uno de estos tres horarios para programar las redes en 'socialSchedule' según el canal:
1. Instagram:
   - '18:00' (Pico de Alto Impacto - Salida Laboral)
   - '08:30' (Tránsito Moderado - Despertar)
   - '13:00' (Tránsito Moderado - Almuerzo)
2. TikTok:
   - '19:30' (Pico de Alto Impacto - Relax Nocturno)
   - '12:30' (Tránsito Moderado - Almuerzo)
   - '16:30' (Tránsito Moderado - Tarde/Merienda)
3. LinkedIn:
   - '08:30' (Pico de Alto Impacto - Café Matutino/B2B)
   - '12:00' (Tránsito Moderado - Almuerzo B2B)
   - '17:30' (Tránsito Moderado - Cierre Oficina)
4. YouTube (Shorts/Videos):
   - '15:00' (Pico de Alto Impacto - Tarde)
   - '20:00' (Tránsito Moderado - Noche)
   - '12:00' (Tránsito Moderado - Mediodía)
5. Twitter/X:
   - '13:00' (Pico de Alto Impacto - Almuerzo/Tendencias)
   - '08:00' (Tránsito Moderado - Camino al Trabajo)
   - '18:30' (Tránsito Moderado - Vuelta a Casa)

INSTRUCCIONES:
1. Crea un cronograma (Timeline) que coordine la publicación de los 'Videos Disponibles' a lo largo de los días de la campaña.
2. Si el canal 'Social' está activo en un día, debes generar el objeto 'socialSchedule' con la programación recomendada para las redes pertinentes.
3. Para cada red en 'socialSchedule', selecciona una hora que coincida exactamente con alguno de los PUNTOS DE EMISIÓN ESTRATÉGICOS listados arriba (priorizando los Picos de Alto Impacto).
4. Asigna OBLIGATORIAMENTE un ID de la lista de 'Videos Disponibles' al campo 'videoName'. No inventes nombres. Tu objetivo es distribuir el volumen total de videos disponibles a lo largo de la duración de forma natural (ej. 1 o 2 por día).
5. Explica la 'logic' detrás de este orden de emisión para que el mentor entienda el embudo psicológico.`,
});

const generateCoordinationFlow = ai.defineFlow(
  {
    name: 'generateCoordinationFlow',
    inputSchema: CoordinationInputSchema,
    outputSchema: CoordinationOutputSchema,
  },
  async (input: any) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('Fallo al coordinar la estrategia de campaña.');
    return output;
  }
);
