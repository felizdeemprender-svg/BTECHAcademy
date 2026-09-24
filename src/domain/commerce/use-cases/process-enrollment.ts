import { z } from 'zod';
import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';

export const ProcessEnrollmentInputSchema = z.object({
  paymentId: z.string().min(1),
  externalReference: z.string().min(1),
  status: z.string(),
});

export type ProcessEnrollmentInput = z.infer<typeof ProcessEnrollmentInputSchema>;

export interface SalesPageInfo {
  id: string;
  productId?: string;
  courseId?: string;
  productType?: string;
}

export interface StudentInfo {
  id: string;
  name: string;
}

export interface ProductInfo {
  title: string;
  price: number;
}

export interface MentorInfo {
  name?: string;
  email?: string;
}

export interface CommerceGateway {
  getSalesPage(pageId: string): Promise<SalesPageInfo | null>;
  checkEnrollmentExists(enrollmentId: string): Promise<boolean>;
  findOrCreateStudent(email: string, fallbackName: string): Promise<StudentInfo>;
  createEnrollment(data: Record<string, unknown>): Promise<void>;
  getProductInfo(productId: string, productType: string): Promise<ProductInfo | null>;
  getMentorInfo(mentorId: string): Promise<MentorInfo | null>;
  incrementMentorSales(mentorId: string, amount: number): Promise<void>;
  incrementPageConversions(pageId: string): Promise<void>;
  convertLead(email: string, productId: string, paymentId: string): Promise<void>;
}

export interface EmailService {
  sendWelcomeEmail(data: {
    studentEmail: string;
    studentName: string;
    courseTitle: string;
    mentorName?: string;
    mentorEmail?: string;
  }): Promise<void>;
}

export interface ProcessEnrollmentDeps {
  readonly gateway: CommerceGateway;
  readonly emails: EmailService;
}

export async function processEnrollment(
  deps: ProcessEnrollmentDeps,
  input: unknown
): Promise<Result<{ enrollmentId: string; alreadyEnrolled: boolean }, DomainError>> {
  const parsed = ProcessEnrollmentInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(validationError('Invalid input payload'));
  }

  const { paymentId, externalReference, status } = parsed.data;

  if (status !== 'approved') {
    return err(validationError('Payment not approved', { reason: 'not_approved' }));
  }

  let refData: any;
  try {
    refData = JSON.parse(externalReference);
  } catch {
    return err(validationError('Invalid externalReference JSON'));
  }

  const { pageId, studentEmail, mentorId, referidoId } = refData;
  if (!pageId || !studentEmail) {
    return err(validationError('Missing pageId or studentEmail in externalReference'));
  }

  const normalizedEmail = studentEmail.toLowerCase().trim();

  // 1. Get Sales Page
  const page = await deps.gateway.getSalesPage(pageId);
  if (!page) {
    return err(notFound(`SalesPage ${pageId} not found`));
  }

  const productId = page.productId || page.courseId;
  const productType = page.productType || 'course';

  if (!productId) {
    return err(validationError(`SalesPage ${pageId} has no associated product`));
  }

  // 2. Check Enrollment Idempotence
  const enrollmentId = `enroll_${productId}_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`;
  const exists = await deps.gateway.checkEnrollmentExists(enrollmentId);
  if (exists) {
    return ok({ enrollmentId, alreadyEnrolled: true });
  }

  // 3. Find or Create Student
  const studentNameFallback = normalizedEmail.split('@')[0];
  const student = await deps.gateway.findOrCreateStudent(normalizedEmail, studentNameFallback);

  // 4. Create Enrollment
  // We pass a plain object to the gateway. The gateway will attach FieldValue.serverTimestamp() where needed.
  const enrollmentData = {
    id: enrollmentId,
    courseId: productId,
    productId: productId,
    productType: productType,
    mentorId,
    inviteEmail: normalizedEmail,
    studentId: student.id,
    status: 'active',
    paymentId: paymentId,
    source: 'mercadopago',
    progress: { completedModules: [] },
    progressPercent: 0,
    metadata: {
      pageId,
      externalReference
    }
  };

  await deps.gateway.createEnrollment(enrollmentData);

  // 5. Post-Enrollment: Revenue & Emails
  try {
    const productInfo = await deps.gateway.getProductInfo(productId, productType);
    const title = productInfo?.title || (productType === 'followup' ? 'tu mentoría' : 'tu curso');
    const price = productInfo?.price || 0;

    let mentorName: string | undefined;
    let mentorEmail: string | undefined;

    if (mentorId) {
      const mInfo = await deps.gateway.getMentorInfo(mentorId);
      mentorName = mInfo?.name;
      mentorEmail = mInfo?.email;

      if (price > 0) {
        await deps.gateway.incrementMentorSales(mentorId, price);
      }
    }

    await deps.emails.sendWelcomeEmail({
      studentEmail: normalizedEmail,
      studentName: student.name,
      courseTitle: title,
      mentorName,
      mentorEmail
    });
  } catch (err) {
    // We log but do not fail the process
    console.error('[ProcessEnrollment] Error in post-enrollment (revenue/email):', err);
  }

  // 6. Update Page Stats
  try {
    await deps.gateway.incrementPageConversions(pageId);
  } catch (err) {
    console.error('[ProcessEnrollment] Error updating page stats:', err);
  }

  // 7. Convert Lead
  try {
    await deps.gateway.convertLead(normalizedEmail, productId, paymentId);
  } catch (err) {
    console.error('[ProcessEnrollment] Error converting lead:', err);
  }

  return ok({ enrollmentId, alreadyEnrolled: false });
}
