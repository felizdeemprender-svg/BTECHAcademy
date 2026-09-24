/**
 * Comercio — Iniciar transferencia (F0.2).
 * Lógica 1:1 con `api/payments/transfer/initiate`: crea la orden
 * pendiente y notifica (emails no críticos con try/catch).
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';

import type { SalesPageLookup } from '../sales-page-lookup';
import type { PaymentMethodRepository } from '../payment-method-repository';
import type { TransferOrderRepository } from '../transfer-order-repository';
import type { TransferNotifier } from '../payment-ports';
import { legacyHttpError } from './legacy-response';

export const InitiateTransferInputSchema = z.object({
  pageId: z.string().nullish(),
  studentEmail: z.string().nullish(),
  studentName: z.string().nullish(),
  referidoId: z.string().nullish(),
});
export type InitiateTransferInput = z.infer<typeof InitiateTransferInputSchema>;

export interface InitiateTransferDeps {
  readonly pages: SalesPageLookup;
  readonly payments: PaymentMethodRepository;
  readonly transfers: TransferOrderRepository;
  readonly notifier: TransferNotifier;
  /** Solo tests/determinismo. Por defecto, `Date.now()` (igual que el legacy). */
  readonly nowMs?: number;
}

export interface InitiateTransferResult {
  readonly orderId: string;
  readonly referenceCode: string;
  readonly bankDetails: { alias: string; cbu: string; bankName: string; titularName: string };
  readonly amount: number;
}

export async function initiateTransfer(
  deps: InitiateTransferDeps,
  rawInput: unknown,
): Promise<Result<InitiateTransferResult, DomainError>> {
  const parsed = InitiateTransferInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(validationError('pageId y studentEmail son obligatorios'));
  }
  const { pageId, studentEmail, studentName, referidoId } = parsed.data;

  if (!pageId || !studentEmail) {
    return err(validationError('pageId y studentEmail son obligatorios'));
  }

  const normalizedEmail = studentEmail.toLowerCase().trim();

  const page = await deps.pages.findById(pageId);
  if (!page) {
    return err(notFound('Página no encontrada'));
  }
  const mentorId = typeof page.mentorId === 'string' ? page.mentorId : '';
  const price = typeof page.price === 'number' ? page.price : 0;
  const pageTitle = typeof page.title === 'string' ? page.title : 'Curso';
  if (!mentorId) {
    return err(notFound('Página sin mentor asignado'));
  }

  const method = await deps.payments.findTutorMethodByType(mentorId, 'transfer');
  if (!method) {
    return err(
      legacyHttpError(412, {
        error: 'El tutor no tiene un método de transferencia activo configurado.',
      }),
    );
  }

  const config = method.config ?? {};
  const bankDetails = {
    alias: typeof config.alias === 'string' ? config.alias : '',
    cbu: typeof config.cbu === 'string' ? config.cbu : '',
    bankName: typeof config.bankName === 'string' ? config.bankName : '',
    titularName: typeof config.titularName === 'string' ? config.titularName : '',
  };

  const profile = await deps.payments.getMentorProfile(mentorId);
  const mentorEmail = typeof profile?.email === 'string' ? profile.email : '';
  const mentorName =
    typeof profile?.displayName === 'string' && profile.displayName.length > 0
      ? profile.displayName
      : 'Tu tutor';

  const nowMs = deps.nowMs ?? Date.now();
  const orderId = `txfr_${pageId.substring(0, 6)}_${nowMs}`;
  const referenceCode = `${normalizedEmail.split('@')[0]?.toUpperCase()}-${orderId.slice(-6).toUpperCase()}`;
  const resolvedStudentName = studentName || normalizedEmail.split('@')[0] || '';

  await deps.transfers.create({
    id: orderId,
    pageId,
    pageTitle,
    mentorId,
    mentorEmail,
    studentEmail: normalizedEmail,
    studentName: resolvedStudentName,
    amount: price,
    bankDetails,
    referenceCode,
    referidoId: referidoId || null,
    status: 'pending',
  });

  try {
    await deps.notifier.sendStudentNotice({
      studentEmail: normalizedEmail,
      studentName: resolvedStudentName,
      courseTitle: pageTitle,
      amount: price,
      bankDetails,
      referenceCode,
      mentorName,
      mentorEmail,
    });
    await deps.notifier.sendMentorNotice({
      mentorEmail,
      mentorName,
      studentName: resolvedStudentName,
      studentEmail: normalizedEmail,
      courseTitle: pageTitle,
      amount: price,
      referenceCode,
    });
  } catch (emailErr) {
    console.error('[TransferInitiate] Error al enviar emails (no crítico):', emailErr);
  }

  return ok({ orderId, referenceCode, bankDetails, amount: price });
}
