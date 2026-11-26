import { z } from 'zod';

export const EstimateCampaignBudgetInputSchema = z.object({
  pieceCount: z.number().int().positive(),
  autoGenerateImages: z.boolean().default(true),
  avgScenesPerPiece: z.number().int().min(1).default(4),
  currentBalance: z.number().nonnegative().default(0),
  role: z.string().default('mentor'),
});

export type EstimateCampaignBudgetInput = z.infer<typeof EstimateCampaignBudgetInputSchema>;

export interface CampaignBudgetEstimate {
  readonly pieceCount: number;
  readonly totalImagesEstimated: number;
  readonly llmCostEstimated: number;
  readonly imageCostEstimated: number;
  readonly totalCreditsEstimated: number;
  readonly currentBalance: number;
  readonly canAfford: boolean;
  readonly missingCredits: number;
}

/**
 * Computa la estimación de presupuesto de créditos para la generación de una campaña.
 * Si el usuario es administrador (role === 'admin'), canAfford es siempre true.
 */
export function estimateCampaignBudget(rawInput: unknown): CampaignBudgetEstimate {
  const parsed = EstimateCampaignBudgetInputSchema.parse(rawInput);
  const { pieceCount, autoGenerateImages, avgScenesPerPiece, currentBalance, role } = parsed;

  const totalImagesEstimated = autoGenerateImages ? pieceCount * avgScenesPerPiece : 0;

  // Costo promedio LLM (guión estructurado, ganchos y escenas por pieza): ~0.01 créditos/USD
  const llmCostEstimated = Math.round(pieceCount * 0.01 * 1000) / 1000;

  // Costo promedio por imagen generada (~0.045 créditos/USD)
  const imageCostEstimated = Math.round(totalImagesEstimated * 0.045 * 1000) / 1000;

  const totalCreditsEstimated = Math.round((llmCostEstimated + imageCostEstimated) * 100) / 100;

  const isAdmin = role === 'admin';
  const canAfford = isAdmin || currentBalance >= totalCreditsEstimated;
  const missingCredits = canAfford ? 0 : Math.round((totalCreditsEstimated - currentBalance) * 100) / 100;

  return {
    pieceCount,
    totalImagesEstimated,
    llmCostEstimated,
    imageCostEstimated,
    totalCreditsEstimated,
    currentBalance,
    canAfford,
    missingCredits,
  };
}
