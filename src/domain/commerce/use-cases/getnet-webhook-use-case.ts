import { NextResponse } from 'next/server';
import { FirestoreGateway } from '@/data/firestore/gateway';
import { FirestoreSubscriptionRepository } from '@/data/firestore/subscription-repo';
import { handleGatewayEvent, GatewayEnrollmentPort, GatewaySubscriptionActivationPort, GatewayPendingOrderStore } from '@/domain/identity/use-cases';
import { ExternalBillingGateway, SubscriptionNotifier } from '@/domain/identity/subscription-ports';
import { LegacyEnrollmentService } from '@/data/payments/legacy-payment-services';

export interface GetnetWebhookDeps {
  readonly notifier?: SubscriptionNotifier;
  readonly billing?: ExternalBillingGateway;
  readonly enrollment?: GatewayEnrollmentPort;
  readonly subscriptionActivation?: GatewaySubscriptionActivationPort;
  readonly pendingOrders?: GatewayPendingOrderStore;
  readonly now?: Date;
}

// Dummy resolvePorts for illustration
function resolvePorts(deps?: GetnetWebhookDeps): any {
  return {
    notifier: deps?.notifier,
    billing: deps?.billing,
  };
}

class FirestorePendingOrderStore implements GatewayPendingOrderStore {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findById(orderId: string) {
    const snap = await this.gateway.getDoc('pending_orders', orderId);
    if (!snap) return null;
    const raw = snap.data() ?? {};
    return {
      id: snap.id,
      status: raw.status,
      landingId: raw.landingId,
      buyerEmail: raw.buyerEmail,
      buyerName: raw.buyerName,
      tutorId: raw.tutorId,
      referidoId: raw.referidoId,
    };
  }

  async markCompleted(orderId: string): Promise<void> {
    await this.gateway.updateDoc('pending_orders', orderId, {
      status: 'completed',
      updatedAt: new Date(),
    });
  }

  async markFailed(orderId: string, status: string, payload: unknown): Promise<void> {
    await this.gateway.updateDoc('pending_orders', orderId, {
      status,
      updatedAt: new Date(),
      lastPayload: payload,
    });
  }
}

export async function processGetnetWebhook(
  gateway: FirestoreGateway,
  input: { status?: string; orderId?: string; paymentId?: string; payload?: unknown },
  deps?: GetnetWebhookDeps,
): Promise<NextResponse> {
  try {
    const repo = new FirestoreSubscriptionRepository(gateway);
    const result = await handleGatewayEvent(
      repo,
      resolvePorts(deps),
      {
        enrollment: deps?.enrollment ?? new LegacyEnrollmentService(),
        subscriptionActivation: deps?.subscriptionActivation,
        pendingOrders: deps?.pendingOrders ?? new FirestorePendingOrderStore(gateway),
      },
      {
        provider: 'getnet',
        eventType: input.status ?? '',
        orderId: input.orderId,
        paymentId: input.paymentId,
        status: input.status,
        payload: input.payload,
        now: deps?.now,
      },
    );
    if (!result.ok) {
      if (result.error.code === 'VALIDATION') {
        return NextResponse.json({ error: result.error.message }, { status: 400 });
      }
      if (result.error.code === 'NOT_FOUND') {
        console.error('[Getnet Webhook Domain] Orden no encontrada:', input.orderId);
        return NextResponse.json({ error: result.error.message }, { status: 404 });
      }
      throw new Error(result.error.message);
    }
    if (result.value.kind === 'order-updated') {
      console.log(`[Getnet Webhook Domain] Orden ${input.orderId} actualizada con status: ${input.status}`);
    }
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[Getnet Webhook Domain Error]', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}
