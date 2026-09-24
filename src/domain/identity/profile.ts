/**
 * Kernel identidad — Perfil público del usuario.
 * Leniente con strings (convive con datos viejos), estricto con tipos.
 */

import { z } from 'zod';

export const SocialsSchema = z
  .object({
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    youtube: z.string().optional(),
    tiktok: z.string().optional(),
    whatsapp: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
  })
  .partial();
export type Socials = z.infer<typeof SocialsSchema>;

export const UserProfileSchema = z.object({
  bio: z.string().optional(),
  socials: SocialsSchema.optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;
