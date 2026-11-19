/**
 * Caso de Uso: Asignar / Reasignar Alumno a un Tutor de la Empresa.
 */
import { z } from 'zod';
import { Result, ok, err } from '@/domain/shared/result';
import { notFound, forbidden, validationError, DomainError } from '@/domain/shared/errors';
import { CompanyRepository } from '../ports';

export const AssignStudentInputSchema = z.object({
  companyId: z.string().min(1, 'companyId requerido'),
  studentId: z.string().min(1, 'studentId requerido'),
  tutorId: z.string().min(1, 'tutorId requerido'),
});
export type AssignStudentInput = z.infer<typeof AssignStudentInputSchema>;

export interface AssignStudentResult {
  companyId: string;
  studentId: string;
  assignedTutorId: string;
  assignedTutorName: string;
}

export async function assignStudentToCompanyTutor(
  repo: CompanyRepository,
  input: AssignStudentInput,
): Promise<Result<AssignStudentResult, DomainError>> {
  const parsed = AssignStudentInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(validationError('Datos de asignación inválidos', parsed.error.format()));
  }

  const { companyId, studentId, tutorId } = parsed.data;

  // 1. Verificar existencia de la empresa
  const company = await repo.findById(companyId);
  if (!company) {
    return err(notFound(`Empresa "${companyId}" no encontrada.`));
  }

  // 2. Verificar que el tutor pertenezca a la empresa y esté activo
  const tutorBinding = await repo.getTutorBinding(companyId, tutorId);
  if (!tutorBinding) {
    return err(notFound(`El tutor "${tutorId}" no pertenece a la empresa "${companyId}".`));
  }

  if (tutorBinding.status !== 'active') {
    return err(forbidden(`El tutor "${tutorBinding.displayName}" no está activo en la empresa.`));
  }

  return ok({
    companyId,
    studentId,
    assignedTutorId: tutorId,
    assignedTutorName: tutorBinding.displayName,
  });
}
