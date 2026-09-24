/**
 * API — Handlers testeables de influencers (F1.3).
 * Rutas PÚBLICAS por contrato legacy: SIN `authenticateCaller`
 * (`influencers/*` nunca exigió token). Firma `(gateway, ...args)`.
 * Los errores del use-case viajan con `{ status, body }` legacy exactos
 * (patrón F0.2 `legacyHttpError`); el 500 lleva `details` como antes.
 */
import { NextResponse } from 'next/server';

import { FirestoreInfluencerRepository } from '@/data/firestore/influencer-repo';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import { listReferrals } from '@/domain/commerce/use-cases/list-referrals';
import { promoteInfluencer } from '@/domain/commerce/use-cases/promote-influencer';
import type { DomainError } from '@/domain/shared/errors';

function legacyError(error: DomainError): { status: number; body: Record<string, unknown> } | null {
  const details = error.details as { status?: unknown; body?: unknown } | undefined;
  if (details && typeof details.status === 'number' && typeof details.body === 'object' && details.body !== null) {
    return { status: details.status, body: details.body as Record<string, unknown> };
  }
  return null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** POST /api/influencers/promote. Body: { mentorUid, targetEmail, searchOnly? }. */
export async function handlePromoteInfluencer(
  gateway: FirestoreGateway,
  body: unknown,
): Promise<NextResponse> {
  try {
    const repo = new FirestoreInfluencerRepository(gateway);
    const result = await promoteInfluencer(repo, body);
    if (!result.ok) {
      const details = legacyError(result.error);
      if (details) return NextResponse.json(details.body, { status: details.status });
      return NextResponse.json({ error: 'Internal server error', details: result.error.message }, { status: 500 });
    }
    return NextResponse.json(result.value);
  } catch (error: unknown) {
    console.error('[API Influencers Promote] Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: errorMessage(error) }, { status: 500 });
  }
}

/** GET /api/influencers/list?mentorUid=xxx. */
export async function handleListInfluencers(
  gateway: FirestoreGateway,
  mentorUid: string | null,
): Promise<NextResponse> {
  try {
    if (!mentorUid) {
      return NextResponse.json({ error: 'mentorUid is required' }, { status: 400 });
    }
    const repo = new FirestoreInfluencerRepository(gateway);
    const result = await listReferrals(repo, { mentorUid });
    if (!result.ok) {
      const details = legacyError(result.error);
      if (details) return NextResponse.json(details.body, { status: details.status });
      return NextResponse.json({ error: 'Internal server error', details: result.error.message }, { status: 500 });
    }
    return NextResponse.json(result.value);
  } catch (error: unknown) {
    console.error('[API Influencers List] Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: errorMessage(error) }, { status: 500 });
  }
}
