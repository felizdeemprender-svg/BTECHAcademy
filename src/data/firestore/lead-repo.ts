/**
 * Capa de datos — Repositorio de lectura de leads (`leads`).
 * Mismo filtro que el código actual (`courseId ==`).
 * En listas, los documentos corruptos se omiten con warn
 * (convivencia con datos viejos).
 */
import type { Lead, LeadRepository } from '@/domain/commerce';

import { mapLeadDoc } from './mappers';
import type { FirestoreGateway } from './gateway';

const COLLECTION = 'leads';

export class FirestoreLeadRepository implements LeadRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findById(id: string): Promise<Lead | null> {
    const snap = await this.gateway.getDoc(COLLECTION, id);
    if (!snap) return null;
    const raw = snap.data();
    if (!raw) return null;
    return mapLeadDoc(snap.id, raw);
  }

  async listByCourse(courseId: string, limit?: number): Promise<Lead[]> {
    const snap = await this.gateway.queryByField(COLLECTION, 'courseId', courseId, limit);
    const out: Lead[] = [];
    for (const d of snap.docs) {
      const raw = d.data();
      if (!raw) continue;
      try {
        out.push(mapLeadDoc(d.id, raw));
      } catch (e) {
        console.warn(`[lead-repo] Documento corrupto omitido: ${d.id}`, e);
      }
    }
    return out;
  }
}
