/**
 * F0.2 (TDD rojo) — Use-cases de pagos con fakes en memoria.
 * Lógica 1:1 con cada route legacy (mismos mensajes, mismos códigos
 * vía `details: { status, body }`; mismos shapes de lectura/escritura).
 */
import { describe, expect, it } from 'vitest';

import type { SubscriptionRepository } from '@/domain/identity/subscription-repository';
import type {
  PaymentMethodRepository,
  MentorPaymentProfile,
  SystemPaymentMethodSnapshot,
  TutorPaymentMethodSnapshot,
} from '@/domain/commerce/payment-method-repository';
import type {
  TransferOrderCreateInput,
  TransferOrderRepository,
  TransferOrderSnapshot,
} from '@/domain/commerce/transfer-order-repository';
import type { SalesPageLookup, SalesPageSnapshot } from '@/domain/commerce/sales-page-lookup';
import type {
  BillingSetup,
  CheckoutSessions,
  CheckoutSessionParams,
  PaymentProvider,
  SubscriptionPreferenceRequest,
} from '@/domain/commerce/payment-provider';
import type {
  EnrollmentCompletionResult,
  EnrollmentService,
  TransferMentorNotice,
  TransferStudentNotice,
  TransferNotifier,
  TrialActivation,
  TrialActivator,
} from '@/domain/commerce/payment-ports';

import { createSubscriptionPreference } from '../create-subscription-preference';
import { checkoutPage } from '../checkout-page';
import { initiateTransfer } from '../initiate-transfer';
import { approveTransfer } from '../approve-transfer';
import { setupBilling } from '../setup-billing';
import { processMpPayment } from '../process-mp-payment';

/* ---------------- Fakes ---------------- */

interface PlanRow {
  name?: unknown;
  price?: unknown;
  type?: unknown;
  requiresPaymentMethod?: unknown;
  trialDays?: unknown;
}

class FakeSubscriptions implements SubscriptionRepository {
  constructor(
    public plans: Record<string, PlanRow> = {},
    public users: Record<string, { subscription?: Record<string, unknown> }> = {},
  ) {}

  async getPlan(planId: string) {
    const p = this.plans[planId];
    return p ? { id: planId, ...p } : null;
  }

  async getUserSubscription(uid: string) {
    const u = this.users[uid];
    if (!u) return null;
    return { uid, email: `${uid}@x.com`, displayName: uid, subscription: u.subscription ?? {} };
  }

  async updateSubscriptionFields(): Promise<void> {}
  async listPageIdsByStatus(): Promise<string[]> {
    return [];
  }
  async suspendPages(): Promise<number> {
    return 0;
  }
  async reactivatePages(): Promise<number> {
    return 0;
  }
  async writeInvoice(): Promise<void> {}
}

class FakePayments implements PaymentMethodRepository {
  constructor(
    public system: SystemPaymentMethodSnapshot[] = [],
    public tutor: Record<string, TutorPaymentMethodSnapshot[]> = {},
    public profiles: Record<string, MentorPaymentProfile> = {},
    public mappings: Record<string, string> = {},
  ) {}

  async findSystemMethodById(id: string) {
    return this.system.find((m) => m.id === id) ?? null;
  }

  async findFirstActiveSystemMethod() {
    return this.system.find((m) => m.isActive === true) ?? null;
  }

  async listActiveSystemMethods() {
    return this.system.filter((m) => m.isActive === true);
  }

  async findTutorMethodByType(mentorId: string, type: string) {
    return (this.tutor[mentorId] ?? []).find((m) => m.type === type && m.isActive === true) ?? null;
  }

  async listActiveTutorMethods(mentorId: string) {
    return (this.tutor[mentorId] ?? []).filter((m) => m.isActive === true);
  }

  async hasActiveTutorMethod(uid: string) {
    return (this.tutor[uid] ?? []).some((m) => m.isActive === true);
  }

  async getMentorProfile(uid: string) {
    return this.profiles[uid] ?? null;
  }

  async findMentorIdBySellerId(sellerId: string) {
    return this.mappings[sellerId] ?? null;
  }
}

