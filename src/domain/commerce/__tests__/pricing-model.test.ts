import { describe, it, expect } from 'vitest';
import {
  resolveEffectivePricing,
  validateGatewayCurrency,
  UnifiedPricingSchema,
} from '../pricing-model';
import { CourseSchema } from '../../catalog/course';
import { SalesPageSchema } from '../../catalog/sales-page';

describe('Pricing Model & Backward Compatibility (TC-PRC)', () => {
  describe('TC-PRC-01: Curso legacy sin precios por pasarela', () => {
    it('infiere automáticamente precios locales en ARS para curso legacy con price en ARS', () => {
      const resolved = resolveEffectivePricing({
        price: 15000,
        currency: 'ARS',
      });

      expect(resolved.pricesByGateway['mercadopago']).toEqual({
        gatewayId: 'mercadopago',
        amount: 15000,
        currency: 'ARS',
        isActive: true,
      });
      expect(resolved.pricesByGateway['getnet']).toEqual({
        gatewayId: 'getnet',
        amount: 15000,
        currency: 'ARS',
        isActive: true,
      });
      expect(resolved.pricesByGateway['transfer']).toEqual({
        gatewayId: 'transfer',
        amount: 15000,
        currency: 'ARS',
        isActive: true,
      });
      expect(resolved.basePriceUSD).toBeUndefined();
    });

    it('infiere automáticamente pasarelas globales en USD para curso legacy con price en USD', () => {
      const resolved = resolveEffectivePricing({
        price: 29,
        currency: 'USD',
      });

      expect(resolved.basePriceUSD).toBe(29);
      expect(resolved.pricesByGateway['stripe']).toEqual({
        gatewayId: 'stripe',
        amount: 29,
        currency: 'USD',
        isActive: true,
      });
      expect(resolved.pricesByGateway['paypal']).toEqual({
        gatewayId: 'paypal',
        amount: 29,
        currency: 'USD',
        isActive: true,
      });
    });
  });

  describe('TC-PRC-02: Curso con precios explícitos por pasarela', () => {
    it('conserva exactamente los montos configurados por el tutor sin conversiones automáticas', () => {
      const customPricing = {
        basePriceUSD: 30,
        pricesByGateway: {
          mercadopago: {
            gatewayId: 'mercadopago',
            amount: 25000,
            currency: 'ARS',
            isActive: true,
          },
          getnet: {
            gatewayId: 'getnet',
            amount: 23500,
            currency: 'ARS',
            isActive: true,
          },
          transfer: {
            gatewayId: 'transfer',
            amount: 22000,
            currency: 'ARS',
            isActive: true,
          },
          stripe: {
            gatewayId: 'stripe',
            amount: 25,
            currency: 'USD',
            isActive: true,
          },
        },
      };

      const resolved = resolveEffectivePricing({
        price: 99999, // Debe ser ignorado porque pricing ya existe
        pricing: customPricing,
      });

      expect(resolved.pricesByGateway['mercadopago'].amount).toBe(25000);
      expect(resolved.pricesByGateway['getnet'].amount).toBe(23500);
      expect(resolved.pricesByGateway['transfer'].amount).toBe(22000);
      expect(resolved.pricesByGateway['stripe'].amount).toBe(25);
      expect(resolved.basePriceUSD).toBe(30);
    });

    it('valida CourseSchema y SalesPageSchema con pricing opcional', () => {
      const course = CourseSchema.parse({
        id: 'c1',
        mentorId: 'm1',
        title: 'Curso de Prueba',
        categoryId: 'cat1',
        status: 'published',
        pricing: {
          basePriceUSD: 20,
          pricesByGateway: {
            stripe: {
              gatewayId: 'stripe',
              amount: 20,
              currency: 'USD',
              isActive: true,
            },
          },
        },
      });

      expect(course.pricing?.pricesByGateway['stripe'].amount).toBe(20);

      const salesPage = SalesPageSchema.parse({
        id: 'sp1',
        mentorId: 'm1',
        title: 'Landing de Prueba',
        pricing: {
          pricesByGateway: {
            mercadopago: {
              gatewayId: 'mercadopago',
              amount: 10000,
              currency: 'ARS',
              isActive: true,
            },
          },
        },
      });

      expect(salesPage.pricing?.pricesByGateway['mercadopago'].amount).toBe(10000);
    });
  });

  describe('TC-PRC-03: Validación de coherencia de moneda por pasarela', () => {
    it('rechaza monedas incompatibles para pasarelas locales argentinas', () => {
      const checkMP = validateGatewayCurrency('mercadopago', 'EUR');
      expect(checkMP.valid).toBe(false);
      expect(checkMP.error).toContain('solo admite cobros en ARS');

      const checkValidMP = validateGatewayCurrency('mercadopago', 'ARS');
      expect(checkValidMP.valid).toBe(true);
    });

    it('permite monedas globales en pasarelas globales como Stripe', () => {
      const checkStripe = validateGatewayCurrency('stripe', 'USD');
      expect(checkStripe.valid).toBe(true);
    });
  });
});

