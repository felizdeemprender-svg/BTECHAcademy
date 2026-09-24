/**
 * Capa de datos — Lectura cruda de sales pages para pagos (F0.2).
 * Passthrough `mentorId`/`price`/`title` igual que los routes legacy
 * (sin parse estricto del catálogo: convivencia con datos viejos).
 */
import type { SalesPageLookup, SalesPageSnapshot } from '@/domain/commerce/sales-page-lookup';

import type { FirestoreGateway } from './gateway';

const COLLECTION = 'salesPages';

export class FirestoreSalesPageLookup implements SalesPageLookup {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findById(pageId: string): Promise<SalesPageSnapshot | null> {
    const snap = await this.gateway.getDoc(COLLECTION, pageId);
    if (!snap) return null;
    const raw = snap.data() ?? {};
    return { id: snap.id, mentorId: raw.mentorId, price: raw.price, title: raw.title };
  }
}