class FakeTransfers implements TransferOrderRepository {
  readonly created: TransferOrderCreateInput[] = [];
  readonly rejected: string[] = [];
  readonly approved: { orderId: string; enrollmentId: string | null }[] = [];

  constructor(public orders: Record<string, TransferOrderSnapshot> = {}) {}

  async findById(orderId: string) {
    return this.orders[orderId] ?? null;
  }

  async create(input: TransferOrderCreateInput): Promise<void> {
    this.created.push(input);
    this.orders[input.id] = { ...input };
  }

  async markRejected(orderId: string): Promise<void> {
    this.rejected.push(orderId);
  }

  async markApproved(orderId: string, enrollmentId: string | null): Promise<void> {
    this.approved.push({ orderId, enrollmentId });
  }
}

class FakePages implements SalesPageLookup {
  constructor(public pages: Record<string, SalesPageSnapshot> = {}) {}

  async findById(pageId: string) {
    return this.pages[pageId] ?? null;
  }
}

class FakeProvider implements PaymentProvider {
  readonly prefs: { token: string; req: SubscriptionPreferenceRequest }[] = [];
  payments: Record<string, { externalReference?: string; status?: string }> = {};

  async createSubscriptionPreference(token: string, req: SubscriptionPreferenceRequest) {
    this.prefs.push({ token, req });
    return { id: 'pref_1', initPoint: 'https://mp/init', sandboxInitPoint: 'https://mp/sandbox' };
  }

  async getPayment(_token: string, paymentId: string) {
    const p = this.payments[paymentId];
    if (!p) return null;
    return { id: paymentId, ...p };
  }
}

class FakeSessions implements CheckoutSessions {
  readonly calls: { gateway: string; config: Record<string, unknown>; params: CheckoutSessionParams }[] = [];

  async createSession(
    gateway: string,
    config: Record<string, unknown>,
    params: CheckoutSessionParams,
  ) {
    this.calls.push({ gateway, config, params });
    return { success: true, redirectUrl: 'https://pay/x', orderId: 'ord_1' };
  }
}

class FakeBilling implements BillingSetup {
  readonly calls: { userId: string; email: string; baseUrl: string }[] = [];

  async createSetup(userId: string, email: string, baseUrl: string) {
    this.calls.push({ userId, email, baseUrl });
    return { url: `${baseUrl}/billing?ok=1`, customerId: 'cus_1' };
  }
}

class FakeEnrollment implements EnrollmentService {
  readonly calls: { paymentId: string; externalReference: string; status: string }[] = [];
  result: EnrollmentCompletionResult = { success: true, enrollmentId: 'enroll_1' };

  async completeEnrollment(input: { paymentId: string; externalReference: string; status: string }) {
    this.calls.push(input);
    return this.result;
  }
}

class FakeNotifier implements TransferNotifier {
  readonly students: TransferStudentNotice[] = [];
  readonly mentors: TransferMentorNotice[] = [];
  fail = false;

  async sendStudentNotice(n: TransferStudentNotice): Promise<void> {
    if (this.fail) throw new Error('smtp caído');
    this.students.push(n);
  }

  async sendMentorNotice(n: TransferMentorNotice): Promise<void> {
    if (this.fail) throw new Error('smtp caído');
    this.mentors.push(n);
  }
}

class FakeTrials implements TrialActivator {
  readonly calls: { tutorId: string; planId: string }[] = [];

  async activateTrial(tutorId: string, planId: string): Promise<TrialActivation> {
    this.calls.push({ tutorId, planId });
    return { trialDays: 14, trialEndsAt: new Date('2026-09-28T12:00:00Z') };
  }
}

/* ---------------- create-subscription-preference ---------------- */

