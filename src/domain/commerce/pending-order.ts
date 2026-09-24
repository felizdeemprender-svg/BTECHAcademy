/**
 * Comercio — Orden pendiente de gateway (colección `pending_orders`).
 * Creada al iniciar checkout (getnet); el webhook la marca
 * 'completed' o guarda el estado crudo del gateway si falla.
 */
import { z } from 'zod';

import { EmailSchema } from './email';

export const PendingOrderStatusSchema = z.enum(['pending', 'completed', 'failed']);
export type PendingOrderStatus = z.infer<typeof PendingOrderStatusSchema>;

export const PendingOrderSchema = z.object({
  orderId: z.string().min(1, 'orderId vacío'),
  gateway: z.string().min(1, 'gateway vacío'),
  courseId: z.string().optional(),
  courseTitle: z.string().optional(),
  tutorId: z.string().min(1, 'tutorId vacío'),
  buyerEmail: EmailSchema,
  buyerName: z.string().default(''),
  landingId: z.string().min(1, 'landingId vacío'),
  referidoId: z.string().nullable().optional(),
  amount: z.number().min(0),
  status: PendingOrderStatusSchema,
  lastPayload: z.unknown().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type PendingOrder = z.infer<typeof PendingOrderSchema>;

export function parsePendingOrder(data: unknown): PendingOrder {
  return PendingOrderSchema.parse(data);
}

/**
 * Normaliza estados crudos del gateway al vocabulario del dominio.
 * Regla extraída del webhook getnet: APPROVED/AUTHORIZED → completed,
 * cualquier otro no-exitoso → failed, resto → pending.
 */
export function normalizePendingOrderStatus(rawStatus: string): PendingOrderStatus {
  const s = rawStatus.trim().toUpperCase();
  if (s === 'APPROVED' || s === 'AUTHORIZED' || s === 'COMPLETED' || s === 'SUCCESS') {
    return 'completed';
  }
  if (
    s === 'FAILED' ||
    s === 'FAILURE' ||
    s === 'REJECTED' ||
    s === 'CANCELLED' ||
    s === 'CANCELED' ||
    s === 'EXPIRED'
  ) {
    return 'failed';
  }
  if (s === 'PENDING' || s === '') return 'pending';
  return 'failed';
}

export function isOrderCompleted(order: Pick<PendingOrder, 'status'>): boolean {
  return order.status === 'completed';
}
