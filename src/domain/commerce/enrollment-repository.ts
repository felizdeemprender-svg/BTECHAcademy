/**
 * Comercio — Contrato de lectura de inscripciones.
 * Solo lectura en esta fase (F2.1 cimiento).
 * Mismo filtro que el código actual (`courseId ==`;
 * `courseId` se retiene por compatibilidad y equivale a `productId`).
 */
import type { Enrollment } from './enrollment';

export interface EnrollmentRepository {
  findById(id: string): Promise<Enrollment | null>;
  listByCourse(courseId: string, limit?: number): Promise<Enrollment[]>;
}
