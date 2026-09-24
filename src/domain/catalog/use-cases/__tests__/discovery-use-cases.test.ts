/**
 * F1.3 (TDD rojo) — UCs delgados de discovery (catálogo):
 * `resolveSalesPage` (`api/v/resolve`: mentor por username + landing por
 * mentorId+slug con fallback solo-slug) y `recordTrackEvent` (`api/track`:
 * click con defaults v/source/channel). Misma semántica que el legacy.
 */
import { describe, expect, it } from 'vitest';

import { resolveSalesPage } from '../resolve-sales-page';
import { recordTrackEvent } from '../record-track-event';
import type { TutorRepository } from '../../../identity/tutor-repository';
import type { MarketplaceRepository, CatalogDoc } from '../../marketplace-repository';
import type { TrackEventRepository, TrackEventInput } from '../../track-event-repository';

function stubTutors() {
  const repo: Pick<TutorRepository, 'findTutorByUsername'> = {
    findTutorByUsername: async (username: string) =>
      username === 'ana' ? { id: 'tutor-1', data: { username: 'ana' } } : null,
  };
  return repo;
}

function stubPages(): Pick<
  MarketplaceRepository,
  'findSalesPageByMentorAndSlug' | 'findSalesPageBySlug'
> {
  const byMentor = async (mentorId: string, slug: string): Promise<CatalogDoc | null> => {
    if (mentorId === 'tutor-1' && slug === 'curso') return { id: 'page-1', data: {} };
    return null;
  };
  const bySlug = async (slug: string): Promise<CatalogDoc | null> => {
    if (slug === 'suelto') return { id: 'page-9', data: {} };
    return null;
  };
  return { findSalesPageByMentorAndSlug: byMentor, findSalesPageBySlug: bySlug };
}

function legacyBody(result: { ok: false; error: { details?: unknown } }): { status: number; body: Record<string, unknown> } {
  return result.error.details as { status: number; body: Record<string, unknown> };
}

describe('resolveSalesPage', () => {
  it('resuelve por mentor + slug', async () => {
    const result = await resolveSalesPage(stubTutors(), stubPages(), { username: 'ana', slug: 'curso' });
    expect(result).toEqual({ ok: true, value: { id: 'page-1' } });
  });

  it('fallback solo-slug cuando no hay match con el mentor', async () => {
    const result = await resolveSalesPage(stubTutors(), stubPages(), { username: 'ana', slug: 'suelto' });
    expect(result).toEqual({ ok: true, value: { id: 'page-9' } });
  });

  it('sin parámetros → 400 Missing parameters', async () => {
    const result = await resolveSalesPage(stubTutors(), stubPages(), { username: '', slug: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(legacyBody(result)).toEqual({ status: 400, body: { error: 'Missing parameters' } });
  });

  it('tutor inexistente → 404 Tutor not found', async () => {
    const result = await resolveSalesPage(stubTutors(), stubPages(), { username: 'nadie', slug: 'curso' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(legacyBody(result)).toEqual({ status: 404, body: { error: 'Tutor not found' } });
  });

  it('página inexistente → 404 Page not found', async () => {
    const result = await resolveSalesPage(stubTutors(), stubPages(), { username: 'ana', slug: 'nada' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(legacyBody(result)).toEqual({ status: 404, body: { error: 'Page not found' } });
  });
});

describe('recordTrackEvent', () => {
  function stubWriter() {
    const recorded: TrackEventInput[] = [];
    const writer: TrackEventRepository = {
      recordPageClick: async (input: TrackEventInput) => {
        recorded.push(input);
      },
    };
    return { writer, recorded };
  }

  it('registra con defaults v=0/source/channel=unknown', async () => {
    const { writer, recorded } = stubWriter();
    const result = await recordTrackEvent(writer, { pageId: 'page-1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ pageId: 'page-1', variant: '0', source: 'unknown', channel: 'unknown' });
    expect(recorded).toEqual([{ pageId: 'page-1', channel: 'unknown', source: 'unknown' }]);
  });

  it('respeta valores provistos', async () => {
    const { writer, recorded } = stubWriter();
    const result = await recordTrackEvent(writer, { pageId: 'page-1', variant: '2', source: 'bio', channel: 'wa' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(recorded).toEqual([{ pageId: 'page-1', channel: 'wa', source: 'bio' }]);
  });

  it('sin pageId → 400 Missing pageId', async () => {
    const { writer, recorded } = stubWriter();
    const result = await recordTrackEvent(writer, { pageId: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(legacyBody(result)).toEqual({ status: 400, body: { error: 'Missing pageId' } });
    expect(recorded).toEqual([]);
  });
});
