import { describe, it, expect } from 'vitest';
import {
  PaymentGatewayRegistry,
  defaultGatewayRegistry,
  MercadoPagoAdapter,
  GetnetAdapter,
  BankTransferAdapter,
  StripeAdapter,
  PayPalAdapter,
} from '../index';

describe('PaymentGatewayRegistry & Adapters (TC-DOM & TC-GEO)', () => {
  describe('TC-DOM-01: Registro y recuperación de adaptadores', () => {
    it('recupera correctamente los adaptadores registrados con sus metadatos', () => {
      const registry = new PaymentGatewayRegistry();
      const mp = new MercadoPagoAdapter();
      const stripe = new StripeAdapter();

      registry.register(mp).register(stripe);

      expect(registry.get('mercadopago')).toBe(mp);
      expect(registry.get('stripe')).toBe(stripe);

      expect(mp.defaultCurrency).toBe('ARS');
      expect(mp.scope).toBe('LOCAL');
      expect(mp.supportedCountries).toEqual(['AR']);

      expect(stripe.defaultCurrency).toBe('USD');
      expect(stripe.scope).toBe('GLOBAL');
      expect(stripe.supportedCountries).toBe('GLOBAL');
    });
  });

  describe('TC-DOM-02: Manejo de pasarelas desconocidas', () => {
    it('retorna undefined de forma segura cuando la pasarela no existe en el registro', () => {
      const registry = new PaymentGatewayRegistry();
      expect(registry.get('pasarela_ficticia')).toBeUndefined();
      expect(registry.has('pasarela_ficticia')).toBe(false);
    });
  });

  describe('TC-DOM-03: Cálculo de comisiones según adaptador', () => {
    it('calcula comisión estimada para Mercado Pago', () => {
      const mp = new MercadoPagoAdapter(0.06, 0);
      expect(mp.calculateFee(10000)).toBe(600);
      expect(mp.calculateFee(0)).toBe(0);
      expect(mp.calculateFee(-50)).toBe(0);
    });

    it('calcula comisión estimada para Getnet', () => {
      const getnet = new GetnetAdapter(0.045, 0);
      expect(getnet.calculateFee(10000)).toBe(450);
    });

    it('reporta comisión 0 para transferencia bancaria directa', () => {
      const transfer = new BankTransferAdapter('transfer');
      expect(transfer.calculateFee(50000)).toBe(0);
      expect(transfer.isManual).toBe(true);
    });

    it('calcula comisión estimada para Stripe en USD', () => {
      const stripe = new StripeAdapter(0.039, 0.30);
      // 100 USD * 3.9% = 3.90 + 0.30 = 4.20
      expect(stripe.calculateFee(100)).toBe(4.20);
    });

    it('calcula comisión estimada para PayPal en USD', () => {
      const paypal = new PayPalAdapter(0.054, 0.30);
      // 50 USD * 5.4% = 2.70 + 0.30 = 3.00
      expect(paypal.calculateFee(50)).toBe(3.00);
    });
  });

  describe('TC-GEO-01: Filtrado de pasarelas para comprador local (mismo país)', () => {
    it('incluye métodos locales como principales y métodos globales como secundarios cuando tutor y alumno son de AR', () => {
      const result = defaultGatewayRegistry.filterEligibleGateways({
        tutorCountry: 'AR',
        buyerCountry: 'AR',
        activeTutorGatewayIds: ['mercadopago', 'getnet', 'transfer', 'stripe'],
      });

      const localIds = result.local.map((g) => g.id);
      const globalIds = result.global.map((g) => g.id);

      expect(localIds).toContain('mercadopago');
      expect(localIds).toContain('getnet');
      expect(localIds).toContain('transfer');
      expect(globalIds).toContain('stripe');
      expect(result.all).toHaveLength(4);
      expect(result.hasCompatibleGateway).toBe(true);
    });
  });

  describe('TC-GEO-02: Filtrado estricto para comprador internacional (distinto país)', () => {
    it('excluye automáticamente pasarelas locales y conserva solo pasarelas globales cuando el alumno es de otro país', () => {
      const result = defaultGatewayRegistry.filterEligibleGateways({
        tutorCountry: 'AR',
        buyerCountry: 'CL', // Alumno desde Chile
        activeTutorGatewayIds: ['mercadopago', 'getnet', 'transfer', 'stripe'],
      });

      expect(result.local).toHaveLength(0);
      expect(result.global.map((g) => g.id)).toEqual(['stripe']);
      expect(result.all.map((g) => g.id)).toEqual(['stripe']);
      expect(result.hasCompatibleGateway).toBe(true);
    });
  });

  describe('TC-GEO-03: Comprador internacional sin pasarelas compatibles', () => {
    it('retorna lista vacía y hasCompatibleGateway = false si el tutor solo configuró medios locales y el alumno es del exterior', () => {
      const result = defaultGatewayRegistry.filterEligibleGateways({
        tutorCountry: 'AR',
        buyerCountry: 'US', // Alumno desde Estados Unidos
        activeTutorGatewayIds: ['mercadopago', 'transfer'], // Tutor no tiene Stripe
      });

      expect(result.local).toHaveLength(0);
      expect(result.global).toHaveLength(0);
      expect(result.all).toHaveLength(0);
      expect(result.hasCompatibleGateway).toBe(false);
    });
  });
});

