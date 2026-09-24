/**
 * Catálogo — Contrato de lectura de niveles.
 * Colección `levels`, ordenada por `order` asc (igual que api/marketplace).
 */
import type { Level } from './level';

export interface LevelRepository {
  listAll(): Promise<Level[]>;
}
