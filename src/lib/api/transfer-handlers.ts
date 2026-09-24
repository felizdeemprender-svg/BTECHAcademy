/**
 * API — Handlers testeables de transferencias (F0.2).
 * Rutas públicas por contrato legacy (caller siempre null; se
 * mantiene el parámetro para la firma `(gateway, caller, ...)`).
 * Bodies/status exactos del legacy; el notifier se inyecta en tests.
 */
import { NextResponse } from 'next/server';

import { FirestorePaymentMethodRepository } from '@/data/firestore/payment-method-repo';
import { FirestoreSalesPageLookup } from '@/data/firestore/sales-lookup-repo';
import { FirestoreTransferOrderRepository } from '@/data/firestore/transfer-order-repo';
import {
  LegacyEnrollmentService,
  LegacyTransferNotifier,
} from '@/data/payments/legacy-payment-services';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import type { EnrollmentService, TransferNotifier } from '@/domain/commerce/payment-ports';
import { approveTransfer, initiateTransfer } from '@/domain/commerce/use-cases';

import type { Caller } from './mentor-auth';
import { legacyErrorResponse } from './payment-handlers';

export interface TransferHandlerDeps {
  readonly enrollment?: EnrollmentService;
  readonly notifier?: TransferNotifier;
  /** Solo tests/determinismo. Por defecto, `Date.now()` (igual que el legacy). */
  readonly nowMs?: number;
}

export async function handleInitiateTransfer(
  gateway: FirestoreGateway,
  _caller: Caller | null,
  body: unknown,
  deps?: TransferHandlerDeps,
): Promise<NextResponse> {
  try {
    const result = await initiateTransfer(
      {
        pages: new FirestoreSalesPageLookup(gateway),
        payments: new FirestorePaymentMethodRepository(gateway),
        transfers: new FirestoreTransferOrderRepository(gateway),
        notifier: deps?.notifier ?? new LegacyTransferNotifier(),
        nowMs: deps?.nowMs,
      },
      body,
    );
    if (!result.ok) return legacyErrorResponse(result.error);
    const { orderId, referenceCode, bankDetails, amount } = result.value;
    return NextResponse.json({ success: true, orderId, referenceCode, bankDetails, amount });
  } catch (error: unknown) {
    console.error('[TransferInitiate] Error:', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error interno del servidor', details }, { status: 500 });
  }
}

export async function handleApproveTransfer(
  gateway: FirestoreGateway,
  _caller: Caller | null,
  body: unknown,
  deps?: TransferHandlerDeps,
): Promise<NextResponse> {
  try {
    const result = await approveTransfer(
      {
        transfers: new FirestoreTransferOrderRepository(gateway),
        enrollment: deps?.enrollment ?? new LegacyEnrollmentService(),
      },
      body,
    );
    if (!result.ok) return legacyErrorResponse(result.error);
    if (result.value.status === 'rejected') {
      return NextResponse.json({ success: true, status: 'rejected' });
    }
    return NextResponse.json({
      success: true,
      status: 'approved',
      enrollmentId: result.value.enrollmentId,
    });
  } catch (error: unknown) {
    console.error('[TransferApprove] Error:', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error interno del servidor', details }, { status: 500 });
  }
}
