import { describe, it, expect } from 'vitest';
import { createOrderLedgerEntry, OrderLedgerSchema } from '../order-ledger';

describe('Order Ledger & Accounting (TC-ACC)', () => {
  describe('TC-ACC-01: Creación de orden con desglose multimoneda completo', () => {
    it('calcula y almacena correctamente los importes en cobro internacional (USD) para tutor local (ARS)', () => {
      const order = createOrderLedgerEntry({
        id: 'ord_123',
        courseId: 'c_abc',
        courseTitle: 'Master en Inteligencia Artificial',
        tutorId: 'tutor_ar',
        buyerEmail: 'alumno@espana.es',
        buyerName: 'Carlos Gomez',
        buyerCountry: 'ES',
        gatewayId: 'stripe',
        chargedAmount: 50,
        chargedCurrency: 'USD',
        exchangeRateToUSD: 1200, // 1 USD = 1200 ARS al momento del pago
        gatewayFee: 2.5,
        tutorHomeCurrency: 'ARS',
      });

      expect(order.id).toBe('ord_123');
      expect(order.chargedAmount).toBe(50);
      expect(order.chargedCurrency).toBe('USD');
      expect(order.amountInUSD).toBe(50);
      expect(order.exchangeRateToUSD).toBe(1200);
      expect(order.gatewayFee).toBe(2.5);
      expect(order.netAmount).toBe(47.5);
      expect(order.tutorHomeCurrency).toBe('ARS');
      // 47.5 USD netos * 1200 ARS/USD = 57.000 ARS
      expect(order.netInTutorCurrency).toBe(57000);
      expect(order.status).toBe('completed');
    });

    it('calcula y almacena correctamente cobro local en ARS', () => {
      const order = createOrderLedgerEntry({
        id: 'ord_456',
        courseId: 'c_abc',
        tutorId: 'tutor_ar',
        buyerEmail: 'alumno@argentina.ar',
        buyerCountry: 'AR',
        gatewayId: 'mercadopago',
        chargedAmount: 25000,
        chargedCurrency: 'ARS',
        exchangeRateToUSD: 1250, // 25.000 / 1250 = 20 USD
        gatewayFee: 1500,
        tutorHomeCurrency: 'ARS',
      });

      expect(order.chargedAmount).toBe(25000);
      expect(order.chargedCurrency).toBe('ARS');
      expect(order.amountInUSD).toBe(20);
      expect(order.gatewayFee).toBe(1500);
      expect(order.netAmount).toBe(23500);
      expect(order.netInTutorCurrency).toBe(23500);
    });
  });

  describe('TC-ACC-02: Inmutabilidad del registro contable', () => {
    it('los valores monetarios y cotización histórica permanecen inalterados ante nuevas variaciones cambiarias', () => {
      const originalDate = new Date('2026-05-10T14:30:00Z');
      const savedOrder = createOrderLedgerEntry({
        id: 'ord_historical',
        courseId: 'c_abc',
        tutorId: 'tutor_ar',
        buyerEmail: 'historico@test.com',
        gatewayId: 'stripe',
        chargedAmount: 100,
        chargedCurrency: 'USD',
        exchangeRateToUSD: 1000, // Cotización en mayo 2026
        gatewayFee: 4.2,
        tutorHomeCurrency: 'ARS',
        createdAt: originalDate,
      });

      // Simular tiempo futuro con cotización actual diferente (ej: 1600 ARS/USD)
      const currentExchangeRate = 1600;

      // Volver a parsear el registro existente desde la base de datos
      const rehydrated = OrderLedgerSchema.parse(savedOrder);

      // El registro histórico no muta
      expect(rehydrated.exchangeRateToUSD).toBe(1000);
      expect(rehydrated.netInTutorCurrency).toBe(95800); // 95.8 * 1000 = 95.800 ARS
      expect(rehydrated.amountInUSD).toBe(100);
      expect(rehydrated.createdAt).toEqual(originalDate);

      // Comprobación de que no usa currentExchangeRate
      expect(rehydrated.exchangeRateToUSD).not.toBe(currentExchangeRate);
    });
  });
});

