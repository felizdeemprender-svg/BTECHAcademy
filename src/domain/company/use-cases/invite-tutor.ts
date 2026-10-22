/**
 * Caso de Uso: Invitar / Dar de alta Tutor en la Empresa con Control de Cuota.
 */
import { z } from 'zod';
import { Result, ok, err } from '@/domain/shared/result';
import { notFound, conflict, forbidden, validationError, DomainError } from '@/domain/shared/errors';
import { hasTutorCapacity } from '../company';
import {
  CompanyTutorBinding,
  CompanyTutorBindingSchema,
  CompanyTutorPermissionsSchema,
  CompanyTutorRoleSchema,
  DEFAULT_COMPANY_TUTOR_PERMISSIONS,
} from '../permissions';
import { CompanyRepository } from '../ports';

export const InviteTutorInputSchema = z.object({
  companyId: z.string().min(1, 'companyId requerido'),
  tutorId: z.string().min(1, 'tutorId requerido'),
  email: z.string().email('Email inválido'),
  displayName: z.string().min(1, 'Nombre requerido'),
  roles: z.array(CompanyTutorRoleSchema).min(1, 'Al menos un rol requerido (mentor o marketing)').default(['mentor']),
  permissions: CompanyTutorPermissionsSchema.default(DEFAULT_COMPANY_TUTOR_PERMISSIONS),
});
export type InviteTutorInput = z.input<typeof InviteTutorInputSchema>;

export async function inviteTutorToCompany(
  repo: CompanyRepository,
  input: InviteTutorInput,
): Promise<Result<CompanyTutorBinding, DomainError>> {
  const parsed = InviteTutorInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(validationError('Datos de tutor inválidos', parsed.error.format()));
  }

  const { companyId, tutorId, email, displayName, roles, permissions } = parsed.data;

  // 1. Obtener la empresa
  const company = await repo.findById(companyId);
  if (!company) {
    return err(notFound(`Empresa con ID "${companyId}" no encontrada.`));
  }

  // 2. Control de cupos / cuota del abono corporativo
  if (!hasTutorCapacity(company)) {
    return err(
      forbidden(
        `Límite de tutores alcanzado (${company.subscription.currentUsage.tutorsCount}/${company.subscription.limits.maxTutors}). Amplía tu abono para sumar más docentes.`,
        {
          current: company.subscription.currentUsage.tutorsCount,
          max: company.subscription.limits.maxTutors,
        },
      ),
    );
  }

  // 3. Verificar si el tutor ya está vinculado a esta empresa
  const existing = await repo.getTutorBinding(companyId, tutorId);
  if (existing) {
    return err(conflict(`El tutor "${email}" ya pertenece a esta empresa.`));
  }

  // 4. Crear el binding de tutor
  const binding: CompanyTutorBinding = {
    companyId,
    tutorId,
    email,
    displayName,
    roles,
    status: 'active',
    permissions,
    assignedStudentsCount: 0,
    joinedAt: new Date(),
  };

  const validated = CompanyTutorBindingSchema.parse(binding);
  const saved = await repo.saveTutorBinding(companyId, validated);

  // 5. Incrementar el contador de tutores de la empresa
  const newTutorsCount = company.subscription.currentUsage.tutorsCount + 1;
  await repo.updateUsage(companyId, { tutorsCount: newTutorsCount });

  return ok(saved);
}
