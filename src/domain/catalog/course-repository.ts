/**
 * Catálogo — Contrato de cursos.
 * Lectura (F2.1) + alta aditiva F1.2 (`api/courses/create`):
 * el autor se lee CRUDO (roles/suscripción) porque los docs `users`
 * viejos no siempre cumplen el schema estricto de `User`.
 */
import type { Course } from './course';

export interface CourseAuthorSubscription {
  readonly status?: unknown;
  readonly endDate?: unknown;
  readonly maxSimultaneousCourses?: number;
}

export interface CourseAuthor {
  readonly isAdmin: boolean;
  readonly subscription?: CourseAuthorSubscription;
}

export interface NewCourseDoc {
  readonly id: string;
  readonly mentorId: string;
  readonly data: Record<string, unknown>;
}

export interface CourseRepository {
  findById(id: string): Promise<Course | null>;
  listByMentor(mentorId: string, limit?: number): Promise<Course[]>;
  /** Lee `users/{mentorId}` crudo para validar suscripción/límite (create). */
  findAuthor(mentorId: string): Promise<CourseAuthor | null>;
  /** Cuenta cursos con `isActive === true` del mentor (create). */
  countActiveCoursesByMentor(mentorId: string): Promise<number>;
  /**
   * F1.3 (aditivo) — Cuenta cursos públicos del mentor
   * (`tutores/[username]/status`): `mentorId ==` + `isActive ==` con
   * memoria status in (published, approved) + publicListing !== false.
   */
  countPublicCoursesByMentor(mentorId: string): Promise<number>;
  /** Escribe `courses/{id}` con `createdAt/updatedAt` (create). */
  createCourse(doc: NewCourseDoc): Promise<void>;
  /** Actualiza un curso existente usando merge (manteniendo compatibilidad legacy). */
  updateCourse(id: string, data: Partial<Course>): Promise<void>;
  /** Realiza una baja lógica (o borrado, según implementación) del curso. */
  deleteCourse(id: string): Promise<void>;
}
