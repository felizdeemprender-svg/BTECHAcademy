/**
 * Capa de datos — Consultas de lectura para marketplace y catálogo de tutor.
 * Mismas colecciones y filtros que los routes legacy (`courses`,
 * `salesPages`, `users`, `tags`, `categories`, `levels`).
 *
 * Compuestos de 3 igualdades + `in` + `>` + `limit`: si el gateway expone
 * los opcionales F1.2 (`queryByFilters`/`getDocsByIds`) se usan directo
 * (mismo query servidor que el legacy); si no, fallback a primitivas +
 * filtro en memoria con IDÉNTICO resultado (mismo conjunto + mismo limit,
 * las lecturas legacy no tienen orderBy así que no hay orden que preservar).
 * `categories`/`levels` se ordenan en memoria tras lectura completa:
 * idéntico a `orderBy` sobre el conjunto total.
 */
import type {
  CatalogDoc,
  MarketplacePriceFilter,
  MarketplaceRepository,
} from '@/domain/catalog';

import type { FirestoreGateway, QueryFilterClause, QuerySnapshotLike } from './gateway';

const COURSES = 'courses';
const SALES_PAGES = 'salesPages';
const USERS = 'users';
const TAGS = 'tags';
const CATEGORIES = 'categories';
const LEVELS = 'levels';

function toCatalogDocs(snap: QuerySnapshotLike): CatalogDoc[] {
  return snap.docs.map((d) => ({ id: d.id, data: (d.data() ?? {}) as Record<string, unknown> }));
}

export class FirestoreMarketplaceRepository implements MarketplaceRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async listMarketplaceCourses(price: MarketplacePriceFilter, limit: number): Promise<CatalogDoc[]> {
    const filters: QueryFilterClause[] = [
      { field: 'isActive', op: '==', value: true },
      { field: 'status', op: '==', value: 'published' },
      { field: 'publicListing', op: '==', value: true },
    ];
    if (price === 'free') filters.push({ field: 'price', op: '==', value: 0 });
    else if (price === 'paid') filters.push({ field: 'price', op: '>', value: 0 });

