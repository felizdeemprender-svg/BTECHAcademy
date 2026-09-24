import { describe, expect, it } from 'vitest';
import { generatePlan } from '../generate-plan';

describe('generatePlan', () => {
  it('debe generar un plan basado en los parámetros', async () => {
    // Si la función interactúa con un servicio externo o LLM, 
    // en un unit test real se inyectaría una dependencia mockeada.
    // Aquí verificamos que devuelva la estructura esperada si es puramente determinista o mockeable.
    const result = await generatePlan({
      mission: 'venta',
      durationDays: 7,
      platforms: ['instagram']
    });

    expect(result).toBeDefined();
    expect(result.timeline).toBeInstanceOf(Array);
  });
});
