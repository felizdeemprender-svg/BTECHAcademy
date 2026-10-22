/**
 * Caso de Uso: Actualizar Permisos Delegados de un Tutor de Empresa.
 */
import { z } from 'zod';
import { Result, ok, err } from '@/domain/shared/result';
import { notFound, validationError, DomainError } from '@/domain/shared/errors';
import {
  CompanyTutorBinding,
  CompanyTutorPermissions,
  CompanyTutorPermissionsSchema,
  CompanyTutorRoleSchema,
  CompanyTutorStatusSchema,
} from '../permissions';
import { CompanyRepository } from '../ports';

export const UpdateTutorPermissionsInputSchema = z.object({
  companyId: z.string().min(1, 'companyId requerido'),
  tutorId: z.string().min(1, 'tutorId requerido'),
  permissions: CompanyTutorPermissionsSchema.optional(),
  roles: z.array(CompanyTutorRoleSchema).min(1, 'Al menos un rol requerido (mentor o marketing)').optional(),
  status: CompanyTutorStatusSchema.optional(),
});
export type UpdateTutorPermissionsInput = z.infer<typeof UpdateTutorPermissionsInputSchema>;

export async function updateTutorPermissions(
  repo: CompanyRepository,
  input: UpdateTutorPermissionsInput,
): Promise<Result<CompanyTutorBinding, DomainError>> {
  const parsed = UpdateTutorPermissionsInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(validationError('Permisos de tutor inválidos', parsed.error.format()));
  }

  const { companyId, tutorId, permissions, roles, status } = parsed.data;

  // 1. Obtener la vinculación del tutor
  const binding = await repo.getTutorBinding(companyId, tutorId);
  if (!binding) {
    return err(notFound(`El tutor "${tutorId}" no está vinculado a la empresa "${companyId}".`));
  }

  // 2. Actualizar las potestades, roles y estado
  const updatedBinding: CompanyTutorBinding = {
    ...binding,
    status: status || binding.status || 'active',
    roles: roles || binding.roles || ['mentor'],
    permissions: permissions
      ? {
          ...binding.permissions,
          ...permissions,
        }
      : binding.permissions,
  };

  const saved = await repo.saveTutorBinding(companyId, updatedBinding);
  return ok(saved);
}
