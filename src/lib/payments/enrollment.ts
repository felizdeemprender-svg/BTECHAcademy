import { resolveGateway } from '@/lib/api/gateway';
import { FirestoreCommerceGateway } from '@/data/firestore/commerce-gateway';
import { processEnrollment, type EmailService } from '@/domain/commerce/use-cases/process-enrollment';
import { sendWelcomeEmailServer } from '@/lib/emails/welcome';

/**
 * Procesa una inscripción exitosa de forma atómica e idempotente.
 * Refactorizado en Fase 3 para usar Clean Architecture (Domain Use Cases).
 */
export async function processSuccessfulEnrollment({
  paymentId,
  externalReference,
  status
}: {
  paymentId: string;
  externalReference: string;
  status: string;
}) {
  const baseGateway = await resolveGateway();
  const commerceGateway = new FirestoreCommerceGateway(baseGateway);

  const emailService: EmailService = {
    sendWelcomeEmail: async (data) => {
      await sendWelcomeEmailServer(data);
    }
  };

  const result = await processEnrollment({
    gateway: commerceGateway,
    emails: emailService
  }, {
    paymentId,
    externalReference,
    status
  });

  if (!result.ok) {
    if (result.error.code === 'VALIDATION' && result.error.message.includes('not approved')) {
      console.log(`[Enrollment] Pago ${paymentId} no aprobado (Status: ${status}).`);
      return { success: false, reason: 'not_approved' };
    }
    console.error('[Enrollment Error]', result.error);
    throw new Error(result.error.message);
  }

  const { enrollmentId, alreadyEnrolled } = result.value;

  if (alreadyEnrolled) {
    console.log(`[Enrollment] El alumno ya está inscrito. Idempotencia resuelta.`);
    return { success: true, alreadyEnrolled: true, enrollmentId };
  }

  console.log(`[Enrollment] ÉXITO: Inscripción ${enrollmentId} creada.`);
  return { success: true, enrollmentId };
}
