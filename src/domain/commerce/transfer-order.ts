/**
 * Comercio — Orden de transferencia (colección `transferOrders`).
 * Flujo manual: 'pending' → 'approved' | 'rejected' (vía API + emails).
 */
import { z } from 'zod';

import { EmailSchema } from './email';

export const TransferStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type TransferStatus = z.infer<typeof TransferStatusSchema>;

export const BankDetailsSchema = z.object({
  alias: z.string().default(''),
  cbu: z.string().default(''),
  bankName: z.string().default(''),
  titularName: z.string().default(''),
});
export type BankDetails = z.infer<typeof BankDetailsSchema>;

export const TransferOrderSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  pageId: z.string().min(1, 'pageId vacío'),
  pageTitle: z.string().default(''),
  mentorId: z.string().min(1, 'mentorId vacío'),
  mentorEmail: EmailSchema,
  studentEmail: EmailSchema,
  studentName: z.string().min(1, 'nombre vacío'),
  amount: z.number().min(0),
  bankDetails: BankDetailsSchema,
  referenceCode: z.string().min(1, 'código vacío'),
  referidoId: z.string().nullable().optional(),
  status: TransferStatusSchema,
  approvedBy: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type TransferOrder = z.infer<typeof TransferOrderSchema>;

export function parseTransferOrder(data: unknown): TransferOrder {
  return TransferOrderSchema.parse(data);
}

export function isTransferPending(order: Pick<TransferOrder, 'status'>): boolean {
  return order.status === 'pending';
}

/** Decisiones inmutables: devuelven una orden nueva. */
export function approveTransfer(order: TransferOrder, approvedBy: string): TransferOrder {
  return { ...order, status: 'approved', approvedBy };
}

export function rejectTransfer(order: TransferOrder, approvedBy: string): TransferOrder {
  return { ...order, status: 'rejected', approvedBy };
}
