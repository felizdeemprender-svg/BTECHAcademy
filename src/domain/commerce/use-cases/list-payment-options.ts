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
import { defaultGatewayRegistry } from '../gateway-registry';

import { legacyHttpError } from './legacy-response';

export const ListPaymentOptionsInputSchema = z.object({
  mentorId: z.string().nullish(),
  buyerCountry: z.string().nullish(),
  tutorCountry: z.string().nullish(),
});
export type ListPaymentOptionsInput = z.infer<typeof ListPaymentOptionsInputSchema>;

export interface PaymentOption {
  readonly id: string;
  readonly name: unknown;
  readonly type: unknown;
  readonly config: Record<string, string>;
  readonly scope?: 'LOCAL' | 'GLOBAL';
  readonly defaultCurrency?: string;
}

export type PaymentOptionsSource = Pick<PaymentMethodRepository, 'listActiveTutorMethods'> &
  Partial<Pick<PaymentMethodRepository, 'getMentorProfile'>>;

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function sanitizeConfig(type: unknown, config: Record<string, unknown> | undefined): Record<string, string> {
  const cfg = config ?? {};
  if (type === 'mercadopago') {
    return { publicKey: str(cfg.publicKey) };
  }
  if (type === 'stripe') {
    return { publishableKey: str(cfg.publishableKey || cfg.publicKey) };
  }
  if (type === 'getnet') {
    return { sellerId: str(cfg.sellerId) };
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
  const buyerCountry = parsed.success && parsed.data.buyerCountry ? parsed.data.buyerCountry.trim().toUpperCase() : null;
  let tutorCountry = parsed.success && parsed.data.tutorCountry ? parsed.data.tutorCountry.trim().toUpperCase() : '';

  if (!tutorCountry && payments.getMentorProfile) {
    try {
      const mentorProfile = await payments.getMentorProfile(mentorId);
      if (mentorProfile && typeof mentorProfile.homeCountry === 'string' && mentorProfile.homeCountry) {
        tutorCountry = mentorProfile.homeCountry.trim().toUpperCase();
      }
    } catch {
      // no-critical fallback
    }
  }
  if (!tutorCountry) tutorCountry = 'AR';

  let eligibleMethods = methods;
  if (buyerCountry) {
    const activeIds = methods.map((m) => String(m.type || m.id));
    const filterResult = defaultGatewayRegistry.filterEligibleGateways({
      tutorCountry,
      buyerCountry,
      activeTutorGatewayIds: activeIds,
    });
    const eligibleCanonicalIds = new Set(filterResult.all.map((g) => g.id.toLowerCase()));
    eligibleMethods = methods.filter((m) => {
      const typeStr = String(m.type || m.id).toLowerCase();
      const adapter = defaultGatewayRegistry.get(typeStr);
      return adapter && eligibleCanonicalIds.has(adapter.id.toLowerCase());
    });
  }

  const includeGeoMetadata = Boolean(buyerCountry);
  return ok({
    methods: eligibleMethods.map((m) => {
      const typeStr = String(m.type || m.id).toLowerCase();
      const adapter = defaultGatewayRegistry.get(typeStr);
      const baseObj: PaymentOption = {
        id: m.id,
        name: m.name,
        type: m.type,
        config: sanitizeConfig(m.type, m.config),
      };
      if (includeGeoMetadata) {
        return {
          ...baseObj,
          scope: adapter?.scope,
          defaultCurrency: adapter?.defaultCurrency,
        };
      }
      return baseObj;
    }),
  });
}
