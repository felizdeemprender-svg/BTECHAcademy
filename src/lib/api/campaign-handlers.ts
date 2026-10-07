/**
 * API — Handlers testeables de campañas.
 * Reciben gateway y llamante inyectados (los route.ts solo cablean).
 * Authz: ver campañas de un mentor si es él mismo o admin.
 */
import { NextResponse } from 'next/server';

import { ok, err, type Result } from '@/domain/shared/result';
import { validationError, type DomainError } from '@/domain/shared/errors';
import { CampaignPatchSchema } from '@/domain/marketing/campaign-repository';
import {
  getCampaignDetail,
  getMentorCampaigns,
} from '@/domain/marketing/use-cases/get-mentor-campaigns';
import {
  removeCampaign,
  setCampaignAutoPilot,
  updateCampaignStrategy,
} from '@/domain/marketing/use-cases/update-campaign';
import {
  executeCampaignStep,
  type CredentialsMap,
} from '@/domain/marketing/use-cases/execute-campaign';
import { FirestoreCampaignRepository } from '@/data/firestore/campaign-repo';
import { FirestoreSalesPageRepository } from '@/data/firestore/sales-page-repo';
import type { FirestoreGateway } from '@/data/firestore/gateway';

import { canAccessMentorData, type Caller } from './mentor-auth';
import { forbidden, toApiResponse, unauthorized } from './results';

export async function handleListCampaigns(
  gateway: FirestoreGateway,
  caller: Caller | null,
  mentorId: string,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  if (!mentorId || !canAccessMentorData(caller, mentorId)) return forbidden();
  const repo = new FirestoreCampaignRepository(gateway);
  return toApiResponse(await getMentorCampaigns(repo, { mentorId }));
}

export async function handleGetCampaign(
  gateway: FirestoreGateway,
  caller: Caller | null,
  id: string,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const repo = new FirestoreCampaignRepository(gateway);
  const detail = await getCampaignDetail(repo, { id });
  if (detail.ok && !canAccessMentorData(caller, detail.value.campaign.mentorId)) {
    return forbidden();
  }
  return toApiResponse(detail);
}

async function handleOwnerWrite(
  gateway: FirestoreGateway,
  caller: Caller | null,
  id: string,
  write: (repo: FirestoreCampaignRepository) => Promise<Result<void, DomainError>>,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const repo = new FirestoreCampaignRepository(gateway);
  const existing = await repo.findById(id);
  if (!existing) {
    return NextResponse.json({ error: `Campaña ${id} no encontrada` }, { status: 404 });
  }
  if (!canAccessMentorData(caller, existing.mentorId)) return forbidden();
  return toApiResponse(await write(repo));
}

/**
 * PATCH /api/campaigns/[id] body { strategy?: ..., autoPilot?: ... }.
 * Mismos campos que las escrituras actuales + `updatedAt`.
 */
export async function handlePatchCampaign(
  gateway: FirestoreGateway,
  caller: Caller | null,
  id: string,
  body: unknown,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const patch = (body ?? {}) as { strategy?: unknown; autoPilot?: unknown; startDate?: unknown; title?: unknown };
  
  if (Object.keys(patch).length > 0) {
    return handleOwnerWrite(gateway, caller, id, async (repo) => {
      const parsed = CampaignPatchSchema.safeParse(patch);
      if (!parsed.success) {
        return err(validationError('Estrategia inválida', parsed.error.flatten()));
      }
      await repo.update(id, parsed.data);
      return ok(undefined);
    });
  }

  return NextResponse.json(
    { error: 'Nada para actualizar' },
    { status: 400 },
  );
}

/**
 * DELETE /api/campaigns/[id]. Borra solo el documento
 * (la limpieza de Drive sigue en la página, sin cambios).
 */
export async function handleDeleteCampaign(
  gateway: FirestoreGateway,
  caller: Caller | null,
  id: string,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const repo = new FirestoreCampaignRepository(gateway);
  const existing = await repo.findById(id);
  if (!existing) {
    return NextResponse.json({ error: `Campaña ${id} no encontrada` }, { status: 404 });
  }
  if (!canAccessMentorData(caller, existing.mentorId)) return forbidden();

  const result = await removeCampaign(repo, id);
  
  if (result.ok && existing.salesPageId) {
    try {
      const salesPageRepo = new FirestoreSalesPageRepository(gateway);
      const page = await salesPageRepo.findById(existing.salesPageId);
      if (page && page.type === 'campaign_pack') {
        console.log(`[CascadeDelete] Borrando pack multimedia ${page.id} asociado a la campaña ${id}`);
        await gateway.deleteDoc('salesPages', existing.salesPageId);
      }
    } catch (e) {
      console.error(`[CascadeDelete] Falló al borrar pack asociado ${existing.salesPageId}`, e);
    }
  }

  return toApiResponse(result);
}

/**
 * POST /api/campaigns/[id]/execute. Disparo manual del día actual.
 * Las credenciales se leen del documento del llamante (no viajan en el body).
 */
import { MetaGraphPublisher } from '@/infrastructure/social/instagram-publisher';

export async function handleExecuteCampaign(
  gateway: FirestoreGateway,
  caller: Caller | null,
  id: string,
  forceDay?: number
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const repo = new FirestoreCampaignRepository(gateway);
  const existing = await repo.findById(id);
  if (!existing) {
    return NextResponse.json({ error: `Campaña ${id} no encontrada` }, { status: 404 });
  }
  if (!canAccessMentorData(caller, existing.mentorId)) return forbidden();
  
  // Extraer los socials históricos desde la SalesPage (si existen)
  let fallbackSocials: any[] = [];
  if (existing.salesPageId) {
    const spDoc = await gateway.getDoc('salesPages', existing.salesPageId);
    fallbackSocials = spDoc?.data()?.aiContent?.socials || [];
  }

  const userSnap = await gateway.getDoc('users', caller.uid);
  const credentials = ((userSnap?.data()?.marketingCredentials ?? {}) as CredentialsMap);
  const publisher = new MetaGraphPublisher();
  return toApiResponse(await executeCampaignStep(repo, { id, credentials, fallbackSocials, forceDay }, publisher));
}
