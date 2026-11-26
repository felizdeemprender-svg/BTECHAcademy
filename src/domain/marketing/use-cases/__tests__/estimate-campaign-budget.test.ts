import { describe, expect, it } from 'vitest';
import { estimateCampaignBudget } from '../estimate-campaign-budget';

describe('Estimate Campaign Budget Use Case', () => {
  it('calcula correctamente para 21 piezas con imágenes automáticas y saldo suficiente', () => {
    const result = estimateCampaignBudget({
      pieceCount: 21,
      autoGenerateImages: true,
      avgScenesPerPiece: 4,
      currentBalance: 10,
      role: 'mentor',
    });

    expect(result.pieceCount).toBe(21);
    expect(result.totalImagesEstimated).toBe(84); // 21 * 4
    expect(result.llmCostEstimated).toBe(0.21); // 21 * 0.01
    expect(result.imageCostEstimated).toBe(3.78); // 84 * 0.045
    expect(result.totalCreditsEstimated).toBe(3.99); // 0.21 + 3.78
    expect(result.canAfford).toBe(true);
    expect(result.missingCredits).toBe(0);
  });

  it('detecta saldo insuficiente cuando los créditos disponibles son menores al estimado', () => {
    const result = estimateCampaignBudget({
      pieceCount: 21,
      autoGenerateImages: true,
      avgScenesPerPiece: 4,
      currentBalance: 1.5,
      role: 'mentor',
    });

    expect(result.canAfford).toBe(false);
    expect(result.missingCredits).toBe(2.49); // 3.99 - 1.5
  });

  it('calcula solo costo LLM si autoGenerateImages es false', () => {
    const result = estimateCampaignBudget({
      pieceCount: 10,
      autoGenerateImages: false,
      currentBalance: 0.5,
      role: 'mentor',
    });

    expect(result.totalImagesEstimated).toBe(0);
    expect(result.imageCostEstimated).toBe(0);
    expect(result.llmCostEstimated).toBe(0.1);
    expect(result.totalCreditsEstimated).toBe(0.1);
    expect(result.canAfford).toBe(true);
  });

  it('permite a administradores omitir validación de saldo (canAfford siempre true)', () => {
    const result = estimateCampaignBudget({
      pieceCount: 50,
      autoGenerateImages: true,
      currentBalance: 0,
      role: 'admin',
    });

    expect(result.canAfford).toBe(true);
    expect(result.missingCredits).toBe(0);
  });
});
