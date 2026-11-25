import { describe, expect, it, vi } from 'vitest';
import { initiateTransfer } from '../use-cases/initiate-transfer';
import { approveTransfer } from '../use-cases/approve-transfer';
import { processEnrollment, type ProcessEnrollmentDeps } from '../use-cases/process-enrollment';
import { processStripeWebhook } from '../use-cases/stripe-webhook-use-case';
import type { FirestoreGateway } from '@/data/firestore/gateway';

describe('Emulación de Transacciones de Compra por Medio de Pago (End-to-End)', () => {
  const tutorId = 'tutor_fastoria_1';
  const studentEmail = 'alumno.prueba@gmail.com';
  const pageId = 'page_curso_react';
  const courseId = 'course_react_101';

  const mockSalesPage = {
    id: pageId,
    productId: courseId,
    productType: 'course',
    price: 50000,
    currency: 'ARS',
    mentorId: tutorId,
    pricing: {
      pricesByGateway: {
        mercadopago: { gatewayId: 'mercadopago', amount: 50000, currency: 'ARS', isActive: true },
        getnet: { gatewayId: 'getnet', amount: 48000, currency: 'ARS', isActive: true },
        transfer: { gatewayId: 'transfer', amount: 45000, currency: 'ARS', isActive: true },
        stripe: { gatewayId: 'stripe', amount: 40, currency: 'USD', isActive: true },
      },
    },
  };

  function createMockCommerceGateway() {
    const enrollments = new Map<string, any>();
    const ledger = new Map<string, any>();
    const users = new Map<string, any>();

    const gateway = {
      getSalesPage: vi.fn().mockResolvedValue(mockSalesPage),
      checkEnrollmentExists: vi.fn().mockImplementation(async (id: string) => enrollments.has(id)),
      findOrCreateStudent: vi.fn().mockResolvedValue({ id: 'student_99', name: 'Alumno Prueba' }),
      createEnrollment: vi.fn().mockImplementation(async (data: any) => {
        enrollments.set(data.id, data);
      }),
      getProductInfo: vi.fn().mockResolvedValue({ title: 'Curso Completo de React', price: 50000 }),
      getMentorInfo: vi.fn().mockResolvedValue({ name: 'Tutor Elite', email: 'tutor@fastoria.com' }),
      incrementMentorSales: vi.fn().mockResolvedValue(undefined),
      incrementPageConversions: vi.fn().mockResolvedValue(undefined),
      convertLead: vi.fn().mockResolvedValue(undefined),
      recordOrder: vi.fn().mockImplementation(async (orderId: string, data: any) => {
        ledger.set(orderId, data);
      }),
    };

    const emails = {
      sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
    };

    return { gateway, emails, enrollments, ledger, users };
  }

  // 1. Emulación: Mercado Pago
  it('1. Mercado Pago: emulación de cobro exitoso, inscripción y registro en orderLedger con comisión', async () => {
    const { gateway, emails, enrollments, ledger } = createMockCommerceGateway();
    const deps: ProcessEnrollmentDeps = { gateway, emails };

    const mpPaymentId = 'mp_pay_987654321';
    const externalReference = JSON.stringify({
      pageId,
      studentEmail,
      mentorId: tutorId,
      referidoId: 'ref_marketing_01',
      gateway: 'mercadopago',
    });

    const result = await processEnrollment(deps, {
      paymentId: mpPaymentId,
      externalReference,
      status: 'approved',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.alreadyEnrolled).toBe(false);
    }

    // Validación de inscripción en Firestore
    expect(gateway.createEnrollment).toHaveBeenCalledTimes(1);
    const createdEnrollment = enrollments.get(`enroll_${courseId}_${studentEmail.replace(/[^a-z0-9]/g, '_')}`);
    expect(createdEnrollment).toBeDefined();
    expect(createdEnrollment.source).toBe('mercadopago');
    expect(createdEnrollment.paymentId).toBe(mpPaymentId);

    // Validación de Libro Mayor (orderLedger)
    expect(gateway.recordOrder).toHaveBeenCalledWith(mpPaymentId, expect.anything());
    const ledgerEntry = ledger.get(mpPaymentId);
    expect(ledgerEntry).toBeDefined();
    expect(ledgerEntry.gatewayId).toBe('mercadopago');
    expect(ledgerEntry.chargedAmount).toBe(50000);
    expect(ledgerEntry.chargedCurrency).toBe('ARS');
    expect(ledgerEntry.gatewayFee).toBe(3000); // 6% comisión de MP
    expect(ledgerEntry.netAmount).toBe(47000);
    expect(ledgerEntry.status).toBe('completed');
  });

  // 2. Emulación: Stripe (Tarjeta Internacional en USD)
  it('2. Stripe: emulación de webhook de compra directa (payment mode), inscripción y libro mayor en USD', async () => {
    const { gateway, emails, enrollments, ledger } = createMockCommerceGateway();
    const commerceDeps: ProcessEnrollmentDeps = { gateway, emails };

    const stripeSessionId = 'cs_live_stripe_999888';
    const mockEnrollmentPort = {
      completeEnrollment: async (input: { paymentId: string; externalReference: string; status: string }) => {
        const res = await processEnrollment(commerceDeps, input);
        if (!res.ok) throw new Error(res.error.message);
        return { success: true, enrollmentId: res.value.enrollmentId };
      },
    };

    const stripeEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: stripeSessionId,
          mode: 'payment',
          metadata: {
            pageId,
            studentEmail,
            studentName: 'Alumno Prueba',
            mentorId: tutorId,
            referidoId: null,
          },
        },
      },
    };

    const response = await processStripeWebhook({} as unknown as FirestoreGateway, stripeEvent, {
      enrollment: mockEnrollmentPort,
    });

    expect(response.status).toBe(200);

    // Validación de inscripción
    const createdEnrollment = enrollments.get(`enroll_${courseId}_${studentEmail.replace(/[^a-z0-9]/g, '_')}`);
    expect(createdEnrollment).toBeDefined();
    expect(createdEnrollment.source).toBe('stripe');

    // Validación de Libro Mayor (orderLedger)
    const ledgerEntry = ledger.get(stripeSessionId);
    expect(ledgerEntry).toBeDefined();
    expect(ledgerEntry.gatewayId).toBe('stripe');
    expect(ledgerEntry.chargedAmount).toBe(40); // $40 USD configurado en pricesByGateway
    expect(ledgerEntry.chargedCurrency).toBe('USD');
    expect(ledgerEntry.amountInUSD).toBe(40);
    expect(ledgerEntry.gatewayFee).toBe(1.8); // 4.5% comisión de Stripe ($1.80 USD)
    expect(ledgerEntry.netAmount).toBe(38.2);
    expect(ledgerEntry.status).toBe('completed');
  });

  // 3. Emulación: Getnet
  it('3. Getnet: emulación de compra aprobada, inscripción y cálculo de aranceles', async () => {
    const { gateway, emails, enrollments, ledger } = createMockCommerceGateway();
    const deps: ProcessEnrollmentDeps = { gateway, emails };

    const getnetOrderId = 'gn_order_555444';
    const externalReference = JSON.stringify({
      pageId,
      studentEmail,
      mentorId: tutorId,
      gateway: 'getnet',
    });

    const result = await processEnrollment(deps, {
      paymentId: getnetOrderId,
      externalReference,
      status: 'approved',
    });

    expect(result.ok).toBe(true);

    const createdEnrollment = enrollments.get(`enroll_${courseId}_${studentEmail.replace(/[^a-z0-9]/g, '_')}`);
    expect(createdEnrollment).toBeDefined();
    expect(createdEnrollment.source).toBe('getnet');

    const ledgerEntry = ledger.get(getnetOrderId);
    expect(ledgerEntry).toBeDefined();
    expect(ledgerEntry.gatewayId).toBe('getnet');
    expect(ledgerEntry.chargedAmount).toBe(48000); // $48.000 ARS configurado en pricesByGateway
    expect(ledgerEntry.chargedCurrency).toBe('ARS');
    expect(ledgerEntry.gatewayFee).toBe(2880); // 6% comisión Getnet
    expect(ledgerEntry.netAmount).toBe(45120);
    expect(ledgerEntry.status).toBe('completed');
  });

  // 4. Emulación: Transferencia Bancaria (Circuito completo: initiate -> approve -> ledger)
  it('4. Transferencia Bancaria: circuito completo con precio específico, aprobación del tutor y libro mayor con 0% comisión', async () => {
    const { gateway, emails, enrollments, ledger } = createMockCommerceGateway();
    const commerceDeps: ProcessEnrollmentDeps = { gateway, emails };

    // Falsos para initiateTransfer y approveTransfer
    const mockTransfersDb = new Map<string, any>();
    const fakeTransfersRepo = {
      create: vi.fn().mockImplementation(async (order: any) => {
        mockTransfersDb.set(order.id, { ...order, status: 'pending' });
        return { id: order.id, status: 'pending' };
      }),
      findById: vi.fn().mockImplementation(async (id: string) => mockTransfersDb.get(id) || null),
      markApproved: vi.fn().mockImplementation(async (id: string, enrollmentId?: string | null) => {
        const o = mockTransfersDb.get(id);
        if (o) {
          o.status = 'approved';
          o.enrollmentId = enrollmentId;
        }
      }),
      markRejected: vi.fn().mockImplementation(async (id: string) => {
        const o = mockTransfersDb.get(id);
        if (o) o.status = 'rejected';
      }),
    };

    const fakePagesRepo = {
      findById: vi.fn().mockResolvedValue(mockSalesPage),
    };

    const fakePaymentsRepo = {
      findTutorMethodByType: vi.fn().mockResolvedValue({
        id: 'pm_transf_1',
        type: 'transfer',
        isActive: true,
        config: { alias: 'FAST.ACADEMY.ARG', cbu: '0000003100010002000300', titularName: 'Fastoria SRL' },
      }),
      getMentorProfile: vi.fn().mockResolvedValue({
        uid: tutorId,
        email: 'tutor@fastoria.com',
        displayName: 'Tutor Elite',
      }),
    };

    const fakeNotifier = {
      sendStudentNotice: vi.fn().mockResolvedValue(undefined),
      sendMentorNotice: vi.fn().mockResolvedValue(undefined),
    };

    // Paso 4.1: Alumno inicia transferencia desde la landing
    const initiateResult = await initiateTransfer(
      {
        pages: fakePagesRepo as any,
        payments: fakePaymentsRepo as any,
        transfers: fakeTransfersRepo as any,
        notifier: fakeNotifier,
      },
      {
        pageId,
        studentEmail,
        studentName: 'Alumno Prueba',
      }
    );

    expect(initiateResult.ok).toBe(true);
    if (!initiateResult.ok) return;

    const { orderId, amount, bankDetails } = initiateResult.value;
    expect(amount).toBe(45000); // Tomó los $45.000 de pricesByGateway.transfer
    expect(bankDetails.alias).toBe('FAST.ACADEMY.ARG');
    expect(orderId.startsWith('txfr_')).toBe(true);

    // Paso 4.2: Tutor valida el comprobante bancario en su panel y aprueba
    const approveResult = await approveTransfer(
      {
        transfers: fakeTransfersRepo as any,
        enrollment: {
          completeEnrollment: async (input) => {
            const res = await processEnrollment(commerceDeps, input);
            if (!res.ok) throw new Error(res.error.message);
            return { success: true, enrollmentId: res.value.enrollmentId };
          },
        },
      },
      {
        orderId,
        mentorId: tutorId,
        action: 'approve',
      }
    );

    expect(approveResult.ok).toBe(true);

    // Paso 4.3: Validar que el alumno quedó inscripto con source transfer
    const createdEnrollment = enrollments.get(`enroll_${courseId}_${studentEmail.replace(/[^a-z0-9]/g, '_')}`);
    expect(createdEnrollment).toBeDefined();
    expect(createdEnrollment.source).toBe('transfer');

    // Paso 4.4: Validar asentamiento en Libro Mayor (orderLedger) sin comisiones
    const ledgerEntry = ledger.get(orderId);
    expect(ledgerEntry).toBeDefined();
    expect(ledgerEntry.gatewayId).toBe('transfer');
    expect(ledgerEntry.chargedAmount).toBe(45000);
    expect(ledgerEntry.chargedCurrency).toBe('ARS');
    expect(ledgerEntry.gatewayFee).toBe(0); // 0% comisión bancaria directa
    expect(ledgerEntry.netAmount).toBe(45000); // 100% neto para el tutor
    expect(ledgerEntry.status).toBe('completed');
  });

  // =========================================================================
  // SALIDAS POR ERRORES ESPERADOS (Negative Paths)
  // =========================================================================

  it('(-) Error Esperado 5.1: Transferencia ya aprobada debe ser rechazada con CONFLICT en un segundo intento', async () => {
    const fakeTransfersRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'txfr_done_1',
        mentorId: tutorId,
        status: 'approved',
      }),
      markApproved: vi.fn(),
      markRejected: vi.fn(),
    };

    const res = await approveTransfer(
      { transfers: fakeTransfersRepo as any, enrollment: { completeEnrollment: vi.fn() } as any },
      { orderId: 'txfr_done_1', mentorId: tutorId, action: 'approve' }
    );

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('CONFLICT');
      expect(res.error.message).toContain('ya fue procesada');
    }
  });

  it('(-) Error Esperado 5.2: Tutor B intentando aprobar transferencia dirigida a Tutor A debe ser bloqueado con FORBIDDEN', async () => {
    const fakeTransfersRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'txfr_order_tutor_a',
        mentorId: 'tutor_a',
        status: 'pending',
      }),
      markApproved: vi.fn(),
      markRejected: vi.fn(),
    };

    const res = await approveTransfer(
      { transfers: fakeTransfersRepo as any, enrollment: { completeEnrollment: vi.fn() } as any },
      { orderId: 'txfr_order_tutor_a', mentorId: 'tutor_b_intruso', action: 'approve' }
    );

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('FORBIDDEN');
      expect(res.error.message).toContain('No autorizado');
    }
  });
});
