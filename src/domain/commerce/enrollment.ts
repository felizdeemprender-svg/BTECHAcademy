/**
 * Comercio — Inscripción (colección `enrollments`).
 * Une curso y mentoría bajo `productId`/`productType`
 * (course | followup), con `courseId` retenido por compatibilidad.
 */
import { z } from 'zod';

import { EmailSchema, normalizeEmail } from './email';

export const EnrollmentStatusSchema = z.enum(['active', 'pending', 'suspended']);
export type EnrollmentStatus = z.infer<typeof EnrollmentStatusSchema>;

export const ProductTypeSchema = z.enum(['course', 'followup']);
export type ProductType = z.infer<typeof ProductTypeSchema>;

export const EnrollmentProgressSchema = z
  .object({
    completedModules: z.array(z.string()).default([]),
  })
  .catchall(z.unknown());
export type EnrollmentProgress = z.infer<typeof EnrollmentProgressSchema>;

export const EnrollmentMetadataSchema = z
  .object({
    pageId: z.string().optional(),
    externalReference: z.string().optional(),
  })
  .catchall(z.unknown());
export type EnrollmentMetadata = z.infer<typeof EnrollmentMetadataSchema>;

export const EnrollmentSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  courseId: z.string().min(1, 'courseId vacío'),
  productId: z.string().min(1, 'productId vacío'),
  productType: ProductTypeSchema,
  mentorId: z.string().min(1, 'mentorId vacío'),
  inviteEmail: EmailSchema,
  studentId: z.string().min(1, 'studentId vacío'),
  status: EnrollmentStatusSchema,
  enrolledAt: z.date().optional(),
  paymentId: z.string().optional(),
  source: z.string().optional(),
  progress: EnrollmentProgressSchema.default({ completedModules: [] }),
  progressPercent: z.number().min(0).max(100).default(0),
  metadata: EnrollmentMetadataSchema.optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type Enrollment = z.infer<typeof EnrollmentSchema>;

export function parseEnrollment(data: unknown): Enrollment {
  return EnrollmentSchema.parse(data);
}

/**
 * ID idempotente de inscripción.
 * Regla extraída del webhook de pagos:
 * `enroll_${productId}_${emailNormalizadoSinEspeciales}`.
 */
export function buildEnrollmentId(productId: string, studentEmail: string): string {
  const slug = normalizeEmail(studentEmail).replace(/[^a-z0-9]/g, '_');
  return `enroll_${productId}_${slug}`;
}

export function isActiveEnrollment(
  enrollment: Pick<Enrollment, 'status'>,
): boolean {
  return enrollment.status === 'active';
}
