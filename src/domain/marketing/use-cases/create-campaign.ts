/**
 * Marketing — Caso de uso: publicar campaña.
 * Replica el documento de handleFinalPublish (mismos campos):
 * id aleatorio, mentorId, título, salesPageId, courseId,
 * strategy validada, startDate, autoPilot true, activa.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import {
  unavailable,
  validationError,
  type DomainError,
} from '@/domain/shared/errors';

import { CoordinationOutputSchema } from '../coordination-plan';
import type { CampaignRepository } from '../campaign-repository';

export const CreateCampaignInputSchema = z.object({
  mentorId: z.string().min(1, 'mentorId vacío'),
  title: z.string().min(1, 'título vacío'),
  salesPageId: z.string().min(1, 'salesPageId vacío'),
  courseId: z.string().nullable().optional(),
  strategy: CoordinationOutputSchema,
  startDate: z.string().min(1, 'fecha vacía'),
  /** Solo tests: id determinista. Por defecto, aleatorio como la página actual. */
  id: z.string().min(1).optional(),
});
export type CreateCampaignInput = z.infer<typeof CreateCampaignInputSchema>;

export interface CreateCampaignResult {
  readonly id: string;
}

function randomCampaignId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function createCampaign(
  repo: CampaignRepository,
  rawInput: unknown,
): Promise<Result<CreateCampaignResult, DomainError>> {
  const parsed = CreateCampaignInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Datos de campaña inválidos', parsed.error.flatten()));
  }
  try {
    const id = parsed.data.id ?? randomCampaignId();
    await repo.create({
      id,
      mentorId: parsed.data.mentorId,
      title: parsed.data.title,
      salesPageId: parsed.data.salesPageId,
      courseId: parsed.data.courseId ?? null,
      strategy: parsed.data.strategy,
      startDate: parsed.data.startDate,
      autoPilot: true,
      status: 'active',
      isActive: true,
      executionLogs: [],
    });
    return ok({ id });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(unavailable(`No se pudo publicar la campaña: ${message}`));
  }
}
