/**
 * Kernel identidad — Suscripción del mentor.
 * Compatible con `UserSubscription` actual; agrega 'trialing'
 * porque el dashboard lo trata como estado válido.
 */

import { z } from 'zod';

export const SubscriptionStatusSchema = z.enum([
  'active',
  'inactive',
  'trial',
  'trialing',
  'cancelled',
  'none',
  'past_due',
  'suspended',
  'expired',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionTypeSchema = z.enum(['free', 'fixed', 'mixed']);
export type SubscriptionType = z.infer<typeof SubscriptionTypeSchema>;

export const SubscriptionLimitsSchema = z.object({
  maxCourses: z.number().int().min(0),
  maxStudents: z.number().int().min(0),
  hasCustomBranding: z.boolean(),
  hasAnalytics: z.boolean(),
  hasPrioritySupport: z.boolean(),
});
export type SubscriptionLimits = z.infer<typeof SubscriptionLimitsSchema>;

export const AiQuotasSchema = z.object({
  totalCredits: z.number().int().min(0),
  usedCredits: z.number().int().min(0),
});
export type AiQuotas = z.infer<typeof AiQuotasSchema>;

export const PaymentMethodSchema = z.enum(['mercadopago', 'stripe', 'manual']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const SubscriptionPaymentSchema = z.object({
  method: PaymentMethodSchema,
  lastPaymentDate: z.unknown().optional(),
  nextPaymentDate: z.unknown().optional(),
  paymentHistory: z.array(z.unknown()).default([]),
});
export type SubscriptionPayment = z.infer<typeof SubscriptionPaymentSchema>;

export const PublicProfileSchema = z.object({
  enabled: z.boolean(),
  showStats: z.boolean(),
  showContact: z.boolean(),
  allowPublicCourses: z.boolean(),
});
export type PublicProfile = z.infer<typeof PublicProfileSchema>;

export const BillingCycleSchema = z.object({
  currentCycleStart: z.unknown().optional(),
  currentCycleEnd: z.unknown().optional(),
  promotionalCycleIndex: z.number().int().min(0).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  monthlySalesAmount: z.number().min(0).optional(),
});
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const UserSubscriptionSchema = z.object({
  status: SubscriptionStatusSchema,
  type: SubscriptionTypeSchema,
  planId: z.string().optional(),
  planName: z.string().optional(),
  name: z.string().optional(),
  isEnterprise: z.boolean().optional(),
  hasPremiumAI: z.boolean().optional(),
  hasCustomPage: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  fixedAmount: z.number().min(0).optional(),
  requiresFreeCourses: z.boolean().optional(),
  freeCoursesCount: z.number().int().min(0).optional(),
  invitationsPerCourse: z.number().int().min(0).optional(),
  observations: z.string().optional(),
  autoRenew: z.boolean().optional(),
  gracePeriodEndsAt: z.unknown().optional(),
  trialEndsAt: z.unknown().optional(),
  aiQuotas: AiQuotasSchema.optional(),
  limits: SubscriptionLimitsSchema,
  publicProfile: PublicProfileSchema,
  payment: SubscriptionPaymentSchema.optional(),
  billingCycle: BillingCycleSchema.optional(),
  updatedAt: z.unknown().optional(),
  updatedBy: z.string().optional(),
});
export type UserSubscription = z.infer<typeof UserSubscriptionSchema>;

/** El dashboard considera válidos 'active' y 'trialing'. */
export function isSubscriptionInGoodStanding(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}

/** Capacidad de cursos según límites del plan. */
export function hasCourseCapacity(limits: SubscriptionLimits, currentCourses: number): boolean {
  return currentCourses < limits.maxCourses;
}
