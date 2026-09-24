import { NextResponse } from 'next/server';
import { FirestoreGateway } from '@/data/firestore/gateway';
import { FirestoreSubscriptionRepository } from '@/data/firestore/subscription-repo';
import { handleGatewayEvent, GatewayEventInput, GatewayEnrollmentPort, GatewaySubscriptionActivationPort } from '@/domain/identity/use-cases';
import { ExternalBillingGateway, SubscriptionNotifier } from '@/domain/identity/subscription-ports';

export interface StripeWebhookDeps {
  readonly notifier?: SubscriptionNotifier;
  readonly billing?: ExternalBillingGateway;
  readonly enrollment?: GatewayEnrollmentPort;
  readonly subscriptionActivation?: GatewaySubscriptionActivationPort;
  readonly now?: Date;
}

// Dummy resolvePorts for illustration, ideally this should be imported from a DI container or config
function resolvePorts(deps?: StripeWebhookDeps): any {
  return {
    notifier: deps?.notifier,
    billing: deps?.billing,
  };
}

export async function processStripeWebhook(
  gateway: FirestoreGateway,
  event: unknown,
  deps?: StripeWebhookDeps,
): Promise<NextResponse> {
  try {
    const typed = event as { type: string; data: { object: Record<string, unknown> } };
    console.log(`[Stripe Webhook Domain] Recibido evento: ${typed.type}`);
    const repo = new FirestoreSubscriptionRepository(gateway);
    let input: GatewayEventInput | null = null;

    switch (typed.type) {
      case 'checkout.session.completed': {
        const session = typed.data.object as {
          mode?: string;
          subscription?: unknown;
          metadata?: Record<string, string>;
        };
        const meta = session.metadata || {};
        if (session.mode === 'subscription' && session.subscription && meta.mentorId) {
          const subId =
            typeof session.subscription === 'string' ? session.subscription : (session.subscription as { id: string }).id;
          input = {
            provider: 'stripe',
            eventType: typed.type,
            tutorId: meta.mentorId,
            subscriptionId: subId,
          };
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = typed.data.object as { subscription?: unknown; lines?: { data?: { period?: { end?: number } }[] } };
        if (invoice.subscription) {
          const subId =
            typeof invoice.subscription === 'string'
              ? invoice.subscription
              : (invoice.subscription as { id: string }).id;
          const nextBillingDate = new Date(
            ((invoice.lines?.data?.[0]?.period?.end || Date.now() / 1000 + 2592000) as number) * 1000,
          );
          input = {
            provider: 'stripe',
            eventType: typed.type,
            gatewaySubscriptionId: subId,
            nextBillingDate,
            now: deps?.now,
          };
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = typed.data.object as { subscription?: unknown };
        if (invoice.subscription) {
          const subId =
            typeof invoice.subscription === 'string'
              ? invoice.subscription
              : (invoice.subscription as { id: string }).id;
          input = {
            provider: 'stripe',
            eventType: typed.type,
            gatewaySubscriptionId: subId,
            now: deps?.now,
          };
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = typed.data.object as { id: string };
        input = {
          provider: 'stripe',
          eventType: typed.type,
          gatewaySubscriptionId: subscription.id,
          now: deps?.now,
        };
        break;
      }
      default:
        break;
    }

    if (input) {
      const result = await handleGatewayEvent(
        repo,
        resolvePorts(deps),
        { enrollment: deps?.enrollment, subscriptionActivation: deps?.subscriptionActivation },
        input,
      );
      if (!result.ok) throw new Error(result.error.message);
    }
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[Stripe Webhook Domain] Error crítico:', error);
    return NextResponse.json({ error: 'Fallo interno' }, { status: 500 });
  }
}
