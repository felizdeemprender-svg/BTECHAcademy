/**
 * Tests del dominio comercio: emails, inscripciones, leads,
 * órdenes de gateway y transferencias. Dominio puro, sin Firebase.
 */
import { describe, expect, it } from 'vitest';

import { normalizeEmail, parseNormalizedEmail } from '../email';
import {
  EnrollmentSchema,
  buildEnrollmentId,
  isActiveEnrollment,
} from '../enrollment';
import { LeadSchema, convertLead, isConvertedLead } from '../lead';
import {
  PendingOrderSchema,
  isOrderCompleted,
  normalizePendingOrderStatus,
} from '../pending-order';
import {
  TransferOrderSchema,
  approveTransfer,
  isTransferPending,
  rejectTransfer,
} from '../transfer-order';

describe('email', () => {
  it('normaliza a minúsculas + trim', () => {
    expect(normalizeEmail('  Mentor@TEST.com ')).toBe('mentor@test.com');
  });

  it('parsea y normaliza, rechaza inválidos', () => {
    expect(parseNormalizedEmail('  A@b.co ')).toBe('a@b.co');
    expect(() => parseNormalizedEmail('no-email')).toThrow();
    expect(() => parseNormalizedEmail(123)).toThrow();
  });
});

describe('enrollment', () => {
  function baseEnrollment(overrides: Record<string, unknown> = {}) {
    return {
      id: 'enroll_c1_alumno_x_com',
      courseId: 'c1',
      productId: 'c1',
      productType: 'course',
      mentorId: 'm1',
      inviteEmail: 'alumno@x.com',
      studentId: 's1',
      status: 'active',
      ...overrides,
    };
  }

  it('parsea inscripción de webhook con defaults', () => {
    const e = EnrollmentSchema.parse(baseEnrollment());
    expect(e.progress).toEqual({ completedModules: [] });
    expect(e.progressPercent).toBe(0);
  });

  it('acepta followup y estados pending/suspended', () => {
    const e = EnrollmentSchema.parse(
      baseEnrollment({ productType: 'followup', status: 'suspended' }),
    );
    expect(e.productType).toBe('followup');
    expect(isActiveEnrollment(e)).toBe(false);
    expect(isActiveEnrollment({ status: 'active' })).toBe(true);
  });

  it('rechaza email inválido, producto vacío y porcentaje >100', () => {
    expect(() => EnrollmentSchema.parse(baseEnrollment({ inviteEmail: 'x' }))).toThrow();
    expect(() => EnrollmentSchema.parse(baseEnrollment({ productId: '' }))).toThrow();
    expect(() => EnrollmentSchema.parse(baseEnrollment({ progressPercent: 101 }))).toThrow();
  });

  it('buildEnrollmentId replica el ID idempotente del webhook', () => {
    expect(buildEnrollmentId('c1', 'Alumno@X.com')).toBe('enroll_c1_alumno_x_com');
    expect(buildEnrollmentId('f9', 'a.b+c@d.co')).toBe('enroll_f9_a_b_c_d_co');
  });
});

describe('lead', () => {
  function baseLead(overrides: Record<string, unknown> = {}) {
    return {
      id: 'lead1',
      landingId: 'p1',
      courseId: 'c1',
      referidoId: null,
      studentName: 'Ana',
      studentEmail: 'ana@x.com',
      status: 'pending',
      ...overrides,
    };
  }

  it('parsea lead orgánico (referidoId null)', () => {
    const l = LeadSchema.parse(baseLead());
    expect(l.referidoId).toBeNull();
    expect(isConvertedLead(l)).toBe(false);
  });

  it('convertLead es inmutable y guarda paymentId', () => {
    const original = LeadSchema.parse(baseLead());
    const converted = convertLead(original, 'pay_123');
    expect(converted.status).toBe('converted');
    expect(converted.paymentId).toBe('pay_123');
    expect(isConvertedLead(converted)).toBe(true);
    expect(original.status).toBe('pending');
    expect(original.paymentId).toBeUndefined();
  });
});

describe('pending-order', () => {
  function baseOrder(overrides: Record<string, unknown> = {}) {
    return {
      orderId: 'btech_order_1',
      gateway: 'getnet',
      tutorId: 'm1',
      buyerEmail: 'buyer@x.com',
      landingId: 'p1',
      amount: 1000,
      status: 'pending',
      ...overrides,
    };
  }

  it('parsea orden de checkout getnet', () => {
    const o = PendingOrderSchema.parse(baseOrder());
    expect(o.buyerName).toBe('');
    expect(isOrderCompleted(o)).toBe(false);
    expect(isOrderCompleted({ status: 'completed' })).toBe(true);
  });

  it('normalizePendingOrderStatus replica el webhook', () => {
    expect(normalizePendingOrderStatus('APPROVED')).toBe('completed');
    expect(normalizePendingOrderStatus('AUTHORIZED')).toBe('completed');
    expect(normalizePendingOrderStatus('pending')).toBe('pending');
    expect(normalizePendingOrderStatus('REJECTED')).toBe('failed');
    expect(normalizePendingOrderStatus('CANCELLED')).toBe('failed');
    expect(normalizePendingOrderStatus('whatever')).toBe('failed');
  });

  it('rechaza monto negativo y emails inválidos', () => {
    expect(() => PendingOrderSchema.parse(baseOrder({ amount: -1 }))).toThrow();
    expect(() => PendingOrderSchema.parse(baseOrder({ buyerEmail: 'x' }))).toThrow();
  });
});

describe('transfer-order', () => {
  function baseTransfer(overrides: Record<string, unknown> = {}) {
    return {
      id: 'txfr_p1_123',
      pageId: 'p1',
      mentorId: 'm1',
      mentorEmail: 'mentor@x.com',
      studentEmail: 'alumno@x.com',
      studentName: 'Alumno',
      amount: 5000,
      bankDetails: { alias: 'A.B.C', cbu: '123', bankName: 'Banco', titularName: 'T' },
      referenceCode: 'ALUMNO-ABC123',
      status: 'pending',
      ...overrides,
    };
  }

  it('parsea orden pendiente válida', () => {
    const t = TransferOrderSchema.parse(baseTransfer());
    expect(isTransferPending(t)).toBe(true);
  });

  it('approve/reject son inmutables y registran quién decidió', () => {
    const original = TransferOrderSchema.parse(baseTransfer());
    const approved = approveTransfer(original, 'admin1');
    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('admin1');
    expect(original.status).toBe('pending');

    const rejected = rejectTransfer(original, 'admin1');
    expect(rejected.status).toBe('rejected');
    expect(isTransferPending(rejected)).toBe(false);
  });
});
