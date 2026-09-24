/**
 * Catálogo — Contrato de lectura de sales pages.
 * Solo lectura en esta fase.
 */
import type { SalesPage } from './sales-page';

export interface SalesPageRepository {
  findById(id: string): Promise<SalesPage | null>;
  listByMentor(mentorId: string, limit?: number): Promise<SalesPage[]>;
}
