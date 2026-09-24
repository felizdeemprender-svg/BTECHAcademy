/**
 * Comercio — Lead (colección `leads`).
 * Embudo: 'pending' (dejó datos) → 'converted' (pago confirmado).
 * Compatible con `Lead` de src/types/referido.ts.
 */
import { z } from 'zod';

import { EmailSchema } from './email';

export const LeadStatusSchema = z.enum(['pending', 'converted']);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

export const LeadSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  landingId: z.string().min(1, 'landingId vacío'),
  courseId: z.string().min(1, 'courseId vacío'),
  referidoId: z.string().nullable(),
  studentName: z.string().min(1, 'nombre vacío'),
  studentEmail: EmailSchema,
  status: LeadStatusSchema,
  paymentId: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type Lead = z.infer<typeof LeadSchema>;

export function parseLead(data: unknown): Lead {
  return LeadSchema.parse(data);
}

export function isConvertedLead(lead: Pick<Lead, 'status'>): boolean {
  return lead.status === 'converted';
}

/** Conversión inmutable: devuelve un lead nuevo, no muta el original. */
export function convertLead(lead: Lead, paymentId: string): Lead {
  return { ...lead, status: 'converted', paymentId };
}
