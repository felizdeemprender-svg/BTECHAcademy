/**
 * Kernel identidad — Roles.
 * Refleja `RoleType` actual ('alumno' | 'mentor' | 'marketing' | 'admin')
 * con validación estricta y helpers puros.
 */

import { z } from 'zod';

export const RoleTypeSchema = z.enum(['alumno', 'mentor', 'marketing', 'admin']);
export type RoleType = z.infer<typeof RoleTypeSchema>;

export const RolesSchema = z.array(RoleTypeSchema).min(1, 'roles vacío');
export type Roles = z.infer<typeof RolesSchema>;

export function hasRole(roles: readonly RoleType[], role: RoleType): boolean {
  return roles.includes(role);
}

export function isMentorRole(roles: readonly RoleType[]): boolean {
  return hasRole(roles, 'mentor');
}

export function isAdminRole(roles: readonly RoleType[]): boolean {
  return hasRole(roles, 'admin');
}

export function isAlumnoRole(roles: readonly RoleType[]): boolean {
  return hasRole(roles, 'alumno');
}
