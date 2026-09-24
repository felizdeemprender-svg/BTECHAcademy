/**
 * Paso 0 — Identificadores del dominio.
 * Mismo runtime (string) que los IDs actuales de Firestore,
 * pero tipos distintos para evitar mezclarlos.
 */

import { z } from 'zod';

export const UserIdSchema = z.string().min(1, 'UserId vacío').brand<'UserId'>();
export type UserId = z.infer<typeof UserIdSchema>;

export const MentorIdSchema = z.string().min(1, 'MentorId vacío').brand<'MentorId'>();
export type MentorId = z.infer<typeof MentorIdSchema>;

export const CourseIdSchema = z.string().min(1, 'CourseId vacío').brand<'CourseId'>();
export type CourseId = z.infer<typeof CourseIdSchema>;

export const CampaignIdSchema = z.string().min(1, 'CampaignId vacío').brand<'CampaignId'>();
export type CampaignId = z.infer<typeof CampaignIdSchema>;

export const FollowUpIdSchema = z.string().min(1, 'FollowUpId vacío').brand<'FollowUpId'>();
export type FollowUpId = z.infer<typeof FollowUpIdSchema>;

export const SalesPageIdSchema = z
  .string()
  .min(1, 'SalesPageId vacío')
  .brand<'SalesPageId'>();
export type SalesPageId = z.infer<typeof SalesPageIdSchema>;

export const EnrollmentIdSchema = z
  .string()
  .min(1, 'EnrollmentId vacío')
  .brand<'EnrollmentId'>();
export type EnrollmentId = z.infer<typeof EnrollmentIdSchema>;

export function parseUserId(value: unknown): UserId {
  return UserIdSchema.parse(value);
}

export function parseMentorId(value: unknown): MentorId {
  return MentorIdSchema.parse(value);
}
