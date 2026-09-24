/**
 * Capa de datos — Repositorio de suscripciones (F0.1).
 * Mismas colecciones/campos/filtros que `subscription-engine.ts` legacy:
 * `users` (doc por uid, patch dot-notation `subscription.*`),
 * `subscriptionPlans` (doc por planId), `salesPages` con
 * `mentorId ==` + `status ==` y batch commit, subcolección
 * `invoices` de `users` (shape del cron `process-billing`).
 *
 * F0.3 (aditivo, sin tocar lo existente): lecturas de billing/reportes
 * (`users` con `roles array-contains mentor`, `salesPages` completa,
 * `enrollments` con `isDirect ==`, `courses` con `isActive ==`),
 * directorio de planes (dual-read `subscriptionPlans` +
 * `subscription-plans` encapsulado, CRUD) y directorio de tutores.
 * El dual-read vive solo aquí, nunca en handlers.
 */
import type {
  PlanSnapshot,
  SubscriptionPatch,
  SubscriptionRepository,
  UserBillingSnapshot,
} from '@/domain/identity/subscription-repository';
import type {
  BillingActiveCourseRow,
  BillingDirectEnrollmentRow,
  BillingReportSource,
  BillingSalesPageRow,
  MentorDirectoryRow,
} from '@/domain/identity/use-cases/build-billing-report';
import type {
  CronBillableUser,
  BillingCronSource,
} from '@/domain/identity/use-cases/process-due-billing';
import type {
  PlanDirectory,
  PlanDirectoryRow,
} from '@/domain/identity/use-cases/manage-subscription-plans';
import type { TutorDirectorySource } from '@/domain/identity/use-cases/list-tutor-subscriptions';
import type { TutorSubscriptionWriteSource } from '@/domain/identity/use-cases/update-tutor-subscription';
import { toDomainDate } from '@/domain/shared/firestore-mapping';

import type { BatchUpdateOp, FirestoreGateway } from './gateway';

const USERS = 'users';
const PLANS = 'subscriptionPlans';
const LEGACY_PLANS = 'subscription-plans';
const PAGES = 'salesPages';
const ENROLLMENTS = 'enrollments';
const COURSES = 'courses';
const INVOICES = 'invoices';

