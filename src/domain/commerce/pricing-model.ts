/**
 * Comercio — Modelo de Precios por Pasarela (Unified Pricing Model).
 * Permite a los tutores fijar montos específicos por pasarela para absorber o
 * ajustar comisiones, garantizando retrocompatibilidad con cursos y landings preexistentes.
 */
import { z } from 'zod';
import { defaultGatewayRegistry } from './gateway-registry';

export const GatewayPricingItemSchema = z.object({
  gatewayId: z.string().min(1, 'gatewayId requerido'),
  amount: z.number().min(0, 'El monto no puede ser negativo'),
  currency: z.string().min(1).default('ARS'),
  isActive: z.boolean().default(true),
});
export type GatewayPricingItem = z.infer<typeof GatewayPricingItemSchema>;

export const UnifiedPricingSchema = z.object({
  basePriceUSD: z.number().min(0).optional(),
  pricesByGateway: z.record(GatewayPricingItemSchema).default({}),
});
export type UnifiedPricing = z.infer<typeof UnifiedPricingSchema>;

export interface ResolvePricingParams {
  readonly price?: number | null;
  readonly currency?: string | null;
  readonly pricing?: UnifiedPricing | null;
  readonly tutorCountry?: string | null;
}

/**
 * Valida la coherencia de moneda para una pasarela según su adaptador registrado.
 * Ejemplo: Mercado Pago en esta instancia opera exclusivamente en ARS.
 */
export function validateGatewayCurrency(gatewayId: string, currency: string): { valid: boolean; error?: string } {
  const adapter = defaultGatewayRegistry.get(gatewayId);
  if (!adapter) {
    return { valid: true };
  }
  const curr = currency.trim().toUpperCase();
  if (adapter.scope === 'LOCAL' && adapter.defaultCurrency !== curr) {
    return {
      valid: false,
      error: `La pasarela ${adapter.name} solo admite cobros en ${adapter.defaultCurrency}`,
    };
  }
  return { valid: true };
}

/**
 * Normaliza y resuelve la configuración de precios unificada.
 * Si el curso o landing tiene estructura legacy (price + currency), infiere
 * automáticamente los precios por pasarela sin romper compatibilidad.
 */
export function resolveEffectivePricing(params: ResolvePricingParams): UnifiedPricing {
  const existing = params.pricing;
  if (existing && existing.pricesByGateway && Object.keys(existing.pricesByGateway).length > 0) {
    return {
      basePriceUSD: existing.basePriceUSD,
      pricesByGateway: existing.pricesByGateway,
    };
  }

  const legacyPrice = typeof params.price === 'number' && params.price >= 0 ? params.price : 0;
  const legacyCurrency = (params.currency || 'ARS').trim().toUpperCase();
  const pricesByGateway: Record<string, GatewayPricingItem> = {};

  if (legacyCurrency === 'ARS') {
    pricesByGateway['mercadopago'] = {
      gatewayId: 'mercadopago',
      amount: legacyPrice,
      currency: 'ARS',
      isActive: true,
    };
    pricesByGateway['getnet'] = {
      gatewayId: 'getnet',
      amount: legacyPrice,
      currency: 'ARS',
      isActive: true,
    };
    pricesByGateway['transfer'] = {
      gatewayId: 'transfer',
      amount: legacyPrice,
      currency: 'ARS',
      isActive: true,
    };
  } else if (legacyCurrency === 'USD') {
    pricesByGateway['stripe'] = {
      gatewayId: 'stripe',
      amount: legacyPrice,
      currency: 'USD',
      isActive: true,
    };
    pricesByGateway['paypal'] = {
      gatewayId: 'paypal',
      amount: legacyPrice,
      currency: 'USD',
      isActive: true,
    };
  } else {
    pricesByGateway['default'] = {
      gatewayId: 'default',
      amount: legacyPrice,
      currency: legacyCurrency,
      isActive: true,
    };
  }

  return {
    basePriceUSD: legacyCurrency === 'USD' ? legacyPrice : undefined,
    pricesByGateway,
  };
}

