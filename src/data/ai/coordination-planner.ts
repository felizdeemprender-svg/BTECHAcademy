/**
 * Capa de datos — Planificador IA con Genkit (SERVER-ONLY).
 * NUNCA importar desde componentes cliente: Genkit no entra al browser.
 * Solo rutas API / server actions.
 */
import { generateCoordinationPlan as genkitPlan } from '@/ai/flows/generate-coordination-plan';
import {
  CoordinationOutputSchema,
  type CoordinationInput,
  type CoordinationOutput,
  type CoordinationPlanner,
} from '@/domain/marketing';

export class GenkitCoordinationPlanner implements CoordinationPlanner {
  async generate(input: CoordinationInput): Promise<CoordinationOutput> {
    const raw = await genkitPlan({
      campaignTitle: input.campaignTitle,
      strategyType: input.strategyType,
      durationDays: input.durationDays,
      targetAudience: input.targetAudience,
      availableVideos: input.availableVideos,
      productData: input.productData,
      activePlatforms: input.activePlatforms,
    });
    // Valida la salida IA al shape canónico (canales, variante, horarios).
    return CoordinationOutputSchema.parse(raw);
  }
}
