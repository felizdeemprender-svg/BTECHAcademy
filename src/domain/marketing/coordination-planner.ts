/**
 * Marketing — Puerto del planificador de coordinación IA.
 * El dominio solo declara la interfaz; la implementación vive en
 * `src/data/ai` (Genkit es server-only y no debe entrar al bundle cliente).
 */
import type { CoordinationInput, CoordinationOutput } from './coordination-plan';

export interface CoordinationPlanner {
  generate(input: CoordinationInput): Promise<CoordinationOutput>;
}
