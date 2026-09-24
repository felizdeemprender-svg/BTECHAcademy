/**
 * Catálogo — Caso de uso: registrar click de tracking (F1.3).
 * Lógica 1:1 con `GET api/track` legacy: 400 sin pageId y defaults
 * v=0/source/channel=unknown. La escritura (merge + increment +
 * serverTimestamp) vive en `TrackEventRepository`. El redirect lo arma
 * el handler (respuesta 307, no JSON). Dominio puro.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import type { DomainError } from '@/domain/shared/errors';
import { legacyHttpError } from '@/domain/commerce/use-cases/legacy-response';

import type { TrackEventRepository } from '../track-event-repository';

export const RecordTrackEventInputSchema = z.object({
  pageId: z.string().optional(),
  variant: z.string().default('0'),
  source: z.string().default('unknown'),
  channel: z.string().default('unknown'),
});
export type RecordTrackEventInput = z.infer<typeof RecordTrackEventInputSchema>;

export interface RecordedTrackEvent {
  readonly pageId: string;
  readonly variant: string;
  readonly source: string;
  readonly channel: string;
}

export async function recordTrackEvent(
  writer: TrackEventRepository,
  rawInput: unknown,
): Promise<Result<RecordedTrackEvent, DomainError>> {
  const parsed = RecordTrackEventInputSchema.safeParse(rawInput);
  const pageId = parsed.success ? (parsed.data.pageId ?? '') : '';
  if (!pageId) {
    return err(legacyHttpError(400, { error: 'Missing pageId' }));
  }
  const variant = parsed.success ? parsed.data.variant : '0';
  const source = parsed.success ? parsed.data.source : 'unknown';
  const channel = parsed.success ? parsed.data.channel : 'unknown';
  await writer.recordPageClick({ pageId, channel, source });
  return ok({ pageId, variant, source, channel });
}
