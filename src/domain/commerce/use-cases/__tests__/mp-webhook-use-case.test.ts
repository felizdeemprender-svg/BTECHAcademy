import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processMercadoPagoWebhook } from '../mp-webhook-use-case';
import { FirestoreGateway } from '@/data/firestore/gateway';

describe('Mercado Pago Webhook Use Case', () => {
  let mockGateway: any;
  let mockProvider: any;
  let mockSubscriptionActivation: any;
  let mockEnrollment: any;

  beforeEach(() => {
    mockGateway = {
      queryByTwoFields: vi.fn().mockResolvedValue({
        docs: [{ data: () => ({ config: { accessToken: 'TEST_ACCESS_TOKEN' } }) }]
      })
    };
    
    mockProvider = {
      getPayment: vi.fn()
    };
    
    mockSubscriptionActivation = {
      activateSubscription: vi.fn().mockResolvedValue({ success: true })
    };
    
    mockEnrollment = {
      completeEnrollment: vi.fn().mockResolvedValue({ success: true })
    };
  });

  it('should ignore non-payment events', async () => {
    const input = { type: 'test_event', dataId: '123' };
    const response = await processMercadoPagoWebhook(mockGateway as unknown as FirestoreGateway, input);
    
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true });
    expect(mockProvider.getPayment).not.toHaveBeenCalled();
  });

  it('should process a tutor subscription (planId present)', async () => {
    const input = { type: 'payment', dataId: 'PAY_123' };
    mockProvider.getPayment.mockResolvedValue({
      id: 'PAY_123',
      status: 'approved',
      externalReference: JSON.stringify({
        userId: 'USER_1',
        planId: 'PLAN_1',
        leadData: { email: 'tutor@test.com', firstName: 'John', lastName: 'Doe' },
        isUpgrade: true
      })
    });

    const response = await processMercadoPagoWebhook(
      mockGateway as unknown as FirestoreGateway, 
      input, 
      { provider: mockProvider, subscriptionActivation: mockSubscriptionActivation }
    );
    
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true });
    
    expect(mockProvider.getPayment).toHaveBeenCalledWith('TEST_ACCESS_TOKEN', 'PAY_123');
    expect(mockSubscriptionActivation.activateSubscription).toHaveBeenCalledWith({
      paymentId: 'PAY_123',
      planId: 'PLAN_1',
      status: 'approved',
      userId: 'USER_1',
      email: 'tutor@test.com',
      displayName: 'John Doe',
      isUpgrade: true
    });
    expect(mockEnrollment.completeEnrollment).not.toHaveBeenCalled();
  });

  it('should process a student enrollment (pageId present)', async () => {
    const input = { type: 'payment', dataId: 'PAY_456' };
    const extRef = JSON.stringify({ pageId: 'PAGE_1' });
    mockProvider.getPayment.mockResolvedValue({
      id: 'PAY_456',
      status: 'approved',
      externalReference: extRef
    });

    const response = await processMercadoPagoWebhook(
      mockGateway as unknown as FirestoreGateway, 
      input, 
      { provider: mockProvider, enrollment: mockEnrollment }
    );
    
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true });
    
    expect(mockEnrollment.completeEnrollment).toHaveBeenCalledWith({
      paymentId: 'PAY_456',
      externalReference: extRef,
      status: 'approved'
    });
    expect(mockSubscriptionActivation.activateSubscription).not.toHaveBeenCalled();
  });

  it('should ignore payment if externalReference is missing', async () => {
    const input = { type: 'payment', dataId: 'PAY_789' };
    mockProvider.getPayment.mockResolvedValue({
      id: 'PAY_789',
      status: 'approved',
      externalReference: null
    });

    const response = await processMercadoPagoWebhook(
      mockGateway as unknown as FirestoreGateway, 
      input, 
      { provider: mockProvider }
    );
    
    expect(response.status).toBe(200);
    expect(mockSubscriptionActivation.activateSubscription).not.toHaveBeenCalled();
    expect(mockEnrollment.completeEnrollment).not.toHaveBeenCalled();
  });
});
