/**
 * Comercio — Caso de uso: opciones de pago públicas del tutor (F1.3).
 * Lógica 1:1 con `GET api/tutors/[username]/payment-options` legacy
 * (el `username` de la URL es el mentorId/UID): 400 sin mentorId y lista
 * de métodos activos con config SANITIZADA (nunca accessToken ni
 * secretos: MP solo publicKey, transfer solo alias/cbu/banco/titular).
 * Dominio puro: lee por `PaymentMethodRepository`.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import type { DomainError } from '@/domain/shared/errors';
import type { PaymentMethodRepository } from '../payment-method-repository';

import { legacyHttpError } from './legacy-response';

export const ListPaymentOptionsInputSchema = z.object({
  mentorId: z.string().nullish(),
});
export type ListPaymentOptionsInput = z.infer<typeof ListPaymentOptionsInputSchema>;

export interface PaymentOption {
  readonly id: string;
  readonly name: unknown;
  readonly type: unknown;
  readonly config: Record<string, string>;
}

export type PaymentOptionsSource = Pick<PaymentMethodRepository, 'listActiveTutorMethods'>;

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function sanitizeConfig(type: unknown, config: Record<string, unknown> | undefined): Record<string, string> {
  const cfg = config ?? {};
  if (type === 'mercadopago') {
    return { publicKey: str(cfg.publicKey) };
  }
  if (type === 'transfer') {
    return {
      alias: str(cfg.alias),
      cbu: str(cfg.cbu),
      bankName: str(cfg.bankName),
      titularName: str(cfg.titularName),
    };
  }
  return {};
}

export async function listPaymentOptions(
  payments: PaymentOptionsSource,
  rawInput: unknown,
): Promise<Result<{ methods: PaymentOption[] }, DomainError>> {
  const parsed = ListPaymentOptionsInputSchema.safeParse(rawInput);
  const mentorId = parsed.success ? (parsed.data.mentorId ?? '') : '';
  if (!mentorId) {
    return err(legacyHttpError(400, { error: 'mentorId requerido' }));
  }
  const methods = await payments.listActiveTutorMethods(mentorId);
  return ok({
    methods: methods.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      config: sanitizeConfig(m.type, m.config),
    })),
  });
}
