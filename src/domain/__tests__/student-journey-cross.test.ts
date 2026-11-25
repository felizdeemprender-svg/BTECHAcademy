import { describe, expect, it, vi } from 'vitest';
import { processEnrollment, type ProcessEnrollmentDeps } from '../commerce/use-cases/process-enrollment';
import { handleSyncCourseProgress } from '@/lib/api/course-progress-sync';
import type { FirestoreGateway } from '@/data/firestore/gateway';

describe('Cross-Journey Alumno: Ciclo de Vida Completo (Compra -> Email -> Avance -> Completitud)', () => {
  const tutorId = 'tutor_cross_1';
  const studentEmail = 'alumno.cross@gmail.com';
  const studentId = 'student_cross_uid';
  const pageId = 'page_cross_mastery';
  const courseId = 'course_cross_mastery';

  function createUnifiedTestGateway() {
    const db = {
      courses: new Map<string, any>([
        [courseId, {
          id: courseId,
          title: 'Master en Arquitectura Web',
          price: 60000,
          mentorId: tutorId,
        }]
      ]),
      salesPages: new Map<string, any>([
        [pageId, {
          id: pageId,
          productId: courseId,
          courseId: courseId,
          productType: 'course',
          mentorId: tutorId,
          price: 60000,
          currency: 'ARS',
          pricing: {
            pricesByGateway: {
              mercadopago: { gatewayId: 'mercadopago', amount: 60000, currency: 'ARS', isActive: true },
            }
          }
        }]
      ]),
      enrollments: new Map<string, any>(),
      orderLedger: new Map<string, any>(),
      student_achievements: new Map<string, any>(),
      followups: new Map<string, any>(),
      leads: new Map<string, any>(),
      users: new Map<string, any>([
        [tutorId, { id: tutorId, email: 'tutor@fastoria.com', displayName: 'Tutor Elite', roles: ['tutor'] }],
        [studentId, { id: studentId, email: studentEmail, displayName: 'Alumno Cross', roles: ['alumno'] }],
      ]),
    };

    const gateway: FirestoreGateway = {
      getDoc: vi.fn().mockImplementation(async (col: string, id: string) => {
        const item = (db as any)[col]?.get(id);
        if (!item) return null;
        return { exists: true, id, data: () => item };
      }),
      createDoc: vi.fn().mockImplementation(async (col: string, id: string, data: any) => {
        (db as any)[col]?.set(id, data);
      }),
      mergeDoc: vi.fn().mockImplementation(async (col: string, id: string, data: any) => {
        const existing = (db as any)[col]?.get(id) || {};
        (db as any)[col]?.set(id, { ...existing, ...data });
      }),
      updateDoc: vi.fn().mockImplementation(async (col: string, id: string, data: any) => {
        const existing = (db as any)[col]?.get(id) || {};
        (db as any)[col]?.set(id, { ...existing, ...data });
      }),
      queryByField: vi.fn().mockImplementation(async (col: string, field: string, value: any) => {
        const collectionMap = (db as any)[col];
        if (!collectionMap) return { docs: [] };
        const matches: any[] = [];
        for (const [id, doc] of collectionMap.entries()) {
          if (doc[field] === value) matches.push({ exists: true, id, data: () => doc });
        }
        return { docs: matches };
      }),
      listSubDocs: vi.fn().mockImplementation(async (col: string, docId: string, subCol: string) => {
        if (subCol === 'modules') {
          return {
            docs: [
              { id: 'mod_1', data: () => ({ title: 'Fundamentos de Dominio' }) },
              { id: 'mod_2', data: () => ({ title: 'Puertos y Adaptadores' }) },
              { id: 'mod_3', data: () => ({ title: 'Seguridad y Reglas' }) },
              { id: 'mod_4', data: () => ({ title: 'Despliegue y Pruebas' }) },
            ],
          };
        }
        return { docs: [] };
      }),
      increment: vi.fn().mockImplementation((n: number) => n),
      serverTimestamp: vi.fn().mockImplementation(() => new Date()),
    } as unknown as FirestoreGateway;

    return { gateway, db };
  }

  it('Flujo Integral Alumno: Compra -> Email Bienvenida -> Matrícula -> Asiento Contable -> Progreso 50% -> Completitud 100% y Certificado', async () => {
    const { gateway, db } = createUnifiedTestGateway();
    const sentEmails: { to: string; subject?: string; type: string }[] = [];

    const emailsService = {
      sendWelcomeEmail: vi.fn().mockImplementation(async (data: any) => {
        sentEmails.push({ to: data.studentEmail, type: 'welcome', subject: data.courseTitle });
      }),
    };

    const commerceGatewayAdapter = {
      getSalesPage: async (pId: string) => {
        const doc = await gateway.getDoc('salesPages', pId);
        return doc ? doc.data() as any : null;
      },
      checkEnrollmentExists: async (eId: string) => {
        const doc = await gateway.getDoc('enrollments', eId);
        return !!doc;
      },
      findOrCreateStudent: async () => {
        return { id: studentId, name: 'Alumno Cross' };
      },
      createEnrollment: async (data: any) => {
        await (gateway as any).createDoc('enrollments', data.id, data);
      },
      getProductInfo: async (pId: string) => {
        const doc = await gateway.getDoc('courses', pId);
        return doc ? doc.data() as any : null;
      },
      getMentorInfo: async (mId: string) => {
        const doc = await gateway.getDoc('users', mId);
        return doc ? doc.data() as any : null;
      },
      incrementMentorSales: async () => {},
      incrementPageConversions: async () => {},
      convertLead: async () => {},
      recordOrder: async (orderId: string, data: any) => {
        await (gateway as any).createDoc('orderLedger', orderId, data);
      },
    };

    // =========================================================================
    // FASE 1: Compra y Checkout del Alumno (Simulación Mercado Pago)
    // =========================================================================
    const paymentId = 'pay_student_journey_123';
    const externalReference = JSON.stringify({
      pageId,
      studentEmail,
      mentorId: tutorId,
      gateway: 'mercadopago',
    });

    const enrollmentResult = await processEnrollment(
      { gateway: commerceGatewayAdapter as any, emails: emailsService },
      { paymentId, externalReference, status: 'approved' }
    );

    expect(enrollmentResult.ok).toBe(true);

    // Verificación 1.1: Se despachó el email de bienvenida automáticamente
    expect(emailsService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(sentEmails[0]?.to).toBe(studentEmail);
    expect(sentEmails[0]?.type).toBe('welcome');

    // Verificación 1.2: El alumno tiene matrícula activa con progreso inicial 0%
    const enrollmentId = `enroll_${courseId}_${studentEmail.replace(/[^a-z0-9]/g, '_')}`;
    const enrollmentDoc = db.enrollments.get(enrollmentId);
    expect(enrollmentDoc).toBeDefined();
    expect(enrollmentDoc.status).toBe('active');
    expect(enrollmentDoc.progressPercent).toBe(0);

    // Verificación 1.3: Se asentó en el libro mayor contable con comisión deducida
    const ledgerDoc = db.orderLedger.get(paymentId);
    expect(ledgerDoc).toBeDefined();
    expect(ledgerDoc.chargedAmount).toBe(60000);
    expect(ledgerDoc.gatewayFee).toBe(3600); // 6%
    expect(ledgerDoc.netAmount).toBe(56400);

    // =========================================================================
    // FASE 2: Progreso Parcial del Alumno (Completó 2 de 4 módulos = 50%)
    // =========================================================================
    // El alumno avanza en el cliente completando los módulos 1 y 2
    enrollmentDoc.progress = {
      completedModules: ['mod_1', 'mod_2'],
      evaluations: {
        mod_1: { score: 100, submittedAt: new Date().toISOString() },
        mod_2: { score: 90, submittedAt: new Date().toISOString() },
      },
    };
    enrollmentDoc.progressPercent = 50;

    const caller = { uid: studentId, email: studentEmail, role: 'alumno' };
    const midSyncResponse = await handleSyncCourseProgress(gateway, caller as any, courseId, {
      moduleId: 'mod_2',
      score: 90,
      feedback: 'Buen progreso',
    });

    expect(midSyncResponse.status).toBe(200);
    const midData = await midSyncResponse.json();
    expect(midData.data.progressPercent).toBe(50);
    expect(midData.data.achievementSaved).toBe(false);

    // Aún no hay certificado generado a mitad de curso
    expect(db.student_achievements.has(`${studentId}_${courseId}`)).toBe(false);

    // =========================================================================
    // FASE 3: Completitud del Curso al 100% (Todos los módulos aprobados)
    // =========================================================================
    enrollmentDoc.progress.completedModules = ['mod_1', 'mod_2', 'mod_3', 'mod_4'];
    enrollmentDoc.progress.evaluations = {
      ...enrollmentDoc.progress.evaluations,
      mod_3: { score: 95, submittedAt: new Date().toISOString() },
      mod_4: { score: 100, submittedAt: new Date().toISOString() },
    };
    enrollmentDoc.progressPercent = 100;

    const finalSyncResponse = await handleSyncCourseProgress(gateway, caller as any, courseId, {
      moduleId: 'mod_4',
      score: 100,
      feedback: 'Felicitaciones por completar el curso',
    });

    expect(finalSyncResponse.status).toBe(200);
    const finalData = await finalSyncResponse.json();
    expect(finalData.data.progressPercent).toBe(100);
    expect(finalData.data.achievementSaved).toBe(true);

    // Verificación 3.1: Se emitió y guardó el Logro/Certificado permanente en Firestore
    const achievementId = `${studentId}_${courseId}`;
    const achievementDoc = db.student_achievements.get(achievementId);
    expect(achievementDoc).toBeDefined();
    expect(achievementDoc.courseId).toBe(courseId);
    expect(achievementDoc.studentEmail).toBe(studentEmail);
    expect(achievementDoc.finalScore).toBeGreaterThanOrEqual(95);
    expect(achievementDoc.moduleSummary).toHaveLength(4);
  });

  // =========================================================================
  // SALIDAS POR ERRORES ESPERADOS (Negative Paths)
  // =========================================================================

  it('(-) Error Esperado 1.1: Pago con estado "rejected" no debe matricular al alumno, ni enviar email, ni registrar venta', async () => {
    const { gateway, db } = createUnifiedTestGateway();
    const emailsService = { sendWelcomeEmail: vi.fn() };
    const commerceGatewayAdapter = {
      getSalesPage: async (pId: string) => {
        const doc = await gateway.getDoc('salesPages', pId);
        return doc ? doc.data() as any : null;
      },
      checkEnrollmentExists: async () => false,
      findOrCreateStudent: async () => ({ id: studentId, name: 'Alumno' }),
      createEnrollment: vi.fn(),
      getProductInfo: async () => null,
      getMentorInfo: async () => null,
      incrementMentorSales: vi.fn(),
      incrementPageConversions: vi.fn(),
      convertLead: vi.fn(),
      recordOrder: vi.fn(),
    };

    const res = await processEnrollment(
      { gateway: commerceGatewayAdapter as any, emails: emailsService as any },
      {
        paymentId: 'pay_rejected_999',
        externalReference: JSON.stringify({ pageId, studentEmail, mentorId: tutorId }),
        status: 'rejected',
      }
    );

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('VALIDATION');
      expect(res.error.message).toContain('not approved');
    }
    expect(commerceGatewayAdapter.createEnrollment).not.toHaveBeenCalled();
    expect(commerceGatewayAdapter.recordOrder).not.toHaveBeenCalled();
    expect(emailsService.sendWelcomeEmail).not.toHaveBeenCalled();
  });

  it('(-) Error Esperado 1.2: JSON corrupto o faltante en externalReference debe fallar con error de validación sin efectos secundarios', async () => {
    const { gateway } = createUnifiedTestGateway();
    const emailsService = { sendWelcomeEmail: vi.fn() };
    const commerceGatewayAdapter = {
      getSalesPage: vi.fn(),
      checkEnrollmentExists: vi.fn(),
      findOrCreateStudent: vi.fn(),
      createEnrollment: vi.fn(),
      getProductInfo: vi.fn(),
      getMentorInfo: vi.fn(),
      incrementMentorSales: vi.fn(),
      incrementPageConversions: vi.fn(),
      convertLead: vi.fn(),
      recordOrder: vi.fn(),
    };

    const res = await processEnrollment(
      { gateway: commerceGatewayAdapter as any, emails: emailsService as any },
      { paymentId: 'pay_bad_ref', externalReference: '{broken_json', status: 'approved' }
    );

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('VALIDATION');
    }
    expect(commerceGatewayAdapter.createEnrollment).not.toHaveBeenCalled();
  });

  it('(-) Error Esperado 1.3: Alumno no matriculado intentando sincronizar progreso debe recibir 403 Forbidden', async () => {
    const { gateway } = createUnifiedTestGateway();
    const unregisteredCaller = { uid: 'user_intruder_999', email: 'intruso@test.com', role: 'alumno' };

    const res = await handleSyncCourseProgress(gateway, unregisteredCaller as any, courseId, {
      moduleId: 'mod_1',
      score: 100,
    });

    expect(res.status).toBe(403);
  });
});
