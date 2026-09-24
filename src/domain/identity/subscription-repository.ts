/**
 * Kernel identidad — Contrato del repositorio de suscripciones (F0.1).
 * Mismas colecciones y campos que `subscription-engine.ts` legacy:
 * `users` (doc por uid, patch dot-notation `subscription.*`),
 * `subscriptionPlans` (doc por planId), `salesPages` con filtros
 * `mentorId ==` + `status ==`, y subcolección `invoices` de `users`.
 * El dominio NO conoce Firestore: solo shapes de datos.
 */

export interface PlanSnapshot {
  readonly id: string;
  readonly name?: unknown;
  readonly price?: unknown;
  readonly type?: unknown;
  readonly requiresPaymentMethod?: unknown;
  readonly trialDays?: unknown;
  readonly trialReminderDays?: unknown;
  readonly gracePeriodDays?: unknown;
  readonly billingCycleMonths?: unknown;
  readonly limits?: unknown;
  readonly permissions?: unknown;
  readonly invitationsPerCourse?: unknown;
  readonly aiQuotas?: unknown;
  readonly hasPremiumAI?: unknown;
}

/** Usuario + suscripción tal como los lee el engine legacy. */
export interface UserBillingSnapshot {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly subscription: Record<string, unknown>;
}

/** Patch parcial con dot-notation (`subscription.status`, …). */
export type SubscriptionPatch = Record<string, unknown>;

export interface SubscriptionRepository {
  /** Lee `subscriptionPlans` doc(planId). `null` si no existe. */
  getPlan(planId: string): Promise<PlanSnapshot | null>;
  /** Lee `users` doc(uid). `null` si no existe. */
  getUserSubscription(uid: string): Promise<UserBillingSnapshot | null>;
  /** `users` doc(uid).update(patch) con dot-notation legacy. */
  updateSubscriptionFields(uid: string, patch: SubscriptionPatch): Promise<void>;
  /** Ids de `salesPages` con `mentorId ==` + `status ==` (filtros legacy). */
  listPageIdsByStatus(mentorId: string, status: string): Promise<string[]>;
  /** `active` → `suspended_by_system` en batch. Retorna nº de páginas. */
  suspendPages(mentorId: string): Promise<number>;
  /** `suspended_by_system` → `active` en batch. Retorna nº de páginas. */
  reactivatePages(mentorId: string): Promise<number>;
  /** Crea `users` doc(uid) / `invoices` doc(cycleId) (shape del cron). */
  writeInvoice(uid: string, cycleId: string, data: Record<string, unknown>): Promise<void>;
}
