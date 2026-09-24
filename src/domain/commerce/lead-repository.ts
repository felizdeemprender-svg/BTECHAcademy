/**
 * Comercio — Contrato de lectura de leads.
 * Solo lectura en esta fase (F2.1 cimiento).
 * Mismo filtro que el código actual (`courseId ==`).
 */
import type { Lead } from './lead';

export interface LeadRepository {
  findById(id: string): Promise<Lead | null>;
  listByCourse(courseId: string, limit?: number): Promise<Lead[]>;
}
