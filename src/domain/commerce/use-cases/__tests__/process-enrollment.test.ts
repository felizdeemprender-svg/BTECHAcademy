import { describe, expect, it, vi } from 'vitest';
import { processEnrollment, type ProcessEnrollmentDeps } from '../process-enrollment';

describe('Commerce Use Cases: processEnrollment', () => {
  const defaultDeps: ProcessEnrollmentDeps = {
    gateway: {
      getSalesPage: vi.fn().mockResolvedValue({ id: 'page1', productId: 'prod1', productType: 'course' }),
      checkEnrollmentExists: vi.fn().mockResolvedValue(false),
      findOrCreateStudent: vi.fn().mockResolvedValue({ id: 'student1', name: 'John Doe' }),
      createEnrollment: vi.fn().mockResolvedValue(undefined),
      getProductInfo: vi.fn().mockResolvedValue({ title: 'Course 1', price: 100 }),
      getMentorInfo: vi.fn().mockResolvedValue({ name: 'Mentor', email: 'mentor@test.com' }),
      incrementMentorSales: vi.fn().mockResolvedValue(undefined),
      incrementPageConversions: vi.fn().mockResolvedValue(undefined),
      convertLead: vi.fn().mockResolvedValue(undefined),
    },
    emails: {
      sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
    }
  };

  const validPayload = {
    paymentId: 'pay123',
    externalReference: JSON.stringify({
      pageId: 'page1',
      studentEmail: 'student@test.com',
      mentorId: 'mentor1',
      referidoId: 'ref1'
    }),
    status: 'approved'
  };

  it('debe fallar si el pago no esta aprobado', async () => {
    const result = await processEnrollment(defaultDeps, { ...validPayload, status: 'rejected' });
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.message).toContain('not approved');
    } else {
      expect.fail('Expected error');
    }
  });

  it('debe ser idempotente si el alumno ya está matriculado', async () => {
    const deps = {
      ...defaultDeps,
      gateway: {
        ...defaultDeps.gateway,
        checkEnrollmentExists: vi.fn().mockResolvedValue(true)
      }
    };
    const result = await processEnrollment(deps, validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.alreadyEnrolled).toBe(true);
    }
    // No debe haber llamado a crear la matricula ni sumar ventas
    expect(deps.gateway.createEnrollment).not.toHaveBeenCalled();
    expect(deps.gateway.incrementMentorSales).not.toHaveBeenCalled();
  });

  it('debe procesar una matrícula nueva correctamente', async () => {
    const result = await processEnrollment(defaultDeps, validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.alreadyEnrolled).toBe(false);
    }
    expect(defaultDeps.gateway.createEnrollment).toHaveBeenCalled();
    expect(defaultDeps.gateway.incrementMentorSales).toHaveBeenCalledWith('mentor1', 100);
    expect(defaultDeps.emails.sendWelcomeEmail).toHaveBeenCalled();
    expect(defaultDeps.gateway.incrementPageConversions).toHaveBeenCalledWith('page1');
    expect(defaultDeps.gateway.convertLead).toHaveBeenCalledWith('student@test.com', 'prod1', 'pay123');
  });
});