describe('createSubscriptionPreference', () => {
  function base() {
    const subs = new FakeSubscriptions(
      {
        'plan-pro': { name: 'Pro', price: 100, type: 'paid', trialDays: 0 },
        'plan-free': { name: 'Free', price: 0, type: 'free', trialDays: 0 },
        'plan-trial': { name: 'Trial', price: 100, type: 'paid', trialDays: 14 },
        'plan-basic': { name: 'Basic', price: 50, type: 'paid', trialDays: 0 },
      },
      {
        tutor1: { subscription: { status: 'active', planId: 'plan-pro' } },
      },
    );
    const payments = new FakePayments([
      { id: 'sys1', type: 'mercadopago', isActive: true, config: { accessToken: 'tok_sys' } },
    ]);
    const provider = new FakeProvider();
    const trials = new FakeTrials();
    return { subs, payments, provider, trials };
  }

  it('sin planId o email → VALIDATION con mensaje legacy', async () => {
    const { subs, payments, provider, trials } = base();
    const r = await createSubscriptionPreference(
      { subscriptions: subs, payments, provider, trials },
      { planId: '', email: '' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('VALIDATION');
      expect(r.error.message).toBe('Plan ID y Email son obligatorios');
    }
  });

  it('plan inexistente → NOT_FOUND El plan no existe', async () => {
    const { subs, payments, provider, trials } = base();
    const r = await createSubscriptionPreference(
      { subscriptions: subs, payments, provider, trials },
      { planId: 'nope', email: 'a@x.com' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('NOT_FOUND');
      expect(r.error.message).toBe('El plan no existe');
    }
  });

  it('downgrade bloqueado (precio menor, no free) → 400 legacy', async () => {
    const { subs, payments, provider, trials } = base();
    const r = await createSubscriptionPreference(
      { subscriptions: subs, payments, provider, trials },
      { planId: 'plan-basic', email: 'a@x.com', userId: 'tutor1' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('VALIDATION');
      expect(r.error.message).toContain('No es posible bajar de plan');
    }
  });

  it('plan gratuito → free + trial activado si hay userId', async () => {
    const { subs, payments, provider, trials } = base();
    const r = await createSubscriptionPreference(
      { subscriptions: subs, payments, provider, trials },
      { planId: 'plan-free', email: 'a@x.com', userId: 'tutor9' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ kind: 'free' });
    expect(trials.calls).toEqual([{ tutorId: 'tutor9', planId: 'plan-free' }]);
  });

  it('trial sin método de pago → 412 required_payment_method', async () => {
    const { subs, payments, provider, trials } = base();
    const r = await createSubscriptionPreference(
      { subscriptions: subs, payments, provider, trials },
      { planId: 'plan-trial', email: 'a@x.com', userId: 'tutor9' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const d = r.error.details as { status: number; body: Record<string, unknown> };
      expect(d.status).toBe(412);
      expect(d.body.error).toBe('required_payment_method');
    }
    expect(trials.calls).toHaveLength(0);
  });

  it('trial con método activo → trial + activación', async () => {
    const { subs, payments, provider, trials } = base();
    payments.tutor.tutor9 = [{ id: 'pm1', type: 'card', isActive: true, config: {} }];
    const r = await createSubscriptionPreference(
      { subscriptions: subs, payments, provider, trials },
      { planId: 'plan-trial', email: 'a@x.com', userId: 'tutor9' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.kind).toBe('trial');
      if (r.value.kind === 'trial') expect(r.value.trialDays).toBe(14);
    }
    expect(trials.calls).toEqual([{ tutorId: 'tutor9', planId: 'plan-trial' }]);
  });

  it('cobro inmediato crea preferencia MP con external_reference legacy', async () => {
    const { subs, payments, provider, trials } = base();
    const r = await createSubscriptionPreference(
      { subscriptions: subs, payments, provider, trials },
      {
        planId: 'plan-pro',
        email: 'nuevo@x.com',
        firstName: 'Ana',
        lastName: 'López',
        appUrl: 'https://app.test',
      },
    );
    expect(r.ok).toBe(true);
    expect(provider.prefs).toHaveLength(1);
    expect(provider.prefs[0]?.token).toBe('tok_sys');
    const req = provider.prefs[0]?.req;
    expect(req?.unitPrice).toBe(100);
    expect(req?.notificationUrl).toBe('https://app.test/api/webhooks/mercadopago');
    expect(JSON.parse(req?.externalReference ?? '{}')).toEqual({
      userId: 'new_mentor',
      planId: 'plan-pro',
      isUpgrade: undefined,
      leadData: { email: 'nuevo@x.com', firstName: 'Ana', lastName: 'López' },
    });
    if (r.ok) {
      expect(r.value.kind).toBe('preference');
      if (r.value.kind === 'preference') expect(r.value.initPoint).toBe('https://mp/init');
    }
  });

  it('sin métodos del sistema → 500 legacy', async () => {
    const { subs, provider, trials } = base();
    const payments = new FakePayments([]);
    const r = await createSubscriptionPreference(
      { subscriptions: subs, payments, provider, trials },
      { planId: 'plan-pro', email: 'a@x.com' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const d = r.error.details as { status: number; body: Record<string, unknown> };
      expect(d.status).toBe(500);
      expect(d.body).toEqual({ error: 'No hay métodos de pago configurados' });
    }
  });

  it('tipo no soportado → 400; sin accessToken → 500', async () => {
    const { subs, provider, trials } = base();
    const stripe = new FakePayments([
      { id: 's1', type: 'stripe', isActive: true, config: { secretKey: 'sk' } },
    ]);
    const r1 = await createSubscriptionPreference(
      { subscriptions: subs, payments: stripe, provider, trials },
      { planId: 'plan-pro', email: 'a@x.com' },
    );
    expect(!r1.ok && r1.error.message).toBe('Método de pago no soportado');

    const noToken = new FakePayments([
      { id: 's2', type: 'mercadopago', isActive: true, config: {} },
    ]);
    const r2 = await createSubscriptionPreference(
      { subscriptions: subs, payments: noToken, provider, trials },
      { planId: 'plan-pro', email: 'a@x.com' },
    );
    expect(r2.ok).toBe(false);
    if (!r2.ok) {
      const d = r2.error.details as { status: number; body: Record<string, unknown> };
      expect(d.status).toBe(500);
      expect(d.body).toEqual({ error: 'Credenciales incompletas' });
    }
  });
});

/* ---------------- checkout-page ---------------- */

describe('checkoutPage', () => {
  function base() {
    const pages = new FakePages({
      page1: { id: 'page1', mentorId: 'mentor1', price: 5000, title: 'Curso X' },
      orphan: { id: 'orphan', price: 10, title: 'Sin mentor' },
    });
    const payments = new FakePayments(
      [],
      { mentor1: [{ id: 'pm1', type: 'mercadopago', isActive: true, config: { accessToken: 'tok_t' } }] },
      { mentor1: { uid: 'mentor1', email: 'm@x.com', displayName: 'M' } },
    );
    const sessions = new FakeSessions();
    return { pages, payments, sessions };
  }

  it('sin pageId o email → VALIDATION legacy', async () => {
    const { pages, payments, sessions } = base();
    const r = await checkoutPage({ pages, payments, sessions }, { pageId: '', studentEmail: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe('Faltan parámetros requeridos');
  });

  it('página inexistente → 404; sin mentor → 404', async () => {
    const { pages, payments, sessions } = base();
    const r1 = await checkoutPage(
      { pages, payments, sessions },
      { pageId: 'nope', studentEmail: 'a@x.com', baseUrl: 'https://b' },
    );
    expect(!r1.ok && r1.error.message).toBe('Página de venta no encontrada');
    const r2 = await checkoutPage(
      { pages, payments, sessions },
      { pageId: 'orphan', studentEmail: 'a@x.com', baseUrl: 'https://b' },
    );
    expect(!r2.ok && r2.error.message).toBe('No se encontró un mentor para esta página');
  });

  it('sin config ni legacy → 412 con mensaje legacy (gateway en mayúsculas)', async () => {
    const { pages, sessions } = base();
    const payments = new FakePayments([], {}, {});
    const r = await checkoutPage(
      { pages, payments, sessions },
      { pageId: 'page1', studentEmail: 'a@x.com', baseUrl: 'https://b' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const d = r.error.details as { status: number; body: Record<string, unknown> };
      expect(d.status).toBe(412);
      expect(d.body.error).toBe('El tutor no ha configurado MERCADOPAGO');
    }
  });

  it('con método del tutor delega a sesiones y devuelve passthrough', async () => {
    const { pages, payments, sessions } = base();
    const r = await checkoutPage(
      { pages, payments, sessions },
      {
        pageId: 'page1',
        studentEmail: 'alu@x.com',
        studentName: 'Alu',
        baseUrl: 'https://b',
      },
    );
    expect(r.ok).toBe(true);
    expect(sessions.calls).toHaveLength(1);
    expect(sessions.calls[0]?.gateway).toBe('mercadopago');
    expect(sessions.calls[0]?.config).toEqual({ accessToken: 'tok_t' });
    expect(sessions.calls[0]?.params).toMatchObject({
      pageId: 'page1',
      title: 'Curso X',
      price: 5000,
      mentorId: 'mentor1',
      baseUrl: 'https://b',
    });
    if (r.ok) expect(r.value).toEqual({ success: true, redirectUrl: 'https://pay/x', orderId: 'ord_1' });
  });

  it('usa fallback legacy profile.mercadopago cuando no hay método', async () => {
    const { pages, sessions } = base();
    const payments = new FakePayments(
      [],
      {},
      { mentor1: { uid: 'mentor1', mercadopagoConfig: { accessToken: 'tok_legacy' } } },
    );
    const r = await checkoutPage(
      { pages, payments, sessions },
      { pageId: 'page1', studentEmail: 'a@x.com', baseUrl: 'https://b' },
    );
    expect(r.ok).toBe(true);
    expect(sessions.calls[0]?.config).toEqual({ accessToken: 'tok_legacy' });
  });
});

/* ---------------- initiate-transfer ---------------- */

describe('initiateTransfer', () => {
  function base() {
    const pages = new FakePages({
      page1: { id: 'page1', mentorId: 'mentor1', price: 5000, title: 'Curso X' },
    });
    const payments = new FakePayments(
      [],
      {
        mentor1: [
          {
            id: 'pm2',
            type: 'transfer',
            isActive: true,
            config: { alias: 'A', cbu: 'C', bankName: 'B', titularName: 'T' },
          },
        ],
      },
      { mentor1: { uid: 'mentor1', email: 'mentor@x.com', displayName: 'Mentor Uno' } },
    );
    const transfers = new FakeTransfers();
    const notifier = new FakeNotifier();
    return { pages, payments, transfers, notifier };
  }

  it('sin pageId o email → VALIDATION legacy', async () => {
    const { pages, payments, transfers, notifier } = base();
    const r = await initiateTransfer(
      { pages, payments, transfers, notifier },
      { pageId: '', studentEmail: '' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe('pageId y studentEmail son obligatorios');
  });

  it('sin método de transferencia → 412 legacy', async () => {
    const { pages, transfers, notifier } = base();
    const payments = new FakePayments([], {}, {
      mentor1: { uid: 'mentor1', email: 'm@x.com', displayName: 'M' },
    });
    const r = await initiateTransfer(
      { pages, payments, transfers, notifier },
      { pageId: 'page1', studentEmail: 'Alu@X.com' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const d = r.error.details as { status: number };
      expect(d.status).toBe(412);
    }
  });

  it('crea la orden con email normalizado, bankDetails y notifica', async () => {
    const { pages, payments, transfers, notifier } = base();
    const r = await initiateTransfer(
      { pages, payments, transfers, notifier, nowMs: 1726230000000 },
      { pageId: 'page1', studentEmail: '  Alu@X.com ' },
    );
    expect(r.ok).toBe(true);
    expect(transfers.created).toHaveLength(1);
    const created = transfers.created[0];
    expect(created?.studentEmail).toBe('alu@x.com');
    expect(created?.studentName).toBe('alu');
    expect(created?.bankDetails).toEqual({ alias: 'A', cbu: 'C', bankName: 'B', titularName: 'T' });
    expect(created?.status).toBe('pending');
    expect(created?.id.startsWith('txfr_page1_')).toBe(true);
    expect(notifier.students).toHaveLength(1);
    expect(notifier.mentors).toHaveLength(1);
    if (r.ok) {
      expect(r.value.orderId).toBe(created?.id);
      expect(r.value.amount).toBe(5000);
      expect(r.value.bankDetails).toEqual(created?.bankDetails);
    }
  });

  it('emails caídos no rompen la orden (no crítico)', async () => {
    const { pages, payments, transfers, notifier } = base();
    notifier.fail = true;
    const r = await initiateTransfer(
      { pages, payments, transfers, notifier, nowMs: 1726230000000 },
      { pageId: 'page1', studentEmail: 'alu@x.com' },
    );
    expect(r.ok).toBe(true);
    expect(transfers.created).toHaveLength(1);
  });
});

/* ---------------- approve-transfer ---------------- */

describe('approveTransfer', () => {
  function base(status: unknown = 'pending') {
    const transfers = new FakeTransfers({
      tx1: {
        id: 'tx1',
        pageId: 'page1',
        studentEmail: 'alu@x.com',
        studentName: 'Alu',
        mentorId: 'mentor1',
        referidoId: null,
        status,
      },
    });
    const enrollment = new FakeEnrollment();
    return { transfers, enrollment };
  }

  it('faltantes → 400; acción inválida → 400', async () => {
    const { transfers, enrollment } = base();
    const r1 = await approveTransfer({ transfers, enrollment }, { orderId: '', action: 'approve', mentorId: '' });
    expect(!r1.ok && r1.error.message).toBe('orderId, action y mentorId son obligatorios');
    const r2 = await approveTransfer(
      { transfers, enrollment },
      { orderId: 'tx1', action: 'other', mentorId: 'mentor1' },
    );
    expect(!r2.ok && r2.error.message).toBe('action debe ser approve o reject');
  });

  it('inexistente → 404; otro mentor → 403; procesada → 409 con estado', async () => {
    const { transfers, enrollment } = base();
    const r1 = await approveTransfer({ transfers, enrollment }, { orderId: 'no', action: 'approve', mentorId: 'm' });
    expect(!r1.ok && r1.error.code).toBe('NOT_FOUND');
    const r2 = await approveTransfer(
      { transfers, enrollment },
      { orderId: 'tx1', action: 'approve', mentorId: 'otro' },
    );
    expect(!r2.ok && r2.error.code).toBe('FORBIDDEN');
    const done = base('approved');
    const r3 = await approveTransfer(
      { transfers: done.transfers, enrollment },
      { orderId: 'tx1', action: 'approve', mentorId: 'mentor1' },
    );
    expect(r3.ok).toBe(false);
    if (!r3.ok) {
      expect(r3.error.code).toBe('CONFLICT');
      expect(r3.error.message).toContain('approved');
    }
  });

  it('reject marca rejected sin inscribir', async () => {
    const { transfers, enrollment } = base();
    const r = await approveTransfer(
      { transfers, enrollment },
      { orderId: 'tx1', action: 'reject', mentorId: 'mentor1' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ status: 'rejected' });
    expect(transfers.rejected).toEqual(['tx1']);
    expect(enrollment.calls).toHaveLength(0);
  });

  it('approve inscribe con external_reference legacy y marca approved', async () => {
    const { transfers, enrollment } = base();
    const r = await approveTransfer(
      { transfers, enrollment },
      { orderId: 'tx1', action: 'approve', mentorId: 'mentor1' },
    );
    expect(r.ok).toBe(true);
    expect(enrollment.calls).toHaveLength(1);
    expect(enrollment.calls[0]?.paymentId).toBe('tx1');
    expect(enrollment.calls[0]?.status).toBe('approved');
    expect(JSON.parse(enrollment.calls[0]?.externalReference ?? '{}')).toEqual({
      pageId: 'page1',
      studentEmail: 'alu@x.com',
      studentName: 'Alu',
      mentorId: 'mentor1',
      referidoId: null,
    });
    expect(transfers.approved).toEqual([{ orderId: 'tx1', enrollmentId: 'enroll_1' }]);
    if (r.ok) expect(r.value).toEqual({ status: 'approved', enrollmentId: 'enroll_1' });
  });
});

/* ---------------- setup-billing ---------------- */

describe('setupBilling', () => {
  it('sin userId → 400; usuario inexistente → 404; ok delega con baseUrl', async () => {
    const payments = new FakePayments([], {}, {
      u1: { uid: 'u1', email: 'tutor@x.com', displayName: 'T' },
    });
    const billing = new FakeBilling();
    const deps = { payments, billing, baseUrl: 'https://app.test' };

    const r1 = await setupBilling(deps, {});
    expect(!r1.ok && r1.error.message).toBe('Falta userId');

    const r2 = await setupBilling(deps, { userId: 'fantasma' });
    expect(!r2.ok && r2.error.message).toBe('Usuario no encontrado');

    const r3 = await setupBilling(deps, { userId: 'u1' });
    expect(r3.ok).toBe(true);
    expect(billing.calls).toEqual([{ userId: 'u1', email: 'tutor@x.com', baseUrl: 'https://app.test' }]);
    if (r3.ok) expect(r3.value).toEqual({ url: 'https://app.test/billing?ok=1' });
  });
});

/* ---------------- process-mp-payment ---------------- */

describe('processMpPayment', () => {
  function base() {
    const payments = new FakePayments(
      [],
      {},
      { mentor1: { uid: 'mentor1', mercadopagoConfig: { accessToken: 'tok_m' } } },
      { seller9: 'mentor1' },
    );
    const provider = new FakeProvider();
    provider.payments.pay1 = { externalReference: '{"pageId":"p"}', status: 'approved' };
    provider.payments.pay2 = { status: 'approved' };
    const enrollment = new FakeEnrollment();
    return { payments, provider, enrollment };
  }

  it('topic distinto de payment → received sin efectos', async () => {
    const { payments, provider, enrollment } = base();
    const r = await processMpPayment(
      { payments, provider, enrollment },
      { topic: 'merchant_order', paymentId: 'x', sellerId: 'seller9' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ kind: 'received' });
    expect(enrollment.calls).toHaveLength(0);
  });

  it('sin mapping → 404 Mentor mapping not found', async () => {
    const { payments, provider, enrollment } = base();
    const r = await processMpPayment(
      { payments, provider, enrollment },
      { topic: 'payment', paymentId: 'pay1', sellerId: 'nadie' },
    );
    expect(!r.ok && r.error.message).toBe('Mentor mapping not found');
  });

  it('sin token del mentor → 500 Mentor token missing', async () => {
    const { provider, enrollment } = base();
    const payments = new FakePayments([], {}, { mentor1: { uid: 'mentor1' } }, { seller9: 'mentor1' });
    const r = await processMpPayment(
      { payments, provider, enrollment },
      { topic: 'payment', paymentId: 'pay1', sellerId: 'seller9' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const d = r.error.details as { status: number };
      expect(d.status).toBe(500);
      expect(r.error.message).toBe('Mentor token missing');
    }
  });

  it('pago sin external_reference → received sin inscribir', async () => {
    const { payments, provider, enrollment } = base();
    const r = await processMpPayment(
      { payments, provider, enrollment },
      { topic: 'payment', paymentId: 'pay2', sellerId: 'seller9' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ kind: 'received' });
    expect(enrollment.calls).toHaveLength(0);
  });

  it('pago aprobado → inscribe y devuelve processed', async () => {
    const { payments, provider, enrollment } = base();
    const r = await processMpPayment(
      { payments, provider, enrollment },
      { topic: 'payment', paymentId: 'pay1', sellerId: 'seller9' },
    );
    expect(r.ok).toBe(true);
    expect(enrollment.calls).toEqual([
      { paymentId: 'pay1', externalReference: '{"pageId":"p"}', status: 'approved' },
    ]);
    if (r.ok) {
      expect(r.value.kind).toBe('processed');
      if (r.value.kind === 'processed') expect(r.value.result.enrollmentId).toBe('enroll_1');
    }
  });
});
