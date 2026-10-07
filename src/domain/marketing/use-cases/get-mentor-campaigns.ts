/**
 * Marketing — Caso de uso: campañas de un mentor enriquecidas.
 * Lista por mentor, ordena por creación y agrega día actual,
 * acciones de hoy, progreso y si es ejecutable. Repositorio inyectado.
 */
import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';
import { sortByCreatedAtDesc } from '@/domain/shared/sort';

import {
  campaignCurrentDay,
  campaignProgressPercent,
  parseCampaignDate,
  todayActions,
} from '../coordination-plan';
import type { TimelineEvent } from '../timeline';
import { isExecutableCampaign, type Campaign } from '../campaign';
import type { CampaignRepository } from '../campaign-repository';

export interface CampaignSummary {
  readonly campaign: Campaign;
  readonly currentDay: number;
  readonly today: TimelineEvent[];
  readonly progressPercent: number;
  readonly executable: boolean;
  readonly productionStatus: Campaign['productionStatus'];
}

export interface GetMentorCampaignsInput {
  readonly mentorId: string;
  readonly now?: Date;
}

export async function getMentorCampaigns(
  repo: CampaignRepository,
  input: GetMentorCampaignsInput,
): Promise<Result<CampaignSummary[], DomainError>> {
  if (input.mentorId.trim() === '') {
    return err(validationError('mentorId vacío'));
  }
  const now = input.now ?? new Date();
  const campaigns = await repo.listByMentor(input.mentorId);
  return ok(
    sortByCreatedAtDesc(campaigns).map((campaign) => summarize(campaign, now)),
  );
}

export interface GetCampaignDetailInput {
  readonly id: string;
  readonly now?: Date;
}

export async function getCampaignDetail(
  repo: CampaignRepository,
  input: GetCampaignDetailInput,
): Promise<Result<CampaignSummary, DomainError>> {
  if (input.id.trim() === '') {
    return err(validationError('id vacío'));
  }
  const campaign = await repo.findById(input.id);
  if (!campaign) {
    return err(notFound(`Campaña ${input.id} no encontrada`));
  }
  return ok(summarize(campaign, input.now ?? new Date()));
}

function summarize(campaign: Campaign, now: Date): CampaignSummary {
  const currentDay = campaignCurrentDay(parseCampaignDate(campaign.startDate, now), now);
  const timeline = campaign.strategy.timeline;
  return {
    campaign,
    currentDay,
    today: todayActions(timeline, currentDay),
    progressPercent: campaignProgressPercent(timeline, currentDay),
    executable: isExecutableCampaign(campaign),
    productionStatus: campaign.productionStatus,
  };
}
