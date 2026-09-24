/**
 * Kernel identidad — Usuario.
 * Shape canónico compatible con el documento `users` actual de Firestore.
 * Las fechas son `Date` de dominio (los repositorios mapearán Timestamp -> Date).
 */

import { z } from 'zod';

import { RolesSchema, type RoleType } from './roles';
import { UserProfileSchema } from './profile';
import { UserSubscriptionSchema } from './subscription';

export const SignInProviderSchema = z.enum(['google.com', 'password']);
export type SignInProvider = z.infer<typeof SignInProviderSchema>;

export const UserSchema = z.object({
  uid: z.string().min(1, 'uid vacío'),
  email: z.string().email('email inválido'),
  displayName: z.string().min(1, 'displayName vacío'),
  photoURL: z.string().optional(),
  username: z.string().optional(),
  signInProvider: SignInProviderSchema.optional(),
  roles: RolesSchema,
  isMentor: z.boolean(),
  isEnterprise: z.boolean().optional(),
  mentorPermissions: z.array(z.string()).default([]),
  isActive: z.boolean(),
  isPreRegistered: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  lastLogin: z.date().optional(),
  subscription: UserSubscriptionSchema.optional(),
  profile: UserProfileSchema.optional(),
  associatedMentors: z.array(z.string()).default([]),
});
export type User = z.infer<typeof UserSchema>;

export function parseUser(data: unknown): User {
  return UserSchema.parse(data);
}

export function hasMentorRole(user: Pick<User, 'roles'>): boolean {
  return user.roles.includes('mentor' satisfies RoleType);
}

export function canActAsMentor(user: Pick<User, 'roles' | 'isActive'>): boolean {
  return user.isActive && user.roles.includes('mentor' satisfies RoleType);
}

export function getPrimaryRole(user: Pick<User, 'roles'>): RoleType {
  return user.roles[0];
}
