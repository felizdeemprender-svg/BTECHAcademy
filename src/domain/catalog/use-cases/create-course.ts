/**
 * Catálogo — Caso de uso: alta de curso (`api/courses/create`).
 * Réplica exacta del route legacy: validación de campos, lectura cruda
 * del autor (`users/{mentorId}`), bypass admin, suscripción vigente y
 * cupo `maxSimultaneousCourses` contado en memoria. Sin Firebase: las
 * tres dependencias se inyectan (el repo Firestore las implementa).
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import {
  forbidden,
  notFound,
  unavailable,
  validationError,
  type DomainError,
} from '@/domain/shared/errors';
import type { CourseAuthor, NewCourseDoc } from '../course-repository';

const CreateCourseInputSchema = z.object({
  mentorId: z.string().min(1),
  id: z.string().min(1),
  courseData: z.record(z.unknown()).default({}),
});

export type CreateCourseInput = z.infer<typeof CreateCourseInputSchema>;

/** Subconjunto de `CourseRepository` que necesita el alta (nombres idénticos). */
export interface CourseAuthorSource {
  findAuthor(mentorId: string): Promise<CourseAuthor | null>;
}

export interface MentorCourseCounter {
  countActiveCoursesByMentor(mentorId: string): Promise<number>;
}

export interface CourseDocWriter {
  createCourse(doc: NewCourseDoc): Promise<void>;
}

export interface CreateCourseDeps {
  readonly authorSource: CourseAuthorSource;
  readonly counter: MentorCourseCounter;
  readonly writer: CourseDocWriter;
}

export async function createCourse(
  deps: CreateCourseDeps,
  input: unknown,
): Promise<Result<{ id: string }, DomainError>> {
  const parsed = CreateCourseInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(validationError('Missing required fields'));
  }
  const { mentorId, id, courseData } = parsed.data;
  try {
    const author = await deps.authorSource.findAuthor(mentorId);
    if (!author) {
      return err(notFound('User not found'));
    }
    if (!author.isAdmin) {
      const subscription = author.subscription;
      // Igual que el legacy: `new Date(endDate) < new Date()`.
      // Sin endDate el Date inválido nunca es < now (pasa); con null es
      // epoch (no pasa). Se preserva tal cual.
      if (!subscription || new Date(subscription.endDate as string) < new Date()) {
        return err(forbidden('Valid subscription required'));
      }
      const activeCount = await deps.counter.countActiveCoursesByMentor(mentorId);
      const max = subscription.maxSimultaneousCourses;
      if (typeof max === 'number' && activeCount >= max) {
        return err(
          forbidden('Course limit reached', { message: `Limit of ${max} active courses reached.` }),
        );
      }
    }
    await deps.writer.createCourse({ id, mentorId, data: { ...courseData } });
    return ok({ id });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(unavailable(message));
  }
}
