/**
 * F0.3 (TDD rojo) — `listTutorSubscriptions` / `getTutorSubscriptionDetail` /
 * `updateTutorSubscription`: misma semántica que `GET api/admin/tutors/subscriptions`
 * y `GET/PUT api/admin/tutors/[tutorId]/subscription` (conteos, defaults,
 * validaciones con `{error, field}`, fechas al activar).
 */
import { describe, expect, it } from 'vitest';

import {
  getTutorSubscriptionDetail,
  listTutorSubscriptions,
  type TutorDirectorySource,
} from '../list-tutor-subscriptions';
import {
  updateTutorSubscription,
  type TutorSubscriptionWriteSource,
} from '../update-tutor-subscription';
import type { MentorDirectoryRow } from '../build-billing-report';
import { SubscriptionStatus } from '@/types/subscription';

function row(id: string, displayName: string, subscription: Record<string, unknown> | null): MentorDirectoryRow {
  return {
    id,
    displayName,
    email: `${id}@x.com`,
    username: id,
    photoURL: '',
    subscription,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    lastLogin: null,
  };
}

function stubSource(
  rows: MentorDirectoryRow[],
): TutorDirectorySource & TutorSubscriptionWriteSource & { writes: { tutorId: string; data: Record<string, unknown>; activateWithDates: boolean }[] } {
  const writes: { tutorId: string; data: Record<string, unknown>; activateWithDates: boolean }[] = [];
  const store = new Map(rows.map((r) => [r.id, r]));
  const source: TutorDirectorySource & TutorSubscriptionWriteSource & { writes: typeof writes } = {
    writes,
    listMentorUsers: async () => [...store.values()],
    listSalesPages: async () => [],
    listDirectEnrollments: async () => [],
    listActiveCourses: async () => [],
    getMentorById: async (id) => store.get(id) ?? null,
    writeTutorSubscription: async (tutorId, data, opts) => {
      writes.push({ tutorId, data, activateWithDates: opts.activateWithDates });
      const current = store.get(tutorId);
      if (current) store.set(tutorId, { ...current, subscription: { ...data } });
    },
  };
  return source;
}

const seed = () => [
  row('t2', 'Beto', { status: 'active', hasCustomPage: true }),
  row('t1', 'Ana', { status: 'trial' }),
  row('t3', 'Ceci', null),
  row('t4', 'Dora', { status: 'inactive' }),
];

describe('listTutorSubscriptions', () => {
  it('lista ordenada por displayName con conteos legacy', async () => {
    const result = await listTutorSubscriptions(stubSource(seed()), {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tutors.map((t) => t.id)).toEqual(['t1', 't2', 't3', 't4']);
    expect(result.value.total).toBe(4);
    expect(result.value.active).toBe(1);
    expect(result.value.withCustomPage).toBe(1);
    expect(result.value.withRealSubscription).toBe(3);
    expect(result.value.none).toBe(1);
    expect(result.value.trial).toBe(1);
    expect(result.value.inactive).toBe(1);
  });

  it('sin suscripción real → default con hasRealSubscription false', async () => {
    const result = await listTutorSubscriptions(stubSource(seed()), {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ceci = result.value.tutors.find((t) => t.id === 't3')!;
    expect(ceci.hasRealSubscription).toBe(false);
    expect(ceci.subscription).toMatchObject({ status: SubscriptionStatus.NONE });
    expect(result.value.tutors.find((t) => t.id === 't1')!.hasRealSubscription).toBe(true);
  });
});

describe('getTutorSubscriptionDetail', () => {
  it('tutor inexistente → NOT_FOUND con mensaje legacy', async () => {
    const result = await getTutorSubscriptionDetail(stubSource(seed()), { tutorId: 'x' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.message).toBe('Tutor not found');
  });

  it('devuelve tutor con su suscripción', async () => {
    const result = await getTutorSubscriptionDetail(stubSource(seed()), { tutorId: 't2' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tutor).toMatchObject({
      id: 't2',
      displayName: 'Beto',
      email: 't2@x.com',
      subscription: { status: 'active', hasCustomPage: true },
    });
  });

  it('sin suscripción → default de detalle legacy', async () => {
    const result = await getTutorSubscriptionDetail(stubSource(seed()), { tutorId: 't3' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tutor.subscription).toMatchObject({
      hasCustomPage: false,
      subscriptionType: 'free',
      invitationsPerCourse: 10,
      status: 'inactive',
      limits: { maxCourses: 3, maxStudents: 50 },
    });
  });
});

describe('updateTutorSubscription', () => {
  const valid = {
    hasCustomPage: true,
    subscriptionType: 'fixed',
    fixedAmount: 100,
    requiresFreeCourses: false,
    freeCoursesCount: 0,
    invitationsPerCourse: 10,
    observations: '',
    status: 'active',
    isPublic: false,
    isEnterprise: false,
  };

  it('tutor inexistente → NOT_FOUND', async () => {
    const result = await updateTutorSubscription(stubSource(seed()), { tutorId: 'x', data: valid });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Tutor not found');
  });

  it('monto fijo inválido → VALIDATION con field legacy', async () => {
    const result = await updateTutorSubscription(stubSource(seed()), {
      tutorId: 't1',
      data: { ...valid, fixedAmount: 0 },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('VALIDATION');
    expect(result.error.message).toBe('El monto fijo debe ser mayor a 0');
    expect(result.error.details).toMatchObject({ field: 'fixedAmount' });
  });

  it('porcentaje > 100 → VALIDATION con field legacy', async () => {
    const result = await updateTutorSubscription(stubSource(seed()), {
      tutorId: 't1',
      data: { ...valid, subscriptionType: 'percentage', percentageRate: 150 },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('El porcentaje no puede exceder el 100%');
    expect(result.error.details).toMatchObject({ field: 'percentageRate' });
  });

  it('observaciones > 2000 → VALIDATION', async () => {
    const result = await updateTutorSubscription(stubSource(seed()), {
      tutorId: 't1',
      data: { ...valid, observations: 'x'.repeat(2001) },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.details).toMatchObject({ field: 'observations' });
  });

  it('activa con fechas cuando no había startDate (replica flag legacy)', async () => {
    const source = stubSource(seed());
    const result = await updateTutorSubscription(source, { tutorId: 't1', data: valid });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(source.writes).toHaveLength(1);
    expect(source.writes[0]).toMatchObject({ tutorId: 't1', activateWithDates: true });
    expect(result.value.subscription).toMatchObject({ status: 'active' });
  });

  it('no pide fechas si ya había startDate', async () => {
    const rows = seed();
    rows[0] = { ...rows[0]!, subscription: { status: 'inactive', startDate: '2026-01-01' } };
    const source = stubSource(rows);
    const result = await updateTutorSubscription(source, { tutorId: 't2', data: valid });
    expect(result.ok).toBe(true);
    expect(source.writes[0]).toMatchObject({ activateWithDates: false });
  });
});
