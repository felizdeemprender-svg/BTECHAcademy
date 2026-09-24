/**
 * API — Handlers testeables de billing: cancel, reporte y cron (F0.3).
 * Firma `(gateway, caller, ...args)`; puertos inyectables para tests.
 * Responden con los bodies/status exactos del legacy (NO `toApiResponse`:
 * los envelopes históricos usan mensajes propios). Auth:
 * - cancel: cualquier Bearer válido (tutor propio, igual que el legacy);
 * - reporte: SIN auth (igual que `GET api/admin/billing` legacy);
 * - cron: admin o CRON_SECRET, verificado en el borde del route.
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { FirestoreSubscriptionRepository } from '@/data/firestore/subscription-repo';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import type { ExternalBillingGateway } from '@/domain/identity/subscription-ports';
import type { DomainError } from '@/domain/shared/errors';
import {
  buildBillingReport,
  cancelSubscription,
} from '@/domain/identity/use-cases';
import {
  runDueBilling,
  type MonthlyCharge,
} from '@/domain/identity/use-cases/process-due-billing';
import { chargeTutorMonthlyBill } from '@/services/payments/orchestrator';

import type { Caller } from './mentor-auth';

export interface BillingHandlerDeps {
  readonly billing?: ExternalBillingGateway;
  readonly charge?: MonthlyCharge;
  /** Solo tests/determinismo. Por defecto, `new Date()` en los use-cases. */
  readonly now?: Date;
}

function productionBilling(): ExternalBillingGateway {
  return {
    cancelExternalSubscription: async (gateway, subscriptionId) => {
      if (gateway !== 'stripe') return;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2024-06-20' as never,
      });
      await stripe.subscriptions.cancel(subscriptionId);
    },
  };
}

function productionCharge(): MonthlyCharge {
  return {
    chargeMonthlyBill: async ({ customerId, amount, currency, description }) => {
      const result = await chargeTutorMonthlyBill(customerId, amount, currency, description);
      return result.success ? { success: true } : { success: false, error: result.error };
    },
  };
}

/** 404/400 legacy desde el dominio; resto → 500 con el cuerpo de cada ruta. */
function domainErrorStatus(error: DomainError): 400 | 404 | 500 {
  if (error.code === 'VALIDATION') return 400;
  if (error.code === 'NOT_FOUND') return 404;
  return 500;
}

export async function handleCancelSubscription(
  gateway: FirestoreGateway,
  caller: Caller | null,
  deps?: BillingHandlerDeps,
): Promise<NextResponse> {
  if (!caller) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const repo = new FirestoreSubscriptionRepository(gateway);
    const result = await cancelSubscription(
      repo,
      { billing: deps?.billing ?? productionBilling() },
      { tutorId: caller.uid, now: deps?.now },
    );
    if (!result.ok) {
      const status = domainErrorStatus(result.error);
      if (status === 404) return NextResponse.json({ error: result.error.message }, { status });
      return NextResponse.json({ error: 'Fallo interno al cancelar suscripción' }, { status: 500 });
    }
    if (result.value.localOnly) {
      return NextResponse.json({ success: true, message: 'Cancelada localmente (sin pasarela)' });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Cancel Subscription] Error:', error);
    return NextResponse.json({ error: 'Fallo interno al cancelar suscripción' }, { status: 500 });
  }
}

export async function handleBillingReport(
  gateway: FirestoreGateway,
  _caller: Caller | null,
  query: { from?: string; to?: string },
  deps?: BillingHandlerDeps,
): Promise<NextResponse> {
  try {
    const repo = new FirestoreSubscriptionRepository(gateway);
    const result = await buildBillingReport(repo, { ...query, now: deps?.now });
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Failed to generate billing report', details: result.error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(result.value);
  } catch (error) {
    console.error('[/api/admin/billing] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate billing report',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function handleBillingCron(
  gateway: FirestoreGateway,
  _caller: Caller | null,
  deps?: BillingHandlerDeps,
): Promise<NextResponse> {
  try {
    const repo = new FirestoreSubscriptionRepository(gateway);
    const result = await runDueBilling(repo, deps?.charge ?? productionCharge(), {
      now: deps?.now,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      processed: result.value.processed,
      results: result.value.results,
    });
  } catch (error) {
    console.error('Error in billing cron job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
