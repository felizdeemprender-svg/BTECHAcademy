/**
 * Comercio — Aprobar/rechazar transferencia (F0.2).
 * Lógica 1:1 con `api/payments/transfer/approve`: ownership por
 * `mentorId` del body, idempotencia por `status`, inscripción con
 * el mismo flujo que Mercado Pago al aprobar.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import {
  conflict,
  forbidden,
  notFound,
  validationError,
  type DomainError,
} from '@/domain/shared/errors';

import type { TransferOrderRepository } from '../transfer-order-repository';
import type { EnrollmentService } from '../payment-ports';

export const ApproveTransferInputSchema = z.object({
  orderId: z.string().nullish(),
  action: z.string().nullish(),
  mentorId: z.string().nullish(),
});
export type ApproveTransferInput = z.infer<typeof ApproveTransferInputSchema>;

export interface ApproveTransferDeps {
  readonly transfers: TransferOrderRepository;
  readonly enrollment: EnrollmentService;
}

export type ApproveTransferResult =
  | { readonly status: 'rejected' }
  | { readonly status: 'approved'; readonly enrollmentId?: string };

export async function approveTransfer(
  deps: ApproveTransferDeps,
  rawInput: unknown,
): Promise<Result<ApproveTransferResult, DomainError>> {
  const parsed = ApproveTransferInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('orderId, action y mentorId son obligatorios'));
  }
  const { orderId, action, mentorId } = parsed.data;

  if (!orderId || !action || !mentorId) {
    return err(validationError('orderId, action y mentorId son obligatorios'));
  }

  if (!['approve', 'reject'].includes(action)) {
    return err(validationError('action debe ser approve o reject'));
  }

  const order = await deps.transfers.findById(orderId);
  if (!order) {
    return err(notFound('Orden no encontrada'));
  }

  if (order.mentorId !== mentorId) {
    return err(forbidden('No autorizado'));
  }

  if (order.status !== 'pending') {
    return err(conflict(`Esta orden ya fue procesada (estado: ${order.status})`));
  }

  if (action === 'reject') {
    await deps.transfers.markRejected(orderId);
    return ok({ status: 'rejected' });
  }

  const externalReference = JSON.stringify({
    pageId: order.pageId,
    studentEmail: order.studentEmail,
    studentName: order.studentName,
    mentorId: order.mentorId,
    referidoId: (order.referidoId as string | null | undefined) || null,
  });

  const result = await deps.enrollment.completeEnrollment({
    paymentId: orderId,
    externalReference,
    status: 'approved',
  });

  await deps.transfers.markApproved(orderId, result.enrollmentId || null);
  return ok({ status: 'approved', enrollmentId: result.enrollmentId });
}
