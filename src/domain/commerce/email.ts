/**
 * Comercio — Email normalizado.
 * Regla usada en webhooks, transferencias y leads:
 * minúsculas + trim antes de comparar o generar IDs.
 */
import { z } from 'zod';

export const EmailSchema = z.string().email('email inválido');
export type Email = z.infer<typeof EmailSchema>;

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function parseNormalizedEmail(value: unknown): string {
  if (typeof value !== 'string') throw new Error('email inválido');
  return EmailSchema.parse(normalizeEmail(value));
}
