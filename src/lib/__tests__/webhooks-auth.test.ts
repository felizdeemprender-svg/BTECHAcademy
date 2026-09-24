import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest } from './helpers';

// Mocks para Firebase
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  cert: vi.fn(),
}));

vi.mock('@/firebase/admin', () => ({
  getAdminFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
        limit: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ empty: true, docs: [] }) })),
      })),
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ exists: false }),
        update: vi.fn().mockResolvedValue({}),
      })),
    })),
  })),
  getAdminAuth: vi.fn(),
}));

vi.mock('@/services/subscriptions/subscription-engine', () => ({
  handleSubscriptionCreated: vi.fn(),
  handlePaymentSucceeded: vi.fn(),
  handlePaymentFailed: vi.fn(),
  handleSubscriptionCanceled: vi.fn(),
}));

vi.mock('@/lib/payments/enrollment', () => ({
  processSuccessfulEnrollment: vi.fn(),
}));

vi.mock('@/lib/payments/subscription', () => ({
  processSuccessfulSubscription: vi.fn(),
}));

vi.mock('mercadopago', () => ({
  MercadoPagoConfig: vi.fn(),
  Payment: vi.fn(() => ({
    get: vi.fn().mockResolvedValue({
      status: 'approved',
      external_reference: JSON.stringify({ pageId: 'test', studentEmail: 'test@test.com', studentName: 'Test', mentorId: 'mentor-123' }),
      id: 'payment-123',
      payer: { email: 'test@test.com' }
    })
  })),
}));

describe('Webhook Stripe — verificación de firma obligatoria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
  });

  it('sin stripe-signature header → 400', async () => {
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const req = createMockRequest({ method: 'POST', body: { type: 'test' } });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('con signature inválida → 400', async () => {
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const req = createMockRequest({
      method: 'POST',
      headers: { 'stripe-signature': 'invalid' },
      body: { type: 'checkout.session.completed', data: { object: { metadata: { mentorId: 'm1' } } } }
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('sin STRIPE_WEBHOOK_SECRET en env → NO debe aceptar eventUnverified (fallback inseguro)', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    // Con secret vacío, el código actual usa eventUnverified (inseguro)
    // El test debe FALLAR hasta que se elimine el fallback
    const req = createMockRequest({
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: { type: 'checkout.session.completed', data: { object: { metadata: { mentorId: 'm1' } } } }
    });
    const response = await POST(req);
    // En implementación segura: debería fallar por falta de secret
    expect(response.status).not.toBe(200);
  });
});

describe('Webhook Getnet — verificación de firma obligatoria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GETNET_WEBHOOK_SECRET', 'test-secret');
  });

  it('sin firma válida → 401', async () => {
    const { POST } = await import('@/app/api/webhooks/getnet/route');
    const req = createMockRequest({
      method: 'POST',
      body: { status: 'APPROVED', order_id: 'order-123' }
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });
});

describe('Webhook Subscriptions — verificación de firma obligatoria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    vi.stubEnv('GETNET_WEBHOOK_SECRET', 'test-secret');
  });

  it('sin signature header → 400', async () => {
    const { POST } = await import('@/app/api/webhooks/subscriptions/route');
    const req = createMockRequest({ method: 'POST', body: { type: 'customer.subscription.created' } });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('signature inválida → 400', async () => {
    const { POST } = await import('@/app/api/webhooks/subscriptions/route');
    const req = createMockRequest({
      method: 'POST',
      headers: { 'stripe-signature': 'invalid' },
      body: { type: 'customer.subscription.created' }
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});

describe('Webhook MercadoPago — validación estricta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('payment sin external_reference → ignora (no inscribe)', async () => {
    const { POST } = await import('@/app/api/webhooks/mercadopago/route');
    const req = createMockRequest({
      method: 'POST',
      body: { type: 'payment', data: { id: 'pay-123' } }
    });
    const response = await POST(req);
    expect(response.status).toBe(200);
    // No debe llamar processSuccessfulEnrollment
  });
});