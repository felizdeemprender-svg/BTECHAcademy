/**
 * Dominio Empresa (Multi-Tenant B2B).
 * Entidades canónicas de Empresa, Abono y Límites.
 */
import { z } from 'zod';

export const CompanyLimitsSchema = z.object({
  maxTutors: z.number().int().refine((val) => val === -1 || val >= 1, 'Debe ser -1 (ilimitado) o al menos 1').default(5),
  maxStudents: z.number().int().refine((val) => val === -1 || val >= 0, 'Debe ser -1 (ilimitado) o al menos 0').default(50),
  maxAiCredits: z.number().int().min(0).optional(),
});
export type CompanyLimits = z.infer<typeof CompanyLimitsSchema>;

export const CompanyUsageSchema = z.object({
  tutorsCount: z.number().int().min(0).default(0),
  studentsCount: z.number().int().min(0).default(0),
});
export type CompanyUsage = z.infer<typeof CompanyUsageSchema>;

export const CompanySubscriptionStatusSchema = z.enum(['active', 'trial', 'past_due', 'canceled']);
export type CompanySubscriptionStatus = z.infer<typeof CompanySubscriptionStatusSchema>;

export const CompanySubscriptionSchema = z.object({
  planId: z.string().min(1, 'planId requerido'),
  planName: z.string().optional(),
  status: CompanySubscriptionStatusSchema.default('active'),
  limits: CompanyLimitsSchema,
  currentUsage: CompanyUsageSchema.default({ tutorsCount: 0, studentsCount: 0 }),
  renewsAt: z.union([z.date(), z.string()]).optional(),
});
export type CompanySubscription = z.infer<typeof CompanySubscriptionSchema>;

export const CompanyBrandingSchema = z.object({
  logoUrl: z.string().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color hex inválido (ej: #00FF00)')
    .optional(),
  slogan: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
});
export type CompanyBranding = z.infer<typeof CompanyBrandingSchema>;

export const CompanySchema = z.object({
  id: z.string().min(1, 'ID de empresa requerido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z
    .string()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug sólo minúsculas, números y guiones'),
  ownerId: z.string().min(1, 'ownerId requerido'),
  branding: CompanyBrandingSchema.default({}),
  subscription: CompanySubscriptionSchema,
  createdAt: z.union([z.date(), z.string()]).optional(),
  updatedAt: z.union([z.date(), z.string()]).optional(),
});
export type Company = z.infer<typeof CompanySchema>;
export type NewCompany = z.input<typeof CompanySchema>;

/** Verifica si la empresa tiene capacidad disponible para sumar tutores */
export function hasTutorCapacity(company: Company): boolean {
  if (company.subscription.status === 'canceled' || company.subscription.status === 'past_due') {
    return false;
  }
  if (company.subscription.limits.maxTutors === -1) {
    return true;
  }
  return company.subscription.currentUsage.tutorsCount < company.subscription.limits.maxTutors;
}

/** Verifica si la empresa tiene capacidad disponible para matricular alumnos */
export function hasStudentCapacity(company: Company): boolean {
  if (company.subscription.status === 'canceled' || company.subscription.status === 'past_due') {
    return false;
  }
  if (company.subscription.limits.maxStudents === -1) {
    return true;
  }
  return company.subscription.currentUsage.studentsCount < company.subscription.limits.maxStudents;
}
