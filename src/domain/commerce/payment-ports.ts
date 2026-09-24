/**
 * Comercio — Puertos de efectos laterales de pagos (F0.2).
 * El legacy inscribía (`@/lib/payments/enrollment`), enviaba emails
 * (`@/lib/emails/transfer-*`) y activaba trials (engine); el dominio
 * solo declara estas interfaces puras y la infraestructura
 * (`@/data/payments/*`, `@/lib/api/*-handlers`) las implementa
 * delegando al código legacy tal cual. Facilitan tests con fakes.
 */

export interface EnrollmentCompletionInput {
  readonly paymentId: string;
  readonly externalReference: string;
  readonly status: string;
}

export interface EnrollmentCompletionResult {
  readonly success: boolean;
  readonly alreadyEnrolled?: boolean;
  readonly enrollmentId?: string;
  readonly reason?: string;
}

/** Inscripción idempotente (mismo flujo que Mercado Pago). */
export interface EnrollmentService {
  completeEnrollment(input: EnrollmentCompletionInput): Promise<EnrollmentCompletionResult>;
}

export interface TransferBankDetailsNotice {
  readonly alias: string;
  readonly cbu: string;
  readonly bankName: string;
  readonly titularName: string;
}

export interface TransferStudentNotice {
  readonly studentEmail: string;
  readonly studentName: string;
  readonly courseTitle: string;
  readonly amount: number;
  readonly bankDetails: TransferBankDetailsNotice;
  readonly referenceCode: string;
  readonly mentorName: string;
  readonly mentorEmail: string;
}

export interface TransferMentorNotice {
  readonly mentorEmail: string;
  readonly mentorName: string;
  readonly studentName: string;
  readonly studentEmail: string;
  readonly courseTitle: string;
  readonly amount: number;
  readonly referenceCode: string;
}

/** Emails de transferencia (no críticos: el caller los envuelve en try/catch). */
export interface TransferNotifier {
  sendStudentNotice(notice: TransferStudentNotice): Promise<void>;
  sendMentorNotice(notice: TransferMentorNotice): Promise<void>;
}

export interface TrialActivation {
  readonly trialDays: number;
  readonly trialEndsAt: Date;
}

/** Activación de trial reutilizando el use-case F0.1 de identidad. */
export interface TrialActivator {
  activateTrial(tutorId: string, planId: string): Promise<TrialActivation>;
}