    if (this.gateway.queryByFilters) {
      return toCatalogDocs(await this.gateway.queryByFilters(COURSES, filters, limit));
    }
    // Fallback: base por isActive + filtro en memoria + limit (mismo resultado).
    const snap = await this.gateway.queryByField(COURSES, 'isActive', true);
    return toCatalogDocs(snap)
      .filter((d) => d.data.status === 'published' && d.data.publicListing === true)
      .filter((d) => {
        if (price === 'free') return (d.data.price as number) === 0;
        if (price === 'paid') return ((d.data.price as number) ?? 0) > 0;
        return true;
      })
      .slice(0, limit);
  }

  async listActiveSalesPages(): Promise<CatalogDoc[]> {
    return toCatalogDocs(await this.gateway.queryByField(SALES_PAGES, 'isActive', true));
  }

  async listSalesPagesByMentorActive(mentorId: string): Promise<CatalogDoc[]> {
    if (this.gateway.queryByTwoFields) {
      return toCatalogDocs(
        await this.gateway.queryByTwoFields(SALES_PAGES, 'mentorId', mentorId, 'isActive', true),
      );
    }
    const snap = await this.gateway.queryByField(SALES_PAGES, 'mentorId', mentorId);
    return toCatalogDocs(snap).filter((d) => d.data.isActive === true);
  }

  async getSalesPageById(id: string): Promise<CatalogDoc | null> {
    const snap = await this.gateway.getDoc(SALES_PAGES, id);
    if (!snap) return null;
    return { id: snap.id, data: (snap.data() ?? {}) as Record<string, unknown> };
  }

  /**
   * F1.3 (aditivo) — `salesPages` con mentorId== + slug== (`api/v/resolve`).
   * Sin `queryByTwoFields`, fallback a mentorId== + filtro en memoria
   * con IDÉNTICO resultado.
   */
  async findSalesPageByMentorAndSlug(mentorId: string, slug: string): Promise<CatalogDoc | null> {
    if (this.gateway.queryByTwoFields) {
      const snap = await this.gateway.queryByTwoFields(SALES_PAGES, 'mentorId', mentorId, 'slug', slug, 1);
      const first = snap.docs[0];
      if (!first) return null;
      return { id: first.id, data: (first.data() ?? {}) as Record<string, unknown> };
    }
    const snap = await this.gateway.queryByField(SALES_PAGES, 'mentorId', mentorId);
    const first = toCatalogDocs(snap).find((d) => d.data.slug === slug);
    return first ?? null;
  }

  /**
   * F1.3 (aditivo) — `salesPages` con slug== limit 1 (fallback de
   * `api/v/resolve` cuando no hay match con el mentor).
   */
  async findSalesPageBySlug(slug: string): Promise<CatalogDoc | null> {
    const snap = await this.gateway.queryByField(SALES_PAGES, 'slug', slug, 1);
    const first = snap.docs[0];
    if (!first) return null;
    return { id: first.id, data: (first.data() ?? {}) as Record<string, unknown> };
  }

  async listCoursesByIds(ids: readonly string[]): Promise<CatalogDoc[]> {
    if (ids.length === 0) return [];
    if (this.gateway.getDocsByIds) {
      return toCatalogDocs(await this.gateway.getDocsByIds(COURSES, ids));
    }
    const snaps = await Promise.all(ids.map((id) => this.gateway.getDoc(COURSES, id)));
    return snaps
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => ({ id: s.id, data: (s.data() ?? {}) as Record<string, unknown> }));
  }

  async listTagsByIds(ids: readonly string[]): Promise<CatalogDoc[]> {
    if (ids.length === 0) return [];
    if (this.gateway.getDocsByIds) {
      return toCatalogDocs(await this.gateway.getDocsByIds(TAGS, ids));
    }
    const snaps = await Promise.all(ids.map((id) => this.gateway.getDoc(TAGS, id)));
    return snaps
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => ({ id: s.id, data: (s.data() ?? {}) as Record<string, unknown> }));
  }

  async findTutorById(id: string): Promise<CatalogDoc | null> {
    const snap = await this.gateway.getDoc(USERS, id);
    if (!snap) return null;
    return { id: snap.id, data: (snap.data() ?? {}) as Record<string, unknown> };
  }

  async listTutorsByIds(ids: readonly string[]): Promise<CatalogDoc[]> {
    if (ids.length === 0) return [];
    if (this.gateway.getDocsByIds) {
      return toCatalogDocs(await this.gateway.getDocsByIds(USERS, ids));
    }
    const snaps = await Promise.all(ids.map((id) => this.gateway.getDoc(USERS, id)));
    return snaps
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => ({ id: s.id, data: (s.data() ?? {}) as Record<string, unknown> }));
  }

  async listActiveCourses(): Promise<CatalogDoc[]> {
    return toCatalogDocs(await this.gateway.queryByField(COURSES, 'isActive', true));
  }

  async listMentors(): Promise<CatalogDoc[]> {
    if (this.gateway.queryArrayContains) {
      return toCatalogDocs(await this.gateway.queryArrayContains(USERS, 'roles', 'mentor'));
    }
    const snap = await this.gateway.listDocs(USERS);
    return toCatalogDocs(snap).filter((d) => {
      const roles = d.data.roles;
      return Array.isArray(roles) && (roles as unknown[]).includes('mentor');
    });
  }

  async listCategoriesRaw(): Promise<CatalogDoc[]> {
    const docs = toCatalogDocs(await this.gateway.listDocs(CATEGORIES));
    docs.sort((a, b) => String(a.data.name ?? '').localeCompare(String(b.data.name ?? '')));
    return docs;
  }

  async listLevelsRaw(): Promise<CatalogDoc[]> {
    const docs = toCatalogDocs(await this.gateway.listDocs(LEVELS));
    // Igual que orderBy('order','asc'): sin order (null) primero, luego numérico.
    docs.sort((a, b) => {
      const ao = typeof a.data.order === 'number' ? a.data.order : null;
      const bo = typeof b.data.order === 'number' ? b.data.order : null;
      if (ao === null && bo === null) return 0;
      if (ao === null) return -1;
      if (bo === null) return 1;
      return ao - bo;
    });
    return docs;
  }
}
