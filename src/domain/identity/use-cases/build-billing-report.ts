/**
 * Identidad — Caso de uso: reporte de facturación (F0.3).
 * Agregación 1:1 con `GET api/admin/billing` legacy: tutores con rol
 * mentor, precios por curso desde `salesPages` activas (máximo), ventas
 * desde `stats.conversions` + cargas directas (`enrollments` con
 * `isDirect == true` dentro del período, incluyendo `enrolledAt` nulo
 * como el legacy), conteo de cursos activos, solo suscripciones activas,
 * facturado fijo/porcentaje, orden desc por `billedAmount`, summary y
 * `byType` con el mismo shape. UN solo use-case parametrizado que usan
 * el handler de admin/billing y (vía la misma fuente) el de cron.
 * Dominio puro: los datos llegan por `BillingReportSource`.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { validationError, type DomainError } from '@/domain/shared/errors';

/** Fila del directorio de mentores (misma info que el legacy lee de `users`). */
export interface MentorDirectoryRow {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly username: string;
  readonly photoURL: string;
  /** `null` cuando el documento no tiene `subscription` (igual que el legacy). */
  readonly subscription: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly lastLogin: Date | null;
}

/** Fila cruda de `salesPages` para el reporte. */
export interface BillingSalesPageRow {
  readonly mentorId: string;
  readonly courseId: string;
  readonly price: number;
  readonly isActive: boolean;
  readonly conversions: number;
}

/** Fila cruda de `enrollments` con `isDirect == true`. */
export interface BillingDirectEnrollmentRow {
  readonly courseId: string;
  readonly enrolledAt: Date | null;
}

/** Fila cruda de `courses` con `isActive == true`. */
export interface BillingActiveCourseRow {
  readonly mentorId: string;
}

/** Fuente de datos del reporte (la implementa `subscription-repo`). */
export interface BillingReportSource {
  listMentorUsers(): Promise<MentorDirectoryRow[]>;
  listSalesPages(): Promise<BillingSalesPageRow[]>;
  listDirectEnrollments(): Promise<BillingDirectEnrollmentRow[]>;
  listActiveCourses(): Promise<BillingActiveCourseRow[]>;
}

export const BillingReportInputSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  /** Solo tests/determinismo. Por defecto, ahora (igual que el legacy). */
  now: z.date().optional(),
});
export type BillingReportInput = z.infer<typeof BillingReportInputSchema>;

/** Mismo shape que la interfaz legacy `TutorBillingRow` del route. */
export interface TutorBillingRow {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly username: string;
  readonly photoURL: string;
  readonly subscriptionType: 'fixed' | 'percentage' | 'free';
  readonly subscriptionStatus: string;
  readonly fixedAmount: number;
  readonly percentageRate: number;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly activeCoursesCount: number;
  readonly totalSalesCount: number;
  readonly totalSalesRevenue: number;
  readonly billedAmount: number;
  readonly planName: string;
}

/** Mismo shape que la interfaz legacy `BillingReport` del route. */
export interface BillingReport {
  readonly period: { readonly from: string; readonly to: string };
  readonly summary: {
    readonly totalBilled: number;
    readonly fixedBilled: number;
    readonly percentageBilled: number;
    readonly fixedTutorsCount: number;
    readonly percentageTutorsCount: number;
    readonly freeTutorsCount: number;
    readonly totalActiveTutors: number;
  };
  readonly byType: {
    readonly type: string;
    readonly label: string;
    readonly count: number;
    readonly totalBilled: number;
    readonly avgBilled: number;
  }[];
  readonly tutors: TutorBillingRow[];
}

