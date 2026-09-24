import { z } from 'zod';
import { err, ok, type Result } from '@/domain/shared/result';
import { forbidden, notFound, validationError, type DomainError } from '@/domain/shared/errors';

export const ManualEnrollmentInputSchema = z.object({
  mentorId: z.string().min(1),
  courseId: z.string().min(1),
  studentEmail: z.string().email(),
  studentName: z.string().min(1),
});

export type ManualEnrollmentInput = z.infer<typeof ManualEnrollmentInputSchema>;

export interface CourseInfo {
  id: string;
  title: string;
  mentorId: string;
}

export interface StudentInfo {
  id: string;
  name: string;
}

export interface ManualEnrollmentGateway {
  getCourseInfo(courseId: string): Promise<CourseInfo | null>;
  checkEnrollmentExists(enrollmentId: string): Promise<boolean>;
  findOrCreateStudent(email: string, fallbackName: string): Promise<StudentInfo>;
  createEnrollment(data: Record<string, unknown>): Promise<void>;
}

export interface ManualEnrollmentEmailService {
  sendWelcomeEmail(data: {
    studentEmail: string;
    studentName: string;
    courseTitle: string;
  }): Promise<void>;
}

export interface ManualEnrollmentDeps {
  readonly gateway: ManualEnrollmentGateway;
  readonly emails: ManualEnrollmentEmailService;
}

export async function manualEnrollment(
  deps: ManualEnrollmentDeps,
  input: unknown
): Promise<Result<{ enrollmentId: string; alreadyEnrolled: boolean }, DomainError>> {
  const parsed = ManualEnrollmentInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(validationError('Invalid input payload'));
  }

  const { mentorId, courseId, studentEmail, studentName } = parsed.data;
  const normalizedEmail = studentEmail.toLowerCase().trim();

  // 1. Verificar existencia y pertenencia del curso
  const course = await deps.gateway.getCourseInfo(courseId);
  if (!course) {
    return err(notFound(`Course ${courseId} not found`));
  }
  
  if (course.mentorId !== mentorId) {
    return err(forbidden('You do not have permission to manually enroll students in this course'));
  }

  // 2. Comprobar Idempotencia (¿Ya está enrolado?)
  const enrollmentId = `enroll_${courseId}_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`;
  const exists = await deps.gateway.checkEnrollmentExists(enrollmentId);
  if (exists) {
    return ok({ enrollmentId, alreadyEnrolled: true });
  }

  // 3. Buscar o crear al alumno
  const student = await deps.gateway.findOrCreateStudent(normalizedEmail, studentName);

  // 4. Crear la matrícula
  const enrollmentData = {
    id: enrollmentId,
    courseId,
    productId: courseId,
    productType: 'course',
    mentorId,
    inviteEmail: normalizedEmail,
    studentId: student.id,
    status: 'active',
    paymentId: 'manual',
    source: 'manual',
    progress: { completedModules: [] },
    progressPercent: 0,
    metadata: {
      enrolledBy: mentorId
    }
  };

  await deps.gateway.createEnrollment(enrollmentData);

  // 5. Enviar email de bienvenida (ignoramos fallos)
  try {
    await deps.emails.sendWelcomeEmail({
      studentEmail: normalizedEmail,
      studentName: student.name,
      courseTitle: course.title,
    });
  } catch (e) {
    console.error('[ManualEnrollment] Error sending welcome email:', e);
  }

  return ok({ enrollmentId, alreadyEnrolled: false });
}
