/**
 * Paso 0 — Patrón de repositorios global.
 * Solo interfaces: las implementaciones futuras (Firestore u otras)
 * vivirán en `src/data/*` sin cambiar estas firmas.
 */

export interface PaginationParams {
  readonly limit?: number;
  readonly cursor?: string | null;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

export interface ReadRepository<T, Id> {
  findById(id: Id): Promise<T | null>;
}

export interface WriteRepository<T> {
  save(entity: T): Promise<void>;
}

export interface Repository<T, Id> extends ReadRepository<T, Id>, WriteRepository<T> {}
