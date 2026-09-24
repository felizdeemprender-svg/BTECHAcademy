import { z } from 'zod';
import { err, ok, type Result } from '@/domain/shared/result';
import { notFound, validationError, type DomainError } from '@/domain/shared/errors';

export const UpdateStudentProgressInputSchema = z.object({
  enrollmentId: z.string().min(1),
  moduleId: z.string().min(1),
  completed: z.boolean(),
});

export type UpdateStudentProgressInput = z.infer<typeof UpdateStudentProgressInputSchema>;

export interface EnrollmentProgress {
  completedModules: string[];
}

export interface MentoringGateway {
  getEnrollmentProgress(enrollmentId: string): Promise<EnrollmentProgress | null>;
  updateEnrollmentProgress(enrollmentId: string, progress: EnrollmentProgress): Promise<void>;
  checkIfCourseCompleted(enrollmentId: string, progress: EnrollmentProgress): Promise<boolean>;
  issueCertificate(enrollmentId: string): Promise<void>;
}

export interface UpdateStudentProgressDeps {
  readonly gateway: MentoringGateway;
}

export async function updateStudentProgress(
  deps: UpdateStudentProgressDeps,
  input: unknown
): Promise<Result<{ enrollmentId: string; courseCompleted: boolean }, DomainError>> {
  const parsed = UpdateStudentProgressInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(validationError('Invalid input payload'));
  }

  const { enrollmentId, moduleId, completed } = parsed.data;

  const progress = await deps.gateway.getEnrollmentProgress(enrollmentId);
  if (!progress) {
    return err(notFound('Enrollment not found'));
  }

  let updated = false;
  const currentSet = new Set(progress.completedModules);

  if (completed && !currentSet.has(moduleId)) {
    currentSet.add(moduleId);
    updated = true;
  } else if (!completed && currentSet.has(moduleId)) {
    currentSet.delete(moduleId);
    updated = true;
  }

  if (!updated) {
    // No changes needed
    return ok({ enrollmentId, courseCompleted: false });
  }

  const newProgress = { completedModules: Array.from(currentSet) };
  await deps.gateway.updateEnrollmentProgress(enrollmentId, newProgress);

  const courseCompleted = await deps.gateway.checkIfCourseCompleted(enrollmentId, newProgress);
  if (courseCompleted) {
    await deps.gateway.issueCertificate(enrollmentId);
  }

  return ok({ enrollmentId, courseCompleted });
}
