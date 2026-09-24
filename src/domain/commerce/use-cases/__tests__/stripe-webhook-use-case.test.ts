import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processStripeWebhook } from '../stripe-webhook-use-case';
import { FirestoreGateway } from '@/data/firestore/gateway';
import * as identityUseCases from '@/domain/identity/use-cases';

vi.mock('@/domain/identity/use-cases', () => ({
  handleGatewayEvent: vi.fn().mockResolvedValue({ ok: true })
}));

describe('Stripe Webhook Use Case', () => {
  let mockGateway: any;
  const mockDeps = {
    now: new Date('2026-09-16T12:00:00Z')
  };

  beforeEach(() => {
    mockGateway = {};
    vi.clearAllMocks();
  });

  it('should ignore unhandled event types', async () => {
    const event = { type: 'unknown.event', data: { object: {} } };
    const response = await processStripeWebhook(mockGateway as unknown as FirestoreGateway, event, mockDeps);
    
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true });
    expect(identityUseCases.handleGatewayEvent).not.toHaveBeenCalled();
  });

  it('should handle checkout.session.completed for subscriptions', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'subscription',
          subscription: 'sub_123',
          metadata: { mentorId: 'MENTOR_1' }
        }
      }
    };

    const response = await processStripeWebhook(mockGateway as unknown as FirestoreGateway, event, mockDeps);
    
    expect(response.status).toBe(200);
    expect(identityUseCases.handleGatewayEvent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      {
        provider: 'stripe',
        eventType: 'checkout.session.completed',
        tutorId: 'MENTOR_1',
        subscriptionId: 'sub_123'
      }
    );
  });

  it('should handle invoice.paid', async () => {
    const nextMonth = new Date('2026-10-16T12:00:00Z').getTime() / 1000;
    const event = {
      type: 'invoice.paid',
      data: {
        object: {
          subscription: 'sub_456',
          lines: {
            data: [{ period: { end: nextMonth } }]
          }
        }
      }
    };

    const response = await processStripeWebhook(mockGateway as unknown as FirestoreGateway, event, mockDeps);
    
    expect(response.status).toBe(200);
    expect(identityUseCases.handleGatewayEvent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      {
        provider: 'stripe',
        eventType: 'invoice.paid',
        gatewaySubscriptionId: 'sub_456',
        nextBillingDate: new Date(nextMonth * 1000),
        now: mockDeps.now
      }
    );
  });

  it('should handle customer.subscription.deleted', async () => {
    const event = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_789'
        }
      }
    };

    const response = await processStripeWebhook(mockGateway as unknown as FirestoreGateway, event, mockDeps);
    
    expect(response.status).toBe(200);
    expect(identityUseCases.handleGatewayEvent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      {
        provider: 'stripe',
        eventType: 'customer.subscription.deleted',
        gatewaySubscriptionId: 'sub_789',
        now: mockDeps.now
      }
    );
  });
});
