/**
 * Identidad — Casos de uso: lista y detalle de suscripciones de tutores (F0.3).
 * Lógica 1:1 con `GET api/admin/tutors/subscriptions` (mapeo con default
 * cuando no hay suscripción real, orden por displayName, conteos) y con
 * `GET api/admin/tutors/[tutorId]/subscription` (detalle con default
 * inline legacy). Dominio puro: lee por `TutorDirectorySource`.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';
import { SubscriptionStatus, getDefaultSubscription } from '@/types/subscription';

import type { BillingReportSource, MentorDirectoryRow } from './build-billing-report';

/** Directorio de tutores (lo implementa `subscription-repo`). */
export interface TutorDirectorySource extends BillingReportSource {
  getMentorById(id: string): Promise<MentorDirectoryRow | null>;
}

export interface TutorSubscriptionListEntry {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly username: string;
  readonly photoURL: string;
  readonly subscription: Record<string, unknown> | null;
  readonly hasRealSubscription: boolean;
  readonly createdAt: Date;
  readonly lastLogin: Date | null;
}

export interface TutorSubscriptionList {
  readonly tutors: TutorSubscriptionListEntry[];
  readonly total: number;
  readonly active: number;
  readonly withCustomPage: number;
  readonly withRealSubscription: number;
  readonly none: number;
  readonly trial: number;
  readonly inactive: number;
}

export async function listTutorSubscriptions(
  source: BillingReportSource,
  rawInput: unknown,
): Promise<Result<TutorSubscriptionList, DomainError>> {
  if (rawInput !== undefined && (typeof rawInput !== 'object' || rawInput === null)) {
    return err(validationError('Parámetros inválidos'));
  }
  const mentors = await source.listMentorUsers();

  const tutors = mentors
    .map((mentor) => {
      let subscriptionStatus: string = SubscriptionStatus.NONE;
      let hasRealSubscription = false;
      if (mentor.subscription) {
        subscriptionStatus = (mentor.subscription.status as string | undefined) || SubscriptionStatus.NONE;
        hasRealSubscription = subscriptionStatus !== SubscriptionStatus.NONE;
      }
      const defaultSubscription = hasRealSubscription
        ? null
        : (getDefaultSubscription() as unknown as Record<string, unknown>);
      return {
        id: mentor.id,
        displayName: mentor.displayName || mentor.email?.split('@')[0] || 'Sin nombre',
        email: mentor.email || '',
        username: mentor.username || '',
        photoURL: mentor.photoURL || '',
        subscription: mentor.subscription || defaultSubscription,
        hasRealSubscription,
        createdAt: mentor.createdAt,
        lastLogin: mentor.lastLogin,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const statusOf = (t: TutorSubscriptionListEntry): string =>
    (t.subscription?.status as string | undefined) ?? SubscriptionStatus.NONE;

  return ok({
    tutors,
    total: tutors.length,
    active: tutors.filter((t) => statusOf(t) === SubscriptionStatus.ACTIVE).length,
    withCustomPage: tutors.filter((t) => t.subscription?.hasCustomPage).length,
    withRealSubscription: tutors.filter((t) => t.hasRealSubscription).length,
    none: tutors.filter((t) => statusOf(t) === SubscriptionStatus.NONE).length,
    trial: tutors.filter((t) => statusOf(t) === SubscriptionStatus.TRIAL).length,
    inactive: tutors.filter((t) => statusOf(t) === SubscriptionStatus.INACTIVE).length,
  });
}

export const TutorDetailInputSchema = z.object({
  tutorId: z.string().min(1, 'tutorId vacío'),
});
export type TutorDetailInput = z.infer<typeof TutorDetailInputSchema>;

/** Default inline del legacy para el detalle (distinto de `getDefaultSubscription`). */
export const TUTOR_DETAIL_DEFAULT_SUBSCRIPTION = {
  hasCustomPage: false,
  subscriptionType: 'free',
  fixedAmount: 0,
  percentageRate: 0,
  requiresFreeCourses: false,
  freeCoursesCount: 0,
  invitationsPerCourse: 10,
  observations: '',
  status: 'inactive',
  limits: {
    maxCourses: 3,
    maxStudents: 50,
    hasCustomBranding: false,
    hasAnalytics: false,
    hasPrioritySupport: false,
  },
} as const;

export interface TutorSubscriptionDetail {
  readonly tutor: {
    readonly id: string;
    readonly displayName: string;
    readonly email: string;
    readonly username: string;
    readonly photoURL: string;
    readonly subscription: Record<string, unknown>;
  };
}

export async function getTutorSubscriptionDetail(
  source: TutorDirectorySource,
  rawInput: unknown,
): Promise<Result<TutorSubscriptionDetail, DomainError>> {
  const parsed = TutorDetailInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('Datos de consulta inválidos', parsed.error.flatten()));
  }
  const mentor = await source.getMentorById(parsed.data.tutorId);
  if (!mentor) {
    return err(notFound('Tutor not found'));
  }
  return ok({
    tutor: {
      id: parsed.data.tutorId,
      displayName: mentor.displayName || mentor.email?.split('@')[0] || 'Sin nombre',
      email: mentor.email || '',
      username: mentor.username || '',
      photoURL: mentor.photoURL || '',
      subscription:
        mentor.subscription ?? { ...TUTOR_DETAIL_DEFAULT_SUBSCRIPTION },
    },
  });
}
