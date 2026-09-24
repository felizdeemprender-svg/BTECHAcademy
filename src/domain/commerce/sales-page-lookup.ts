/**
 * Comercio — Lectura cruda de sales pages para pagos (F0.2).
 * Los routes legacy leen `salesPages` doc(pageId) en crudo
 * (`mentorId`, `price || 0`, `title || '…'`); este puerto replica
 * esa lectura sin el parse estricto del catálogo para no cambiar
 * el comportamiento ante documentos viejos.
 */

export interface SalesPageSnapshot {
  readonly id: string;
  readonly mentorId?: unknown;
  readonly price?: unknown;
  readonly title?: unknown;
}

export interface SalesPageLookup {
  /** Lee `salesPages` doc(pageId). `null` si no existe. */
  findById(pageId: string): Promise<SalesPageSnapshot | null>;
}
