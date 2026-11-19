/**
 * Caso de Uso: Crear Empresa (B2B Multi-Tenant).
 */
import { z } from 'zod';
import { Result, ok, err } from '@/domain/shared/result';
import { conflict, validationError, DomainError } from '@/domain/shared/errors';
import { CompanySchema, Company, CompanyLimits } from '../company';
import { CompanyRepository } from '../ports';

export const CreateCompanyInputSchema = z.object({
  id: z.string().min(1, 'ID requerido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z
    .string()
    .min(2, 'Slug requerido')
    .regex(/^[a-z0-9-]+$/, 'Slug sólo minúsculas, números y guiones'),
  ownerId: z.string().min(1, 'ownerId requerido'),
  planId: z.string().default('plan_enterprise_standard'),
  limits: z
    .object({
      maxTutors: z.number().int().refine((v) => v === -1 || v >= 1).default(5),
      maxStudents: z.number().int().refine((v) => v === -1 || v >= 0).default(50),
    })
    .default({ maxTutors: 5, maxStudents: 50 }),
  branding: z
    .object({
      logoUrl: z.string().optional(),
      primaryColor: z.string().optional(),
    })
    .default({}),
});
export type CreateCompanyInput = z.input<typeof CreateCompanyInputSchema>;

export async function createCompany(
  repo: CompanyRepository,
  input: CreateCompanyInput,
): Promise<Result<Company, DomainError>> {
  const parsed = CreateCompanyInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(validationError('Datos de empresa inválidos', parsed.error.format()));
  }

  const { id, name, slug, ownerId, planId, limits, branding } = parsed.data;

  // Verificar si ya existe una empresa con ese slug
  const existingSlug = await repo.findBySlug(slug);
  if (existingSlug) {
    return err(conflict(`El slug de empresa "${slug}" ya está en uso.`));
  }

  // Verificar si el owner ya tiene una empresa
  const existingOwner = await repo.findByOwnerId(ownerId);
  if (existingOwner) {
    return err(conflict(`El usuario "${ownerId}" ya administra la empresa "${existingOwner.name}".`));
  }

  const newCompany: Company = {
    id,
    name,
    slug,
    ownerId,
    branding,
    subscription: {
      planId,
      status: 'active',
      limits,
      currentUsage: {
        tutorsCount: 0,
        studentsCount: 0,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validated = CompanySchema.parse(newCompany);
  const saved = await repo.save(validated);
  return ok(saved);
}
