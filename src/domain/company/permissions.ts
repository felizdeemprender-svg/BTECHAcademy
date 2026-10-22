/**
 * Dominio Empresa — Gobernanza de Permisos Delegados para Tutores.
 * La empresa define las potestades granulares de cada tutor asociado.
 */
import { z } from 'zod';

export const CompanyTutorPermissionsSchema = z.object({
  /** ¿Puede crear borradores de cursos? (La publicación final es potestad exclusiva de la empresa) */
  canCreateCourses: z.boolean().default(false),
  /** ¿Puede crear programas o mentorías personalizadas bajo la empresa? */
  canCreatePrograms: z.boolean().default(false),
  /** ¿Puede matricular, editar o reasignar alumnos? Si es false, solo ve a sus asignados */
  canManageStudents: z.boolean().default(false),
  /** ¿Puede crear landings de venta o acceder a marketing bajo la empresa? */
  canAccessMarketing: z.boolean().default(false),
  /** ¿Puede crear y gestionar campañas de marketing multicanal? */
  canCreateCampaigns: z.boolean().default(false),
  /** ¿Puede crear y producir videos con IA (avatares, guiones)? */
  canCreateVideos: z.boolean().default(false),
});
export type CompanyTutorPermissions = z.infer<typeof CompanyTutorPermissionsSchema>;

export const DEFAULT_COMPANY_TUTOR_PERMISSIONS: CompanyTutorPermissions = {
  canCreateCourses: false,
  canCreatePrograms: false,
  canManageStudents: false,
  canAccessMarketing: false,
  canCreateCampaigns: false,
  canCreateVideos: false,
};

export const CompanyTutorStatusSchema = z.enum(['active', 'invited', 'suspended']);
export type CompanyTutorStatus = z.infer<typeof CompanyTutorStatusSchema>;

export const CompanyTutorRoleSchema = z.enum(['mentor', 'marketing']);
export type CompanyTutorRole = z.infer<typeof CompanyTutorRoleSchema>;

export const CompanyTutorBindingSchema = z.object({
  companyId: z.string().min(1, 'companyId requerido'),
  tutorId: z.string().min(1, 'tutorId requerido'),
  email: z.string().email('Email inválido'),
  displayName: z.string().min(1, 'Nombre requerido'),
  roles: z.array(CompanyTutorRoleSchema).min(1, 'Al menos un rol requerido (mentor o marketing)').default(['mentor']),
  status: CompanyTutorStatusSchema.default('invited'),
  permissions: CompanyTutorPermissionsSchema.default(DEFAULT_COMPANY_TUTOR_PERMISSIONS),
  assignedStudentsCount: z.number().int().min(0).default(0),
  joinedAt: z.union([z.date(), z.string()]).optional(),
});
export type CompanyTutorBinding = z.infer<typeof CompanyTutorBindingSchema>;

/**
 * Rutas de configuración administradas exclusivamente por la empresa titular.
 * Los tutores vinculados a una empresa no tienen potestad sobre estas opciones.
 */
export const CORPORATE_MANAGED_SETTINGS_HREFS = [
  '/settings/evo',
  '/settings/avatars',
  '/settings/plan',
  '/settings/payment-methods',
  '/settings/transfers',
  '/settings/publishing-engines',
] as const;

/**
 * Determina de forma unificada si un perfil de usuario es un tutor dependiente de una empresa.
 * Se excluyen Administradores globales y titulares/propietarios de la empresa.
 */
export function isCompanyTutorProfile(profile?: {
  roles?: string[];
  companyRole?: string;
  companyId?: string | null;
  isEnterprise?: boolean;
  email?: string | null;
} | null): boolean {
  if (!profile) return false;
  const email = profile.email?.toLowerCase().trim();
  if (email === 'felizdeemprender@gmail.com') return false;
  if (profile.roles?.includes('admin')) return false;
  if (profile.roles?.includes('empresa') || profile.companyRole === 'owner' || profile.isEnterprise) return false;
  return Boolean(profile.companyRole === 'tutor' || profile.companyId);
}

/**
 * Mapea las potestades y roles delegados de una empresa a los identificadores
 * de permisos de `mentorPermissions` para el documento del usuario en Firestore.
 */
export function mapCompanyPermissionsToMentorPermissions(
  roles: string[] = ['mentor'],
  permissions?: Partial<CompanyTutorPermissions> | null
): string[] {
  const perms: string[] = [];
  const isMentor = roles.includes('mentor');
  const isMarketing = roles.includes('marketing');

  if (isMentor) {
    if (permissions?.canCreateCourses) perms.push('academic_management');
    if (permissions?.canCreatePrograms) perms.push('mentor_challenges');
    if (permissions?.canManageStudents) perms.push('students_view');
    // Seguimientos educativos básicos para el mentor
    perms.push('followups_management');
  }

  if (isMarketing) {
    if (permissions?.canCreateCampaigns) perms.push('marketing_campaigns');
    if (permissions?.canCreateVideos) perms.push('video_creation');
    if (permissions?.canAccessMarketing) {
      perms.push('marketing_access');
      perms.push('landing_access');
    }
  }

  // REGLA FUNDAMENTAL DE AISLAMIENTO CORPORATIVO:
  // Los tutores de empresa NUNCA reciben 'automations_access', ya que la gestión
  // de bots, canales y flujos automáticos es potestad exclusiva de la empresa titular.
  return perms;
}
