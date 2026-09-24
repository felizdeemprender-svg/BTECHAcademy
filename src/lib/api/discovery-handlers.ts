/**
 * API — Handlers testeables de discovery: v/resolve + track (F1.3).
 * Rutas PÚBLICAS por contrato legacy: SIN `authenticateCaller` (las
 * consumen landings/páginas públicas). `track` responde 307 redirect,
 * nunca JSON (salvo 400 sin pageId); si el tracking falla igual
 * redirige al fallback, igual que el legacy.
 */
import { NextResponse } from 'next/server';

import { FirestoreMarketplaceRepository } from '@/data/firestore/marketplace-repo';
import { FirestoreTrackEventRepository } from '@/data/firestore/track-repo';
import { FirestoreTutorRepository } from '@/data/firestore/tutor-repo';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import { resolveSalesPage } from '@/domain/catalog/use-cases/resolve-sales-page';
import { recordTrackEvent } from '@/domain/catalog/use-cases/record-track-event';
import type { DomainError } from '@/domain/shared/errors';

function legacyError(error: DomainError): { status: number; body: Record<string, unknown> } | null {
  const details = error.details as { status?: unknown; body?: unknown } | undefined;
  if (details && typeof details.status === 'number' && typeof details.body === 'object' && details.body !== null) {
    return { status: details.status, body: details.body as Record<string, unknown> };
  }
  return null;
}

/** GET /api/v/resolve?u=<username>&s=<slug>. */
export async function handleResolveSalesPage(
  gateway: FirestoreGateway,
  username: string | null,
  slug: string | null,
): Promise<NextResponse> {
  try {
    const tutors = new FirestoreTutorRepository(gateway);
    const pages = new FirestoreMarketplaceRepository(gateway);
    const result = await resolveSalesPage(tutors, pages, { username, slug });
    if (!result.ok) {
      const details = legacyError(result.error);
      if (details) return NextResponse.json(details.body, { status: details.status });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    return NextResponse.json({ id: result.value.id });
  } catch (error: unknown) {
    console.error('[API Resolve] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** GET /api/track?pageId=..&v=..&source=..&channel=... */
export async function handleTrackEvent(gateway: FirestoreGateway, url: string): Promise<NextResponse> {
  const { searchParams } = new URL(url);
  const pageId = searchParams.get('pageId');
  const variant = searchParams.get('v') || '0';
  const source = searchParams.get('source') || 'unknown';
  const channel = searchParams.get('channel') || 'unknown';

  if (!pageId) {
    return NextResponse.json({ error: 'Missing pageId' }, { status: 400 });
  }

  try {
    const writer = new FirestoreTrackEventRepository(gateway);
    const result = await recordTrackEvent(writer, { pageId, variant, source, channel });
    if (!result.ok) {
      const details = legacyError(result.error);
      if (details) return NextResponse.json(details.body, { status: details.status });
      return NextResponse.json({ error: 'Missing pageId' }, { status: 400 });
    }
    // URL de landing con UTMs para tracking interno (igual que el legacy).
    const landingUrl = new URL(`/v/${pageId}`, url);
    landingUrl.searchParams.set('v', result.value.variant);
    landingUrl.searchParams.set('s', result.value.source);
    landingUrl.searchParams.set('c', result.value.channel);
    return NextResponse.redirect(landingUrl.toString());
  } catch (error: unknown) {
    console.error('[API: Track] Error:', error);
    // Aunque falle el tracking, no se bloquea la landing (igual que antes).
    return NextResponse.redirect(new URL(`/v/${pageId}?v=${variant}`, url).toString());
  }
}