export async function buildBillingReport(
  source: BillingReportSource,
  rawInput: unknown,
): Promise<Result<BillingReport, DomainError>> {
  const parsed = BillingReportInputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return err(validationError('Parámetros de reporte inválidos', parsed.error.flatten()));
  }
  const now = parsed.data.now ?? new Date();
  const fromStr =
    parsed.data.from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const toStr =
    parsed.data.to ?? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const fromDate = new Date(fromStr);
  const toDate = new Date(toStr);

  const [mentors, salesPages, directEnrollments, activeCourses] = await Promise.all([
    source.listMentorUsers(),
    source.listSalesPages(),
    source.listDirectEnrollments(),
    source.listActiveCourses(),
  ]);

  const salesPagesByMentor: Record<string, { conversions: number; revenue: number }> = {};
  const priceByCourse: Record<string, number> = {};
  const mentorByCourse: Record<string, string> = {};

  for (const page of salesPages) {
    if (!page.mentorId || !page.courseId) continue;
    if (page.isActive && (!priceByCourse[page.courseId] || page.price > (priceByCourse[page.courseId] as number))) {
      priceByCourse[page.courseId] = page.price;
      mentorByCourse[page.courseId] = page.mentorId;
    }
    if (!page.isActive) continue;
    const revenue = page.price * page.conversions;
    if (!salesPagesByMentor[page.mentorId]) {
      salesPagesByMentor[page.mentorId] = { conversions: 0, revenue: 0 };
    }
    (salesPagesByMentor[page.mentorId] as { conversions: number; revenue: number }).conversions +=
      page.conversions;
    (salesPagesByMentor[page.mentorId] as { conversions: number; revenue: number }).revenue += revenue;
  }

  for (const enrollment of directEnrollments) {
    const enrolledAt = enrollment.enrolledAt;
    if (enrolledAt && (enrolledAt < fromDate || enrolledAt > toDate)) continue;
    const mentorId = mentorByCourse[enrollment.courseId];
    const price = priceByCourse[enrollment.courseId] || 0;
    if (mentorId) {
      if (!salesPagesByMentor[mentorId]) {
        salesPagesByMentor[mentorId] = { conversions: 0, revenue: 0 };
      }
      (salesPagesByMentor[mentorId] as { conversions: number; revenue: number }).conversions += 1;
      (salesPagesByMentor[mentorId] as { conversions: number; revenue: number }).revenue += price;
    }
  }

  const coursesByMentor: Record<string, number> = {};
  for (const course of activeCourses) {
    if (course.mentorId) {
      coursesByMentor[course.mentorId] = (coursesByMentor[course.mentorId] || 0) + 1;
    }
  }

  const tutors: TutorBillingRow[] = [];
  let totalFixed = 0;
  let totalPercentage = 0;
  let countFixed = 0;
  let countPercentage = 0;
  let countFree = 0;

  for (const mentor of mentors) {
    const sub = mentor.subscription;
    if (!sub) continue;
    const subType = ((sub.type as string | undefined) || 'free') as 'fixed' | 'percentage' | 'free';
    const subStatus = (sub.status as string | undefined) || 'none';
    // Legacy: `subStatus === SubscriptionStatus.ACTIVE || subStatus === 'active'`
    // (ambos son `'active'`); se preserva el filtro idéntico.
    const isActive = subStatus === 'active';
    if (!isActive) continue;

    const fixedAmount = (sub.fixedAmount as number) || 0;
    const percentageRate = (sub.percentageRate as number) || 0;
    const salesData = salesPagesByMentor[mentor.id] || { conversions: 0, revenue: 0 };
    const activeCoursesCount = coursesByMentor[mentor.id] || 0;

    let billedAmount = 0;
    if (subType === 'fixed') {
      billedAmount = fixedAmount;
      totalFixed += billedAmount;
      countFixed++;
    } else if (subType === 'percentage') {
      billedAmount = (salesData.revenue * percentageRate) / 100;
      totalPercentage += billedAmount;
      countPercentage++;
    } else {
      countFree++;
    }

    tutors.push({
      id: mentor.id,
      displayName: mentor.displayName || mentor.email?.split('@')[0] || 'Tutor',
      email: mentor.email || '',
      username: mentor.username || '',
      photoURL: mentor.photoURL || '',
      subscriptionType: subType,
      subscriptionStatus: subStatus,
      fixedAmount,
      percentageRate,
      startDate: (sub.startDate as string | undefined) || null,
      endDate: (sub.endDate as string | undefined) || null,
      activeCoursesCount,
      totalSalesCount: salesData.conversions,
      totalSalesRevenue: salesData.revenue,
      billedAmount,
      planName: ((sub.planName as string | undefined) || (sub.name as string | undefined) || 'Sin plan'),
    });
  }

  tutors.sort((a, b) => b.billedAmount - a.billedAmount);

  return ok({
    period: { from: fromStr, to: toStr },
    summary: {
      totalBilled: totalFixed + totalPercentage,
      fixedBilled: totalFixed,
      percentageBilled: totalPercentage,
      fixedTutorsCount: countFixed,
      percentageTutorsCount: countPercentage,
      freeTutorsCount: countFree,
      totalActiveTutors: countFixed + countPercentage + countFree,
    },
    byType: [
      {
        type: 'fixed',
        label: 'Abono Fijo',
        count: countFixed,
        totalBilled: totalFixed,
        avgBilled: countFixed > 0 ? totalFixed / countFixed : 0,
      },
      {
        type: 'percentage',
        label: 'Por Porcentaje',
        count: countPercentage,
        totalBilled: totalPercentage,
        avgBilled: countPercentage > 0 ? totalPercentage / countPercentage : 0,
      },
      {
        type: 'free',
        label: 'Gratuito',
        count: countFree,
        totalBilled: 0,
        avgBilled: 0,
      },
    ],
    tutors,
  });
}