export class FirestoreSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly gateway: FirestoreGateway) {}
  async getPlan(planId: string): Promise<PlanSnapshot | null> {
    const snap = await this.gateway.getDoc(PLANS, planId);
    if (!snap) return null;
    const raw = snap.data() ?? {};
    return {
      id: snap.id,
      name: raw.name,
      price: raw.price,
      type: raw.type,
      requiresPaymentMethod: raw.requiresPaymentMethod,
      trialDays: raw.trialDays,
      trialReminderDays: raw.trialReminderDays,
      gracePeriodDays: raw.gracePeriodDays,
      billingCycleMonths: raw.billingCycleMonths,
      limits: raw.limits,
      permissions: raw.permissions,
      invitationsPerCourse: raw.invitationsPerCourse,
      aiQuotas: raw.aiQuotas,
      hasPremiumAI: raw.hasPremiumAI,
    };
  }

  async getUserSubscription(uid: string): Promise<UserBillingSnapshot | null> {
    const snap = await this.gateway.getDoc(USERS, uid);
    if (!snap) return null;
    const raw = snap.data() ?? {};
    return {
      uid: snap.id,
      email: raw.email as string,
      displayName: raw.displayName as string,
      subscription: (raw.subscription as Record<string, unknown> | undefined) ?? {},
    };
  }

  async updateSubscriptionFields(uid: string, patch: SubscriptionPatch): Promise<void> {
    await this.gateway.updateDoc(USERS, uid, patch);
  }

  /**
   * F1.1 (aditivo) — `users where subscription.gatewaySubscriptionId ==`
   * (idéntico al lookup de `api/webhooks/stripe`). Retorna el uid o `null`.
   */
  async findTutorIdByGatewaySubscriptionId(subscriptionId: string): Promise<string | null> {
    const snap = await this.gateway.queryByField(
      USERS,
      'subscription.gatewaySubscriptionId',
      subscriptionId,
      1,
    );
    const first = snap.docs[0];
    return first ? first.id : null;
  }

  async listPageIdsByStatus(mentorId: string, status: string): Promise<string[]> {
    if (this.gateway.queryByTwoFields) {
      const snap = await this.gateway.queryByTwoFields(PAGES, 'mentorId', mentorId, 'status', status);
      return snap.docs.map((d) => d.id);
    }
    // Fallback legacy: un solo filtro + descarte en memoria (mismo resultado).
    const snap = await this.gateway.queryByField(PAGES, 'mentorId', mentorId);
    return snap.docs.filter((d) => d.data()?.status === status).map((d) => d.id);
  }

  async suspendPages(mentorId: string): Promise<number> {
    return this.writePageStatuses(mentorId, 'active', 'suspended_by_system');
  }

  async reactivatePages(mentorId: string): Promise<number> {
    return this.writePageStatuses(mentorId, 'suspended_by_system', 'active');
  }

  async writeInvoice(uid: string, cycleId: string, data: Record<string, unknown>): Promise<void> {
    await this.gateway.createSubDoc(USERS, uid, INVOICES, cycleId, data);
  }

  // ------------------------------------------------------------------
  // F0.3 — Lecturas de billing/reportes (mismas colecciones y filtros
  // que `GET api/admin/billing` y `GET api/cron/process-billing`).
  // ------------------------------------------------------------------

  /** `users` con `roles array-contains mentor` (igual que admin/billing). */
  async listMentorUsers(): Promise<MentorDirectoryRow[]> {
    if (this.gateway.queryArrayContains) {
      const snap = await this.gateway.queryArrayContains(USERS, 'roles', 'mentor');
      return snap.docs.map((d) => mapMentorRow(d.id, d.data() ?? {}));
    }
    // Fallback legacy: lista completa + filtro en memoria (mismo resultado).
    const snap = await this.gateway.listDocs(USERS);
    return snap.docs
      .filter((d) => {
        const roles = d.data()?.roles;
        return Array.isArray(roles) && (roles as unknown[]).includes('mentor');
      })
      .map((d) => mapMentorRow(d.id, d.data() ?? {}));
  }

  /** `users` doc(id) como fila de directorio (`null` si no existe). */
  async getMentorById(id: string): Promise<MentorDirectoryRow | null> {
    const snap = await this.gateway.getDoc(USERS, id);
    if (!snap) return null;
    return mapMentorRow(snap.id, snap.data() ?? {});
  }

  /**
   * Escribe `users/{tutorId}` con `{ subscription: { ...data, updatedAt,
   * updatedBy: 'admin' } }` (+ `startDate`/`endDate` al activar, igual
   * que `PUT api/admin/tutors/[tutorId]/subscription`).
   */
  async writeTutorSubscription(
    tutorId: string,
    data: Record<string, unknown>,
    opts: { activateWithDates: boolean },
  ): Promise<void> {
    await this.gateway.updateDoc(USERS, tutorId, {
      subscription: {
        ...data,
        updatedAt: this.gateway.serverTimestamp(),
        updatedBy: 'admin',
        ...(opts.activateWithDates
          ? { startDate: this.gateway.serverTimestamp(), endDate: null }
          : {}),
      },
    });
  }

  /** `salesPages` completa (el use-case aplica los filtros legacy). */
  async listSalesPages(): Promise<BillingSalesPageRow[]> {
    const snap = await this.gateway.listDocs(PAGES);
    return snap.docs.map((d) => {
      const raw = d.data() ?? {};
      const stats = raw.stats as { conversions?: unknown } | undefined;
      return {
        mentorId: (raw.mentorId as string | undefined) ?? '',
        courseId: (raw.courseId as string | undefined) ?? '',
        price: (raw.price as number) || 0,
        isActive: raw.isActive as boolean,
        conversions: (stats?.conversions as number) || 0,
      };
    });
  }

  /** `enrollments` con `isDirect == true` (igual que admin/billing). */
  async listDirectEnrollments(): Promise<BillingDirectEnrollmentRow[]> {
    const snap = await this.gateway.queryByField(ENROLLMENTS, 'isDirect', true);
    return snap.docs.map((d) => {
      const raw = d.data() ?? {};
      return {
        courseId: (raw.courseId as string | undefined) ?? '',
        enrolledAt: toDomainDate(raw.enrolledAt as never) ?? null,
      };
    });
  }

  /** `courses` con `isActive == true` (igual que admin/billing). */
  async listActiveCourses(): Promise<BillingActiveCourseRow[]> {
    const snap = await this.gateway.queryByField(COURSES, 'isActive', true);
    return snap.docs.map((d) => ({
      mentorId: ((d.data() ?? {}).mentorId as string | undefined) ?? '',
    }));
  }

  /**
   * `users` con `subscription.status in [active, trial]` (igual que el
   * cron; el gateway no tiene `in`, así que se filtra en memoria con el
   * mismo resultado).
   */
  async listBillableUsers(): Promise<CronBillableUser[]> {
    const snap = await this.gateway.listDocs(USERS);
    const out: CronBillableUser[] = [];
    for (const d of snap.docs) {
      const raw = d.data() ?? {};
      const sub = raw.subscription as Record<string, unknown> | undefined;
      const status = sub?.status as string | undefined;
      if (status !== 'active' && status !== 'trial') continue;
      const billing = raw.billingCycle as Record<string, unknown> | undefined;
      const payment = raw.payment as Record<string, unknown> | undefined;
      out.push({
        id: d.id,
        subscription: sub ?? {},
        cycleStartRaw: billing?.currentCycleStart ?? null,
        cycleEndRaw: billing?.currentCycleEnd ?? null,
        cycleEnd: toDomainDate(billing?.currentCycleEnd as never) ?? null,
        promotionalCycleIndex: (billing?.promotionalCycleIndex as number) || 0,
        monthlySalesAmount: (billing?.monthlySalesAmount as number) || 0,
        stripeCustomerId: (payment?.stripeCustomerId as string | undefined) ?? null,
      });
    }
    return out;
  }

  /** `studentId` de `enrollments` con `mentorId ==` + `status == active`. */
  async listActiveStudentIds(mentorId: string): Promise<string[]> {
    if (this.gateway.queryByTwoFields) {
      const snap = await this.gateway.queryByTwoFields(ENROLLMENTS, 'mentorId', mentorId, 'status', 'active');
      return snap.docs
        .map((d) => (d.data() ?? {}).studentId as unknown)
        .filter((v): v is string => typeof v === 'string' && v.length > 0);
    }
    // Fallback legacy: un solo filtro + descarte en memoria (mismo resultado).
    const snap = await this.gateway.queryByField(ENROLLMENTS, 'mentorId', mentorId);
    return snap.docs
      .filter((d) => (d.data() ?? {}).status === 'active')
      .map((d) => (d.data() ?? {}).studentId as unknown)
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
  }

  // ------------------------------------------------------------------
  // F0.3 — Directorio de planes (`subscriptionPlans`, dual-read con
  // `subscription-plans` legacy solo en `listPlansDual`).
  // ------------------------------------------------------------------

  /** `subscriptionPlans` completa (igual que el GET admin legacy). */
  async listPlans(): Promise<PlanDirectoryRow[]> {
    const snap = await this.gateway.listDocs(PLANS);
    return snap.docs.map((d) => ({ id: d.id, data: d.data() ?? {} }));
  }

  /**
   * Dual-read `subscriptionPlans` + `subscription-plans` (igual que
   * `GET api/plans`). Encapsulado aquí, nunca en handlers.
   */
  async listPlansDual(): Promise<{ camelCase: PlanDirectoryRow[]; kebabCase: PlanDirectoryRow[] }> {
    const [camelCase, kebabCase] = await Promise.all([
      this.gateway.listDocs(PLANS),
      this.gateway.listDocs(LEGACY_PLANS),
    ]);
    return {
      camelCase: camelCase.docs.map((d) => ({ id: d.id, data: d.data() ?? {} })),
      kebabCase: kebabCase.docs.map((d) => ({ id: d.id, data: d.data() ?? {} })),
    };
  }

  /** Ids de `subscriptionPlans` con `name ==` (chequeo de duplicados). */
  async findPlanIdsByName(name: string): Promise<string[]> {
    const snap = await this.gateway.queryByField(PLANS, 'name', name);
    return snap.docs.map((d) => d.id);
  }

  /**
   * Crea en `subscriptionPlans` con id autogenerado (igual que `addDoc`
   * legacy) + `createdAt`/`updatedAt`. Retorna el id generado.
   */
  async createPlan(data: Record<string, unknown>): Promise<string> {
    const payload = {
      ...data,
      createdAt: this.gateway.serverTimestamp(),
      updatedAt: this.gateway.serverTimestamp(),
    };
    if (this.gateway.createDocAutoId) {
      return this.gateway.createDocAutoId(PLANS, payload);
    }
    // Fallback para gateways mínimos: id generado + `createDoc`.
    const id = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await this.gateway.createDoc(PLANS, id, payload);
    return id;
  }

  /** Patch en `subscriptionPlans/{id}` + `updatedAt` (igual que el PUT legacy). */
  async updatePlan(id: string, patch: Record<string, unknown>): Promise<void> {
    await this.gateway.updateDoc(PLANS, id, {
      ...patch,
      updatedAt: this.gateway.serverTimestamp(),
    });
  }

  /** Borra `subscriptionPlans/{id}` (igual que el DELETE legacy). */
  async deletePlan(id: string): Promise<void> {
    await this.gateway.deleteDoc(PLANS, id);
  }

  private async writePageStatuses(mentorId: string, from: string, to: string): Promise<number> {
    const ids = await this.listPageIdsByStatus(mentorId, from);
    const ops: BatchUpdateOp[] = ids.map((id) => ({
      type: 'update' as const,
      collectionPath: PAGES,
      id,
      patch: { status: to },
    }));
    if (this.gateway.batchWrite) {
      await this.gateway.batchWrite(ops);
    } else {
      for (const op of ops) {
        await this.gateway.updateDoc(op.collectionPath, op.id, op.patch);
      }
    }
    return ids.length;
  }
}

/**
 * Fila de directorio desde `users` crudo (fallbacks iguales a los de
 * `GET api/admin/tutors/subscriptions`: `createdAt` → `new Date()`,
 * `lastLogin` → `null`, `subscription` → `null`).
 */
function mapMentorRow(id: string, raw: Record<string, unknown>): MentorDirectoryRow {
  return {
    id,
    displayName: (raw.displayName as string | undefined) ?? '',
    email: (raw.email as string | undefined) ?? '',
    username: (raw.username as string | undefined) ?? '',
    photoURL: (raw.photoURL as string | undefined) ?? '',
    subscription: (raw.subscription as Record<string, unknown> | undefined) ?? null,
    createdAt: toDomainDate(raw.createdAt as never) ?? new Date(),
    lastLogin: toDomainDate(raw.lastLogin as never) ?? null,
  };
}
