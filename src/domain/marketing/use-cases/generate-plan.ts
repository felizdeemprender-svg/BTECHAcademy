/**
 * Marketing — Caso de uso: generar plan de coordinación con IA.
 * Valida entrada y salida con Zod; el planificador se inyecta
 * (implementación Genkit en `src/data/ai`). Fallos → UNAVAILABLE.
 */
import { err, ok, type Result } from '@/domain/shared/result';
import {
  unavailable,
  validationError,
  type DomainError,
} from '@/domain/shared/errors';

import {
  CoordinationInputSchema,
  CoordinationOutputSchema,
  type CoordinationOutput,
} from '../coordination-plan';
import type { CoordinationPlanner } from '../coordination-planner';

export async function generateCoordinationPlan(
  planner: CoordinationPlanner,
  rawInput: unknown,
): Promise<Result<CoordinationOutput, DomainError>> {
  const parsedInput = CoordinationInputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    return err(validationError('Entrada inválida', parsedInput.error.flatten()));
  }
  try {
    const output = await planner.generate(parsedInput.data);
    const parsedOutput = CoordinationOutputSchema.safeParse(output);
    if (!parsedOutput.success) {
      return err(validationError('Plan IA inválido', parsedOutput.error.flatten()));
    }
    return ok(parsedOutput.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(unavailable(`No se pudo generar el plan: ${message}`));
  }
}
