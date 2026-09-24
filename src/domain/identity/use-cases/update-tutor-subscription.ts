/**
 * Identidad — Caso de uso: actualizar la suscripción de un tutor (F0.3).
 * Lógica 1:1 con `PUT api/admin/tutors/[tutorId]/subscription` legacy:
 * 404 si no existe, validaciones con `{error, field}` exactos, fechas
 * `startDate`/`endDate` solo al activar sin fecha previa, `updatedBy`
 * admin, y relectura (500 legacy si no se puede recuperar).
 * Dominio puro: la escritura con centinelas la arma el repo.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import {
  notFound,
  unavailable,
  validationError,
  type DomainError,
} from '@/domain/shared/errors';

import type { TutorDirectorySource } from './list-tutor-subscriptions';

export const UpdateTutorSubscriptionInputSchema = z.object({
  tutorId: z.string().min(1, 'tutorId vacío'),
  data: z.unknown(),
});
export type UpdateTutorSubscriptionInput = z.infer<typeof UpdateTutorSubscriptionInputSchema>;

export interface TutorSubscriptionWriteSource extends TutorDirectorySource {
  /**
   * Escribe `users/{tutorId}` con `{ subscription: { ...data, updatedAt,
   * updatedBy: 'admin' } }` (+ `startDate`/`endDate` cuando
   * `activateWithDates`, igual que el legacy).
   */
  writeTutorSubscription(
    tutorId: string,
    data: Record<string, unknown>,
    opts: { activateWithDates: boolean },
  ): Promise<void>;
}

interface FieldValidation {
  readonly isValid: boolean;
  readonly error?: string;
  readonly field?: string;
}

/** Réplica pura de `validateSubscriptionData` del route legacy. */
export function validateTutorSubscriptionData(data: Record<string, unknown>): FieldValidation {
  const asNumber = (v: unknown): number | undefined =>
    typeof v === 'number' ? v : undefined;
  const subscriptionType = data.subscriptionType as string | undefined;
  const fixedAmount = asNumber(data.fixedAmount);
  const percentageRate = asNumber(data.percentageRate);
  const requiresFreeCourses = data.requiresFreeCourses as boolean | undefined;
  const freeCoursesCount = asNumber(data.freeCoursesCount);
  const invitationsPerCourse = asNumber(data.invitationsPerCourse);
  const limits = data.limits as
    | { maxCourses?: unknown; maxStudents?: unknown }
    | undefined;
  const observations = data.observations as string | undefined;

  if (subscriptionType === 'fixed') {
    if (!fixedAmount || fixedAmount <= 0) {
      return { isValid: false, error: 'El monto fijo debe ser mayor a 0', field: 'fixedAmount' };
    }
    if (fixedAmount > 10000) {
      return { isValid: false, error: 'El monto fijo no puede exceder $10,000 USD', field: 'fixedAmount' };
    }
  }

  if (subscriptionType === 'percentage') {
    if (percentageRate === undefined || percentageRate < 0) {
      return { isValid: false, error: 'El porcentaje debe ser mayor o igual a 0', field: 'percentageRate' };
    }
    if (percentageRate > 100) {
      return { isValid: false, error: 'El porcentaje no puede exceder el 100%', field: 'percentageRate' };
    }
  }

  if (requiresFreeCourses) {
    if (!freeCoursesCount || freeCoursesCount < 1) {
      return { isValid: false, error: 'Debe especificar al menos 1 curso gratuito', field: 'freeCoursesCount' };
    }
    if (freeCoursesCount > 10) {
      return { isValid: false, error: 'No puede exigir más de 10 cursos gratuitos', field: 'freeCoursesCount' };
    }
  }

  if (invitationsPerCourse !== undefined) {
    if (invitationsPerCourse < 0) {
      return { isValid: false, error: 'Las invitaciones no pueden ser negativas', field: 'invitationsPerCourse' };
    }
    if (invitationsPerCourse > 1000) {
      return { isValid: false, error: 'Las invitaciones por curso no pueden exceder 1000', field: 'invitationsPerCourse' };
    }
  }

  if (limits) {
    const maxCourses = asNumber(limits.maxCourses);
    const maxStudents = asNumber(limits.maxStudents);
    if (maxCourses === undefined || maxCourses < 1 || maxCourses > 100) {
      return { isValid: false, error: 'El máximo de cursos debe estar entre 1 y 100', field: 'limits.maxCourses' };
    }
    if (maxStudents === undefined || maxStudents < 1 || maxStudents > 10000) {
      return {
        isValid: false,
        error: 'El máximo de estudiantes debe estar entre 1 y 10,000',
        field: 'limits.maxStudents',
      };
    }
  }

  if (observations && observations.length > 2000) {
    return { isValid: false, error: 'Las observaciones no pueden exceder 2000 caracteres', field: 'observations' };
  }

  return { isValid: true };
}

export interface UpdateTutorSubscriptionResult {
  readonly subscription: Record<string, unknown>;
}

export async function updateTutorSubscription(
  source: TutorSubscriptionWriteSource,
  rawInput: unknown,
): Promise<Result<UpdateTutorSubscriptionResult, DomainError>> {
  const parsed = UpdateTutorSubscriptionInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Datos de actualización inválidos', parsed.error.flatten()));
  }
  const { tutorId } = parsed.data;
  if (typeof parsed.data.data !== 'object' || parsed.data.data === null) {
    return err(unavailable('Failed to update subscription'));
  }
  const subscriptionData = parsed.data.data as Record<string, unknown>;

  const existing = await source.getMentorById(tutorId);
  if (!existing) {
    return err(notFound('Tutor not found'));
  }

  const validation = validateTutorSubscriptionData(subscriptionData);
  if (!validation.isValid) {
    return err(validationError(validation.error as string, { field: validation.field }));
  }

  const activateWithDates =
    subscriptionData.status === 'active' &&
    (existing.subscription?.startDate === undefined || existing.subscription?.startDate === null);

  await source.writeTutorSubscription(tutorId, subscriptionData, { activateWithDates });

  const updated = await source.getMentorById(tutorId);
  if (!updated) {
    return err(unavailable('Failed to retrieve updated data'));
  }

  return ok({ subscription: updated.subscription ?? {} });
}
