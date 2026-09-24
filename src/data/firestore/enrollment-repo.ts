/**
 * Capa de datos — Repositorio de lectura de inscripciones (`enrollments`).
 * Mismo filtro que el código actual (`courseId ==`; `courseId` se
 * retiene por compatibilidad y equivale a `productId`).
 * En listas, los documentos corruptos se omiten con warn
 * (convivencia con datos viejos).
 */
import type { Enrollment, EnrollmentRepository } from '@/domain/commerce';

import { mapEnrollmentDoc } from './mappers';
import type { FirestoreGateway } from './gateway';

const COLLECTION = 'enrollments';

export class FirestoreEnrollmentRepository implements EnrollmentRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findById(id: string): Promise<Enrollment | null> {
    const snap = await this.gateway.getDoc(COLLECTION, id);
    if (!snap) return null;
    const raw = snap.data();
    if (!raw) return null;
    return mapEnrollmentDoc(snap.id, raw);
  }

  async listByCourse(courseId: string, limit?: number): Promise<Enrollment[]> {
    const snap = await this.gateway.queryByField(COLLECTION, 'courseId', courseId, limit);
    const out: Enrollment[] = [];
    for (const d of snap.docs) {
      const raw = d.data();
      if (!raw) continue;
      try {
        out.push(mapEnrollmentDoc(d.id, raw));
      } catch (e) {
        console.warn(`[enrollment-repo] Documento corrupto omitido: ${d.id}`, e);
      }
    }
    return out;
  }
}
