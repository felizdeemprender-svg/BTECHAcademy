/**
 * Catálogo — Escritura de tracking de clicks (F1.3).
 * Solo lo que `api/track` legacy hace: `salesPages/{pageId}` set con merge
 * (`stats.totalClicks` + breakdowns por canal/fuente con increment(1) +
 * `lastActivity` con serverTimestamp).
 * Dominio puro: sin firebase, sin next.
 */

export interface TrackEventInput {
  readonly pageId: string;
  readonly channel: string;
  readonly source: string;
}

export interface TrackEventRepository {
  /** Registra un click (merge, nunca crea ni borra nada más). */
  recordPageClick(input: TrackEventInput): Promise<void>;
}
