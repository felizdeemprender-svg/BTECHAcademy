/**
 * Identidad — Caso de uso: estado público del tutor (F1.3).
 * Lógica 1:1 con `GET api/tutors/[username]/status` legacy:
 * 404 si no hay tutor, 403 si la suscripción no está activa (bypass admin
 * por roles) o el perfil no es público, conteo de cursos publicados y
 * rama local (`adminPath: false`, igual que el fallback sin
 * service-account: omite el check de suscripción y usa
 * `stats.totalCourses`). El conteo y el style son no-críticos (fallan a
 * 0 / se resuelven en el handler, igual que el legacy).
 * Dominio puro: lee por `TutorRepository` + contador de cursos.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { forbidden, type DomainError } from '@/domain/shared/errors';
import type { CourseRepository } from '../../catalog/course-repository';
import { SubscriptionStatus } from '@/types/subscription';

import type { TutorRepository, TutorSnapshot } from '../tutor-repository';
import { resolveTutorByUsername } from './resolve-tutor-by-username';

export const GetTutorStatusInputSchema = z.object({
  username: z.string().min(1, 'username vacío'),
  /**
   * `true` = rama Admin/producción (enforce suscripción + conteo por
   * query). `false` = rama local sin service-account (sin enforce +
   * `stats.totalCourses`). Por defecto, Admin.
   */
  adminPath: z.boolean().default(true),
});
export type GetTutorStatusInput = z.infer<typeof GetTutorStatusInputSchema>;

export interface TutorStatusData {
  readonly tutorId: string;
  readonly tutor: TutorSnapshot;
  readonly coursesCount: number;
}

export type CourseCounter = Pick<CourseRepository, 'countPublicCoursesByMentor'>;

function rolesOf(data: Record<string, unknown>): unknown[] {
  return Array.isArray(data.roles) ? (data.roles as unknown[]) : [];
}

function subscriptionOf(data: Record<string, unknown>): Record<string, unknown> {
  return typeof data.subscription === 'object' && data.subscription !== null
    ? (data.subscription as Record<string, unknown>)
    : {};
}

export async function getTutorStatus(
  tutors: TutorRepository,
  courses: CourseCounter,
  rawInput: unknown,
): Promise<Result<TutorStatusData, DomainError>> {
  const parsed = GetTutorStatusInputSchema.safeParse(rawInput);
  if (parsed.success === false) {
    // El legacy consultaría con username vacío → snapshot vacío → 404.
    // Reusamos el resolvedor para unificar el mapeo en el handler.
    const fallback = await resolveTutorByUsername(tutors, { username: '' });
    return fallback.ok
      ? err(forbidden('username inválido'))
      : (fallback as unknown as Result<TutorStatusData, DomainError>);
  }
  const { username, adminPath } = parsed.data;

  const resolved = await resolveTutorByUsername(tutors, { username });
  if (!resolved.ok) return resolved as unknown as Result<TutorStatusData, DomainError>;
  const { tutorId, tutor } = resolved.value;
  const data = tutor.data;

  const isAdmin = rolesOf(data).includes('admin');
  if (adminPath && !isAdmin) {
    const status = subscriptionOf(data).status;
    if (status !== SubscriptionStatus.ACTIVE && status !== 'active') {
      return err(
        forbidden('Tutor subscription is not active', { reason: 'subscription_inactive' }),
      );
    }
  }

  const publicProfile = (data.profile as { publicProfile?: { enabled?: unknown } } | undefined)
    ?.publicProfile;
  if (publicProfile?.enabled === false) {
    return err(forbidden('Tutor profile is not public', { reason: 'profile_private' }));
  }

  let coursesCount: number;
  if (adminPath) {
    try {
      coursesCount = await courses.countPublicCoursesByMentor(tutorId);
    } catch {
      coursesCount = 0; // no-crítico, igual que el legacy
    }
  } else {
    const stats = (data.stats ?? {}) as { totalCourses?: unknown };
    coursesCount = typeof stats.totalCourses === 'number' ? stats.totalCourses : 0;
  }

  return ok({ tutorId, tutor, coursesCount });
}
