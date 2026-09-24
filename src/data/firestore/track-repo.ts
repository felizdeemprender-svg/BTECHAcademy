/**
 * Capa de datos — Escritura de tracking de clicks (F1.3).
 * Idéntica escritura que `api/track` legacy: `salesPages/{pageId}` set con
 * merge de `stats` (`totalClicks` + breakdowns por canal/fuente con
 * increment(1) + `lastActivity` con serverTimestamp). Sin gateway con los
 * opcionales, fallback read-modify-write con el mismo valor final.
 */
import type { TrackEventInput, TrackEventRepository } from '@/domain/catalog/track-event-repository';

import type { FirestoreGateway } from './gateway';

const SALES_PAGES = 'salesPages';

export class FirestoreTrackEventRepository implements TrackEventRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async recordPageClick(input: TrackEventInput): Promise<void> {
    const { pageId, channel, source } = input;
    if (this.gateway.mergeDoc && this.gateway.increment) {
      const inc = this.gateway.increment(1);
      await this.gateway.mergeDoc(SALES_PAGES, pageId, {
        stats: {
          totalClicks: inc,
          channelBreakdown: {
            [channel]: { clicks: this.gateway.increment(1) },
          },
          sourceBreakdown: {
            [source]: { clicks: this.gateway.increment(1) },
          },
          lastActivity: this.gateway.serverTimestamp(),
        },
      });
      return;
    }
    // Fallback: lee stats actuales y suma +1 con updateDoc.
    const snap = await this.gateway.getDoc(SALES_PAGES, pageId);
    const raw = (snap?.data() ?? {}) as Record<string, unknown>;
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    const channelBreakdown = (stats.channelBreakdown ?? {}) as Record<string, unknown>;
    const sourceBreakdown = (stats.sourceBreakdown ?? {}) as Record<string, unknown>;
    const channelClicks = ((channelBreakdown[channel] ?? {}) as Record<string, unknown>).clicks;
    const sourceClicks = ((sourceBreakdown[source] ?? {}) as Record<string, unknown>).clicks;
    await this.gateway.updateDoc(SALES_PAGES, pageId, {
      'stats.totalClicks': (typeof stats.totalClicks === 'number' ? stats.totalClicks : 0) + 1,
      [`stats.channelBreakdown.${channel}.clicks`]:
        (typeof channelClicks === 'number' ? channelClicks : 0) + 1,
      [`stats.sourceBreakdown.${source}.clicks`]:
        (typeof sourceClicks === 'number' ? sourceClicks : 0) + 1,
      'stats.lastActivity': this.gateway.serverTimestamp(),
    });
  }
}
