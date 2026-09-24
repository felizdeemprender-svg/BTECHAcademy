/**
 * F0.3 (TDD rojo) — `buildBillingReport`: agregación EXACTA de
 * `GET api/admin/billing` legacy (mismo filtro, mismo shape de filas,
 * mismo summary/byType, mismo orden desc por billedAmount).
 */
import { describe, expect, it } from 'vitest';

import {
  buildBillingReport,
  type BillingActiveCourseRow,
  type BillingDirectEnrollmentRow,
  type BillingReportSource,
  type BillingSalesPageRow,
  type MentorDirectoryRow,
} from '../build-billing-report';

const NOW = new Date('2026-09-14T12:00:00Z');

function mentor(
  id: string,
  displayName: string,
  subscription: Record<string, unknown> | null,
): MentorDirectoryRow {
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

const mentors: MentorDirectoryRow[] = [
  mentor('m1', 'Ana', {
    type: 'fixed',
    status: 'active',
    fixedAmount: 100,
    percentageRate: 0,
    planName: 'Pro',
    startDate: '2026-01-01',
    endDate: null,
  }),
  mentor('m2', 'Beto', {
    type: 'percentage',
    status: 'active',
    fixedAmount: 0,
    percentageRate: 10,
    planName: 'Rev',
    startDate: '2026-02-01',
    endDate: null,
  }),
  mentor('m3', 'Ceci', { type: 'free', status: 'active' }),
  mentor('m4', 'Dora', { type: 'fixed', status: 'inactive', fixedAmount: 50 }),
  mentor('m5', 'Ema', null),
];

const pages: BillingSalesPageRow[] = [
  { mentorId: 'm2', courseId: 'c1', price: 1000, isActive: true, conversions: 3 },
  { mentorId: 'm2', courseId: 'c1', price: 1200, isActive: true, conversions: 1 },
  { mentorId: 'm2', courseId: 'c2', price: 500, isActive: false, conversions: 9 },
  { mentorId: 'm1', courseId: 'c3', price: 200, isActive: true, conversions: 5 },
];

const enrollments: BillingDirectEnrollmentRow[] = [
  { courseId: 'c1', enrolledAt: new Date('2026-09-10T12:00:00Z') },
  { courseId: 'c9', enrolledAt: new Date('2026-09-11T12:00:00Z') },
  { courseId: 'c1', enrolledAt: new Date('2026-08-01T12:00:00Z') },
  { courseId: 'c3', enrolledAt: null },
];

const courses: BillingActiveCourseRow[] = [
  { mentorId: 'm1' },
  { mentorId: 'm1' },
  { mentorId: 'm2' },
];

function stubSource(): BillingReportSource {
  return {
    listMentorUsers: async () => mentors,
    listSalesPages: async () => pages,
    listDirectEnrollments: async () => enrollments,
    listActiveCourses: async () => courses,
  };
}

describe('buildBillingReport', () => {
  it('agrega exacto como el legacy (fijo + porcentaje + gratis)', async () => {
    const result = await buildBillingReport(stubSource(), {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.000Z',
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const report = result.value;
    expect(report.period).toEqual({ from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.000Z' });
    // m2: 1000*3 + 1200*1 + directa 1200 = 5400 → 10% = 540
    // m1: fijo 100 · m3: gratis 0 · orden desc
    expect(report.tutors.map((t) => t.id)).toEqual(['m2', 'm1', 'm3']);
    const m2 = report.tutors[0]!;
    expect(m2.billedAmount).toBe(540);
    expect(m2.totalSalesCount).toBe(5);
    expect(m2.totalSalesRevenue).toBe(5400);
    expect(m2.activeCoursesCount).toBe(1);
    expect(m2.planName).toBe('Rev');
    const m1 = report.tutors[1]!;
    expect(m1.billedAmount).toBe(100);
    // 5 de salesPage + 1 directa con enrolledAt null (el legacy la cuenta)
    expect(m1.totalSalesCount).toBe(6);
    expect(m1.totalSalesRevenue).toBe(1200);
    expect(m1.activeCoursesCount).toBe(2);
    expect(report.tutors[2]).toMatchObject({ id: 'm3', billedAmount: 0, subscriptionType: 'free' });
    expect(report.summary).toEqual({
      totalBilled: 640,
      fixedBilled: 100,
      percentageBilled: 540,
      fixedTutorsCount: 1,
      percentageTutorsCount: 1,
      freeTutorsCount: 1,
      totalActiveTutors: 3,
    });
    expect(report.byType).toEqual([
      { type: 'fixed', label: 'Abono Fijo', count: 1, totalBilled: 100, avgBilled: 100 },
      { type: 'percentage', label: 'Por Porcentaje', count: 1, totalBilled: 540, avgBilled: 540 },
      { type: 'free', label: 'Gratuito', count: 1, totalBilled: 0, avgBilled: 0 },
    ]);
  });

  it('excluye inactivos y sin suscripción', async () => {
    const result = await buildBillingReport(stubSource(), {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.000Z',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tutors.map((t) => t.id)).not.toContain('m4');
    expect(result.value.tutors.map((t) => t.id)).not.toContain('m5');
  });

  it('sin from/to usa el mes del now (igual que el legacy)', async () => {
    const result = await buildBillingReport(stubSource(), { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const expectedFrom = new Date(NOW.getFullYear(), NOW.getMonth(), 1).toISOString();
    const expectedTo = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0, 23, 59, 59).toISOString();
    expect(result.value.period).toEqual({ from: expectedFrom, to: expectedTo });
  });

  it('fila conserva fallbacks legacy (displayName, email, planName)', async () => {
    const source: BillingReportSource = {
      listMentorUsers: async () => [
        {
          id: 'mx',
          displayName: '',
          email: '',
          username: '',
          photoURL: '',
          subscription: { type: 'fixed', status: 'active', fixedAmount: 10 },
          createdAt: NOW,
          lastLogin: null,
        },
      ],
      listSalesPages: async () => [],
      listDirectEnrollments: async () => [],
      listActiveCourses: async () => [],
    };
    const result = await buildBillingReport(source, {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.000Z',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tutors[0]).toMatchObject({
      displayName: 'Tutor',
      email: '',
      planName: 'Sin plan',
      startDate: null,
      endDate: null,
    });
  });
});
