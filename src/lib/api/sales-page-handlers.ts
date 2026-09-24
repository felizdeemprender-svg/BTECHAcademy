/**
 * API — Handlers testeables de sales pages y publicación de campañas.
 */
import { NextResponse } from 'next/server';

import { listCampaignPacks } from '@/domain/marketing/use-cases/list-campaign-packs';
import { generateCoordinationPlan } from '@/domain/marketing/use-cases/generate-plan';
import { createCampaign } from '@/domain/marketing/use-cases/create-campaign';
import type { CoordinationPlanner } from '@/domain/marketing';
import { FirestoreSalesPageRepository } from '@/data/firestore/sales-page-repo';
import { FirestoreCampaignRepository } from '@/data/firestore/campaign-repo';
import type { FirestoreGateway } from '@/data/firestore/gateway';

import { FirestoreTutorRepository } from '@/data/firestore/tutor-repo';
import { FirestoreMarketplaceRepository } from '@/data/firestore/marketplace-repo';
import { resolveSalesPage } from '@/domain/catalog/use-cases/resolve-sales-page';

import { canAccessMentorData, type Caller } from './mentor-auth';
import { forbidden, toApiResponse, unauthorized } from './results';

export async function handleListPacks(
  gateway: FirestoreGateway,
  caller: Caller | null,
  mentorId: string,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  if (!mentorId || !canAccessMentorData(caller, mentorId)) return forbidden();
  const repo = new FirestoreSalesPageRepository(gateway);
  return toApiResponse(await listCampaignPacks(repo, { mentorId }));
}

export async function handleGeneratePlan(
  planner: CoordinationPlanner,
  caller: Caller | null,
  body: unknown,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  return toApiResponse(await generateCoordinationPlan(planner, body));
}

export async function handleCreateCampaign(
  gateway: FirestoreGateway,
  caller: Caller | null,
  body: unknown,
): Promise<NextResponse> {
  if (!caller) return unauthorized();
  const payload = (body ?? {}) as {
    mentorId?: string;
    salesPageId?: string;
    [key: string]: unknown;
  };
  if (!payload.mentorId || !canAccessMentorData(caller, payload.mentorId)) {
    return forbidden();
  }
  // La página debe pertenecer al mentor (salvo admin).
  if (!caller.isAdmin && payload.salesPageId) {
    const pages = new FirestoreSalesPageRepository(gateway);
    const page = await pages.findById(payload.salesPageId);
    if (!page || page.mentorId !== caller.uid) return forbidden();
  }
  const repo = new FirestoreCampaignRepository(gateway);
  return toApiResponse(await createCampaign(repo, body));
}
/**
 * GET /api/v/resolve?u={username}&s={slug}.
 * Ruta PUBLICA (sin auth, igual que antes). L├│gica en el use-case
 * `resolveSalesPage`: match por mentor+slug y fallback solo-slug.
 * Respuesta legacy exacta: `{ id }` sin envelope (patr├│n F1.2/F1.3).
 */
export async function handleResolveSalesPage(
  gateway: FirestoreGateway,
  input: { username: string | null; slug: string | null },
): Promise<NextResponse> {
  try {
    const tutors = new FirestoreTutorRepository(gateway);
    const pages = new FirestoreMarketplaceRepository(gateway);
    const result = await resolveSalesPage(tutors, pages, input);
    if (!result.ok) {
      const details = result.error.details as { status?: number; body?: Record<string, unknown> } | undefined;
      if (details && typeof details.status === 'number' && details.body) {
        return NextResponse.json(details.body, { status: details.status });
      }
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    return NextResponse.json(result.value);
  } catch (error: unknown) {
    console.error('[API Resolve] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


