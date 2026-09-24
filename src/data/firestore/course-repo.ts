/**
 * Capa de datos — Repositorio de lectura de cursos (`courses`).
 * Mismos filtros que el código actual (`mentorId ==`).
 * En listas, los documentos corruptos se omiten con warn
 * (convivencia con datos viejos).
 */
import type {
  Course,
  CourseAuthor,
  CourseRepository,
  NewCourseDoc,
} from '@/domain/catalog';

import { mapCourseDoc } from './mappers';
import type { FirestoreGateway } from './gateway';

const COLLECTION = 'courses';

export class FirestoreCourseRepository implements CourseRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findById(id: string): Promise<Course | null> {
    const snap = await this.gateway.getDoc(COLLECTION, id);
    if (!snap) return null;
    const raw = snap.data();
    if (!raw) return null;
    return mapCourseDoc(snap.id, raw);
  }

  async listByMentor(mentorId: string, limit?: number): Promise<Course[]> {
    const snap = await this.gateway.queryByField(COLLECTION, 'mentorId', mentorId, limit);
    const out: Course[] = [];
    for (const d of snap.docs) {
      const raw = d.data();
      if (!raw) continue;
      try {
        out.push(mapCourseDoc(d.id, raw));
      } catch (e) {
        console.warn(`[course-repo] Documento corrupto omitido: ${d.id}`, e);
      }
    }
    return out;
  }

  /**
   * F1.2 — Lee `users/{mentorId}` CRUDO (roles + subscription tal cual
   * están guardados, igual que `api/courses/create`). Sin parse estricto:
   * los docs viejos no siempre cumplen el schema de `User`.
   */
  async findAuthor(mentorId: string): Promise<CourseAuthor | null> {
    const snap = await this.gateway.getDoc('users', mentorId);
    if (!snap) return null;
    const raw = snap.data();
    if (!raw) return null;
    const roles = Array.isArray(raw.roles) ? (raw.roles as unknown[]) : [];
    const subscription =
      typeof raw.subscription === 'object' && raw.subscription !== null
        ? (raw.subscription as Record<string, unknown>)
        : undefined;
    return {
      isAdmin: roles.includes('admin'),
      subscription: subscription
        ? {
            status: subscription.status,
            endDate: subscription.endDate,
            maxSimultaneousCourses:
              typeof subscription.maxSimultaneousCourses === 'number'
                ? subscription.maxSimultaneousCourses
                : undefined,
          }
        : undefined,
    };
  }

  /**
   * F1.2 — Cuenta cursos del mentor con `isActive === true` en memoria
   * (igual que el legacy: evita problemas de índices compuestos).
   */
  async countActiveCoursesByMentor(mentorId: string): Promise<number> {
    const snap = await this.gateway.queryByField(COLLECTION, 'mentorId', mentorId);
    return snap.docs.filter((d) => d.data()?.isActive === true).length;
  }

  /**
   * F1.3 (aditivo) — Cuenta cursos públicos del mentor
   * (`tutores/[username]/status`): `mentorId ==` + `isActive ==` en
   * servidor (con fallback a primitivas) y en memoria
   * status in (published, approved) + publicListing !== false.
   */
  async countPublicCoursesByMentor(mentorId: string): Promise<number> {
    const snap = this.gateway.queryByTwoFields
      ? await this.gateway.queryByTwoFields(COLLECTION, 'mentorId', mentorId, 'isActive', true)
      : await this.gateway.queryByField(COLLECTION, 'mentorId', mentorId);
    return snap.docs.filter((d) => {
      const raw = d.data();
      if (!raw) return false;
      if (!this.gateway.queryByTwoFields && raw.isActive !== true) return false;
      const status = raw.status as string | undefined;
      if (status !== 'published' && status !== 'approved') return false;
      return raw.publicListing !== false;
    }).length;
  }

  /**
   * F1.2 — Escribe `courses/{id}` con `{...data, id, mentorId}` +
   * `createdAt/updatedAt` serverTimestamp (igual que el legacy).
   */
  async createCourse(doc: NewCourseDoc): Promise<void> {
    await this.gateway.createDoc(COLLECTION, doc.id, {
      ...doc.data,
      id: doc.id,
      mentorId: doc.mentorId,
      createdAt: this.gateway.serverTimestamp(),
      updatedAt: this.gateway.serverTimestamp(),
    });
  }

  async updateCourse(id: string, data: Partial<Course>): Promise<void> {
    if (!this.gateway.mergeDoc) {
      throw new Error('[course-repo] mergeDoc is not implemented on the gateway');
    }
    await this.gateway.mergeDoc(COLLECTION, id, {
      ...data,
      updatedAt: this.gateway.serverTimestamp(),
    });
  }

  async deleteCourse(id: string): Promise<void> {
    if (!this.gateway.mergeDoc) {
      throw new Error('[course-repo] mergeDoc is not implemented on the gateway');
    }
    await this.gateway.mergeDoc(COLLECTION, id, {
      isActive: false, // Baja lógica legacy
      updatedAt: this.gateway.serverTimestamp(),
    });
  }
}
