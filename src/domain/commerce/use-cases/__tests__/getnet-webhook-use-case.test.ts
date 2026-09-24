import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processGetnetWebhook } from '../getnet-webhook-use-case';
import { FirestoreGateway } from '@/data/firestore/gateway';
import * as identityUseCases from '@/domain/identity/use-cases';

vi.mock('@/domain/identity/use-cases', () => ({
  handleGatewayEvent: vi.fn().mockResolvedValue({ ok: true, value: { kind: 'order-updated' } })
}));

describe('Getnet Webhook Use Case', () => {
  let mockGateway: any;
  const mockDeps = {
    now: new Date('2026-09-16T12:00:00Z')
  };

  beforeEach(() => {
    mockGateway = {};
    vi.clearAllMocks();
  });

  it('should process a successful payment event and return 200', async () => {
    const input = { status: 'APPROVED', orderId: 'ORD_123', paymentId: 'PAY_123', payload: {} };
    
    const response = await processGetnetWebhook(mockGateway as unknown as FirestoreGateway, input, mockDeps);
    
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true });

    expect(identityUseCases.handleGatewayEvent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      {
        provider: 'getnet',
        eventType: 'APPROVED',
        orderId: 'ORD_123',
        paymentId: 'PAY_123',
        status: 'APPROVED',
        payload: {},
        now: mockDeps.now
      }
    );
  });

  it('should return 400 when validation fails', async () => {
    vi.mocked(identityUseCases.handleGatewayEvent).mockResolvedValueOnce({
      ok: false,
      error: { code: 'VALIDATION', message: 'Missing orderId' }
    });

    const input = { status: 'APPROVED' };
    const response = await processGetnetWebhook(mockGateway as unknown as FirestoreGateway, input, mockDeps);
    
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toEqual({ error: 'Missing orderId' });
  });

  it('should return 404 when order is not found', async () => {
    vi.mocked(identityUseCases.handleGatewayEvent).mockResolvedValueOnce({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Order ORD_999 not found' }
    });

    const input = { status: 'APPROVED', orderId: 'ORD_999' };
    const response = await processGetnetWebhook(mockGateway as unknown as FirestoreGateway, input, mockDeps);
    
    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json).toEqual({ error: 'Order ORD_999 not found' });
  });

  it('should return 500 when an unexpected error occurs', async () => {
    vi.mocked(identityUseCases.handleGatewayEvent).mockRejectedValueOnce(new Error('Internal explosion'));

    const input = { status: 'APPROVED', orderId: 'ORD_123' };
    const response = await processGetnetWebhook(mockGateway as unknown as FirestoreGateway, input, mockDeps);
    
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json).toEqual({ error: 'Error procesando webhook' });
  });
});
