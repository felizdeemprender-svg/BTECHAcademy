/**
 * Capa de datos — Repositorio de categorías (`categories`, orden name asc).
 * Documentos corruptos se omiten con warn (convivencia con datos viejos).
 */
import type { Category, CategoryRepository } from '@/domain/catalog';

import { mapCategoryDoc } from './mappers';
import type { FirestoreGateway } from './gateway';

const COLLECTION = 'categories';

export class FirestoreCategoryRepository implements CategoryRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async listAll(): Promise<Category[]> {
    const snap = await this.gateway.listDocs(COLLECTION);
    const out: Category[] = [];
    for (const d of snap.docs) {
      const raw = d.data();
      if (!raw) continue;
      try {
        out.push(mapCategoryDoc(d.id, raw));
      } catch (e) {
        console.warn(`[category-repo] Documento corrupto omitido: ${d.id}`, e);
      }
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }
}
