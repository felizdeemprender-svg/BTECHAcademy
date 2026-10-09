/**
 * Marketing — Contrato del repositorio de campañas.
 * Lectura + escrituras con los mismos shapes que el código actual
 * (patch parcial + `updatedAt`; borrado solo del documento —
 * la limpieza de Drive sigue en la página, sin cambios).
 */
import { z } from 'zod';

import type { Campaign } from './campaign';
import { CampaignStatusSchema, CampaignProductionStatusSchema } from './campaign';
import { CoordinationOutputSchema } from './coordination-plan';
import type { ExecutionLog } from './execution-log';

export const CampaignPatchSchema = z.object({
  title: z.string().min(1).optional(),
  strategy: CoordinationOutputSchema.optional(),
  autoPilot: z.boolean().optional(),
  isActive: z.boolean().optional(),
  status: CampaignStatusSchema.optional(),
  productionStatus: CampaignProductionStatusSchema.optional(),
  progress: z.object({
    sealed: z.number(),
    total: z.number()
  }).optional(),
  startDate: z.string().optional(),
  videoSkeletons: z.array(z.unknown()).optional(),
});
export type CampaignPatch = z.infer<typeof CampaignPatchSchema>;

/** Campaña nueva: igual que Campaign pero sin fechas (las pone el repo). */
export type NewCampaign = Omit<Campaign, 'createdAt' | 'updatedAt'>;

export interface CampaignRepository {
  findById(id: string): Promise<Campaign | null>;
  listByMentor(mentorId: string, limit?: number): Promise<Campaign[]>;
  /** Crea con `createdAt` serverTimestamp (igual que handleFinalPublish). */
  create(campaign: NewCampaign): Promise<void>;
  update(id: string, patch: CampaignPatch): Promise<void>;
  remove(id: string): Promise<void>;
  /** Agrega logs con arrayUnion + `updatedAt` (igual que el dispatch actual). */
  appendExecutionLogs(id: string, logs: ExecutionLog[]): Promise<void>;
}
