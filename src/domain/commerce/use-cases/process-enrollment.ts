import { z } from 'zod';
import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';

export const ProcessEnrollmentInputSchema = z.object({
  paymentId: z.string().min(1),
  externalReference: z.string().min(1),
  status: z.string(),
});

export type ProcessEnrollmentInput = z.infer<typeof ProcessEnrollmentInputSchema>;

export interface BundleItem {
  productId: string;
  productType: string;
}

export interface SalesPageInfo {
  id: string;
  productId?: string;
  courseId?: string;
  productType?: string;
  bundleItems?: BundleItem[];
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
    productType?: string;
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

  const itemsToProcess: BundleItem[] = page.bundleItems && page.bundleItems.length > 0
    ? page.bundleItems
    : [{ productId: page.productId || page.courseId || '', productType: page.productType || 'course' }];

  const validItems = itemsToProcess.filter(item => item.productId);

  if (validItems.length === 0) {
    return err(validationError(`SalesPage ${pageId} has no associated products`));
  }

  // 3. Find or Create Student
  const studentNameFallback = normalizedEmail.split('@')[0];
  const student = await deps.gateway.findOrCreateStudent(normalizedEmail, studentNameFallback);

  const results: string[] = [];
  let totalRevenue = 0;

  for (const item of validItems) {
    const pId = item.productId;
    const pType = item.productType;

    // 2. Check Enrollment Idempotence
    const enrollmentId = `enroll_${pId}_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`;
    const exists = await deps.gateway.checkEnrollmentExists(enrollmentId);
    
    if (!exists) {
      // 4. Create Enrollment
      const enrollmentData = {
        id: enrollmentId,
        courseId: pId,
        productId: pId,
        productType: pType,
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
          externalReference,
          isBundle: validItems.length > 1
        }
      };

      await deps.gateway.createEnrollment(enrollmentData);
      results.push(enrollmentId);

      // Post-Enrollment revenue tracking
      try {
        const productInfo = await deps.gateway.getProductInfo(pId, pType);
        const price = productInfo?.price || 0;
        totalRevenue += price;
        
        // Welcome email per product
        const title = productInfo?.title || (pType === 'followup' ? 'tu mentoría' : 'tu curso');
        let mentorName: string | undefined;
        let mentorEmail: string | undefined;

        if (mentorId) {
          const mInfo = await deps.gateway.getMentorInfo(mentorId);
          mentorName = mInfo?.name;
          mentorEmail = mInfo?.email;
        }

        await deps.emails.sendWelcomeEmail({
          studentEmail: normalizedEmail,
          studentName: student.name,
          courseTitle: title,
          mentorName,
          mentorEmail,
          productType: pType
        });
      } catch (err) {
        console.error(`[ProcessEnrollment] Error in post-enrollment for item ${pId}:`, err);
      }
    }
  }

  // Mentor revenue (aggregated)
  if (mentorId && totalRevenue > 0) {
    try {
      await deps.gateway.incrementMentorSales(mentorId, totalRevenue);
    } catch (err) {
      console.error('[ProcessEnrollment] Error incrementing mentor sales:', err);
    }
  }

  // 6. Update Page Stats
  try {
    await deps.gateway.incrementPageConversions(pageId);
  } catch (err) {
    console.error('[ProcessEnrollment] Error updating page stats:', err);
  }

  // 7. Convert Lead (using first product ID for legacy compatibility)
  try {
    await deps.gateway.convertLead(normalizedEmail, validItems[0].productId, paymentId);
  } catch (err) {
    console.error('[ProcessEnrollment] Error converting lead:', err);
  }

  return ok({ enrollmentId: results.join(','), alreadyEnrolled: results.length === 0 });
}
