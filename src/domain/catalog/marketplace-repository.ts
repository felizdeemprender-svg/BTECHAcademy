/**
 * Catálogo — Contrato de consultas de lectura para marketplace y catálogo
 * de tutor (colecciones `courses`, `salesPages`, `users`, `tags`,
 * `categories`, `levels`). Los documentos viajan CRUDOS (`CatalogDoc`):
 * los routes legacy toleran campos faltantes con defaults en la
 * presentación, así que el contrato NO hace parse estricto (un zod
 * estricto dropearía cursos válidos que el legacy sí muestra).
 * Dominio puro: sin firebase, sin next.
 */

export interface CatalogDoc {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

export type MarketplacePriceFilter = 'all' | 'free' | 'paid';

export interface MarketplaceRepository {
  /**
   * Base de `courses/marketplace`: isActive==true + status==published +
   * publicListing==true (+ price==0 / price>0), con limit aplicado
   * ANTES del enriquecimiento (igual que el legacy).
   */
  listMarketplaceCourses(price: MarketplacePriceFilter, limit: number): Promise<CatalogDoc[]>;
  /** `salesPages` con isActive==true (ambos marketplaces). */
  listActiveSalesPages(): Promise<CatalogDoc[]>;
  /** `salesPages` de un tutor con isActive==true (catálogo de tutor). */
  listSalesPagesByMentorActive(mentorId: string): Promise<CatalogDoc[]>;
  /** `salesPages` por id (free-enrollment). */
  getSalesPageById(id: string): Promise<CatalogDoc | null>;
  /** `courses` por ids (límite 30 de Firestore lo aplica el llamante). */
  listCoursesByIds(ids: readonly string[]): Promise<CatalogDoc[]>;
  /** `tags` por ids (nombres para el enriquecimiento). */
  listTagsByIds(ids: readonly string[]): Promise<CatalogDoc[]>;
  /** `users` por id (ficha de tutor). */
  findTutorById(id: string): Promise<CatalogDoc | null>;
  /** `users` por ids (límite 30 de Firestore lo aplica el llamante). */
  listTutorsByIds(ids: readonly string[]): Promise<CatalogDoc[]>;
  /** `courses` con isActive==true (`api/marketplace`, sin limit). */
  listActiveCourses(): Promise<CatalogDoc[]>;
  /** `users` con roles array-contains mentor (`api/marketplace`). */
  listMentors(): Promise<CatalogDoc[]>;
  /** `categories` crudas ordenadas por name asc (`api/marketplace`). */
  listCategoriesRaw(): Promise<CatalogDoc[]>;
  /** `levels` crudos ordenados por order asc (`api/marketplace`). */
  listLevelsRaw(): Promise<CatalogDoc[]>;
  /**
   * F1.3 (aditivo) — `salesPages` con mentorId== + slug== (`api/v/resolve`).
   * `null` si no hay match.
   */
  findSalesPageByMentorAndSlug(mentorId: string, slug: string): Promise<CatalogDoc | null>;
  /**
   * F1.3 (aditivo) — `salesPages` con slug== (fallback de `api/v/resolve`
   * cuando no hay match con el mentor). `null` si no hay match.
   */
  findSalesPageBySlug(slug: string): Promise<CatalogDoc | null>;
}
