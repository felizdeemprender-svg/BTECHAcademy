/**
 * Capa de datos — Repositorio de niveles (`levels`, orden order asc).
 * Documentos corruptos se omiten con warn (convivencia con datos viejos).
 */
import type { Level, LevelRepository } from '@/domain/catalog';

import { mapLevelDoc } from './mappers';
import type { FirestoreGateway } from './gateway';

const COLLECTION = 'levels';

export class FirestoreLevelRepository implements LevelRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async listAll(): Promise<Level[]> {
    const snap = await this.gateway.listDocs(COLLECTION);
    const out: Level[] = [];
    for (const d of snap.docs) {
      const raw = d.data();
      if (!raw) continue;
      try {
        out.push(mapLevelDoc(d.id, raw));
      } catch (e) {
        console.warn(`[level-repo] Documento corrupto omitido: ${d.id}`, e);
      }
    }
    out.sort((a, b) => a.order - b.order);
    return out;
  }
}
