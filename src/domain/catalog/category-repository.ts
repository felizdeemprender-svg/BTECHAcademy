/**
 * Catálogo — Contrato de lectura de categorías.
 * Colección `categories`, ordenada por `name` asc (igual que api/marketplace).
 */
import type { Category } from './category';

export interface CategoryRepository {
  listAll(): Promise<Category[]>;
}
