/**
 * Marketing — Campaña (colección `campaigns`).
 * Orquesta la emisión multicanal de un pack (`salesPageId`)
 * según el plan de coordinación, manual o en piloto automático.
 */
import { z } from 'zod';

import { CoordinationOutputSchema } from './coordination-plan';
import { ExecutionLogSchema } from './execution-log';

export const CampaignStatusSchema = z.enum(['active', 'paused']);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

export const CampaignSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  mentorId: z.string().min(1, 'mentorId vacío'),
  title: z.string().min(1, 'título vacío'),
  salesPageId: z.string().optional(),
  courseId: z.string().nullable().optional(),
  strategy: CoordinationOutputSchema,
  /** Fecha de inicio 'yyyy-mm-dd' (Día 1). */
  startDate: z.string().min(1, 'fecha vacía'),
  autoPilot: z.boolean().default(true),
  status: CampaignStatusSchema.default('active'),
  isActive: z.boolean().default(true),
  executionLogs: z.array(ExecutionLogSchema).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

export function parseCampaign(data: unknown): Campaign {
  return CampaignSchema.parse(data);
}

/** Ejecutable en el Centro de Mando: activa y (piloto o estado activo). */
export function isExecutableCampaign(
  campaign: Pick<Campaign, 'isActive' | 'autoPilot' | 'status'>,
): boolean {
  return campaign.isActive && (campaign.autoPilot || campaign.status === 'active');
}

export function toggleAutoPilot(campaign: Campaign): Campaign {
  return { ...campaign, autoPilot: !campaign.autoPilot };
}
