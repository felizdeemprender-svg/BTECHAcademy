/**
 * API - Handlers testeables de tracking de clicks (F1.3).
 * L├│gica en el use-case `recordTrackEvent`; este handler arma la respuesta
 * exacta del legacy `api/track`: 400 sin pageId, redirect 307 con UTMs
 * (`/v/{pageId}?v=..&s=..&c=..`) y redirect de respaldo si la escritura
 * falla (no bloquear la landing, igual que el legacy).
 */
import { NextResponse } from 'next/server';
import { FirestoreTrackEventRepository } from '@/data/firestore/track-repo';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import { recordTrackEvent } from '@/domain/catalog/use-cases/record-track-event';
export async function handleRecordTrackEvent(
  gateway: FirestoreGateway,
  request: Request,
  input: { pageId: string | null; variant: string | null; source: string | null; channel: string | null },
): Promise<NextResponse> {
  try {
    const writer = new FirestoreTrackEventRepository(gateway);
    const result = await recordTrackEvent(writer, {
      pageId: input.pageId ?? undefined,
      variant: input.variant ?? undefined,
      source: input.source ?? undefined,
      channel: input.channel ?? undefined,
    });
    if (!result.ok) {
      const details = result.error.details as { status?: number; body?: Record<string, unknown> } | undefined;
      if (details && typeof details.status === 'number' && details.body) {
        return NextResponse.json(details.body, { status: details.status });
      }
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    const { pageId, variant, source, channel } = result.value;
    const landingUrl = new URL(`/v/${pageId}`, request.url);
    landingUrl.searchParams.set('v', variant);
    landingUrl.searchParams.set('s', source);
    landingUrl.searchParams.set('c', channel);
    return NextResponse.redirect(landingUrl.toString());
  } catch (error: unknown) {
    console.error('[API: Track] Error:', error);
    const pageId = input.pageId ?? '';
    const variant = input.variant ?? '0';
    return NextResponse.redirect(new URL(`/v/${pageId}?v=${variant}`, request.url).toString());
  }
}
