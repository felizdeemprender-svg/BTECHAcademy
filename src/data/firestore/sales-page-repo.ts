/**
 * Capa de datos — Repositorio de lectura de sales pages (`salesPages`).
 * Mismos filtros que las páginas actuales (`mentorId ==`).
 * En listas, los documentos corruptos se omiten con warn
 * (convivencia con datos viejos).
 */
import type { SalesPage, SalesPageRepository } from '@/domain/catalog';

import { mapSalesPageDoc } from './mappers';
import type { FirestoreGateway } from './gateway';

const COLLECTION = 'salesPages';

export class FirestoreSalesPageRepository implements SalesPageRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findById(id: string): Promise<SalesPage | null> {
    const snap = await this.gateway.getDoc(COLLECTION, id);
    if (!snap) return null;
    const raw = snap.data();
    if (!raw) return null;
    return mapSalesPageDoc(snap.id, raw);
  }

  async listByMentor(mentorId: string, limit?: number): Promise<SalesPage[]> {
    const snap = await this.gateway.queryByField(COLLECTION, 'mentorId', mentorId, limit);
    const out: SalesPage[] = [];
    for (const d of snap.docs) {
      const raw = d.data();
      if (!raw) continue;
      try {
        out.push(mapSalesPageDoc(d.id, raw));
      } catch (e) {
        console.warn(`[sales-page-repo] Documento corrupto omitido: ${d.id}`, e);
      }
    }
    return out;
  }
}
