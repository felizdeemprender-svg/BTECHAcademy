/**
 * Capa de datos — Delegados al código legacy de pagos (F0.2).
 * Reúso tal cual (sin reescribir): el orquestador de sesiones
 * (`mercadopago/getnet/stripe`, incluye escrituras a
 * `pending_orders` y `mp_seller_mappings`), el setup Stripe de
 * billing, la inscripción (`enrollments`, `salesPages.stats`,
 * `leads`) y los emails de transferencia. Mismo storage,
 * mismo comportamiento; solo cambia el punto de llamada
 * (los use-cases vía puertos, nunca los routes directo).
 */
import { processPaymentSession, setupTutorBilling } from '@/services/payments/orchestrator';
import { processSuccessfulEnrollment } from '@/lib/payments/enrollment';
import { sendTransferStudentEmail } from '@/lib/emails/transfer-student';
import { sendTransferMentorEmail } from '@/lib/emails/transfer-mentor';

import type {
  BillingSetup,
  CheckoutSessionParams,
  CheckoutSessions,
} from '@/domain/commerce/payment-provider';
import type {
  EnrollmentCompletionResult,
  EnrollmentService,
  TransferMentorNotice,
  TransferNotifier,
  TransferStudentNotice,
} from '@/domain/commerce/payment-ports';

export class LegacyPaymentSessions implements CheckoutSessions {
  async createSession(
    gateway: string,
    paymentConfig: Record<string, unknown>,
    params: CheckoutSessionParams,
  ): Promise<Record<string, unknown>> {
    return processPaymentSession(gateway, paymentConfig, {
      pageId: params.pageId,
      title: params.title,
      price: params.price,
      studentEmail: params.studentEmail,
      studentName: params.studentName,
      mentorId: params.mentorId,
      referidoId: params.referidoId,
      baseUrl: params.baseUrl,
    });
  }
}

export class LegacyBillingSetup implements BillingSetup {
  async createSetup(
    userId: string,
    email: string,
    baseUrl: string,
  ): Promise<{ url?: string | null; customerId?: string }> {
    return setupTutorBilling(userId, email, baseUrl);
  }
}

export class LegacyEnrollmentService implements EnrollmentService {
  async completeEnrollment(input: {
    paymentId: string;
    externalReference: string;
    status: string;
  }): Promise<EnrollmentCompletionResult> {
    const result = await processSuccessfulEnrollment(input);
    if (!result.success) {
      return { success: false, reason: result.reason };
    }
    return {
      success: true,
      alreadyEnrolled: result.alreadyEnrolled,
      enrollmentId: result.enrollmentId,
    };
  }
}

export class LegacyTransferNotifier implements TransferNotifier {
  async sendStudentNotice(notice: TransferStudentNotice): Promise<void> {
    await sendTransferStudentEmail({
      studentEmail: notice.studentEmail,
      studentName: notice.studentName,
      courseTitle: notice.courseTitle,
      amount: notice.amount,
      bankDetails: { ...notice.bankDetails },
      referenceCode: notice.referenceCode,
      mentorName: notice.mentorName,
      mentorEmail: notice.mentorEmail,
    });
  }

  async sendMentorNotice(notice: TransferMentorNotice): Promise<void> {
    await sendTransferMentorEmail({ ...notice });
  }
}
