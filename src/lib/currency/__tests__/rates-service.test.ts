import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  convertUsdAmount,
  formatCurrencyAmount,
  getCurrencyRates,
} from '../rates-service';
import {
  SUPPORTED_COUNTRIES,
  FALLBACK_RATES,
} from '../types';

describe('Currency Rates Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('SUPPORTED_COUNTRIES config', () => {
    it('Argentina should support mercadopago, transfer, getnet and stripe', () => {
      const ar = SUPPORTED_COUNTRIES.find((c) => c.code === 'AR');
      expect(ar).toBeDefined();
      expect(ar?.isDomesticArgentina).toBe(true);
      expect(ar?.allowedGateways).toContain('mercadopago');
      expect(ar?.allowedGateways).toContain('transfer');
      expect(ar?.allowedGateways).toContain('getnet');
      expect(ar?.allowedGateways).toContain('stripe');
    });

    it('Non-Argentine countries should only allow international gateways (stripe)', () => {
      const internationalCountries = SUPPORTED_COUNTRIES.filter((c) => c.code !== 'AR');
      for (const country of internationalCountries) {
        expect(country.isDomesticArgentina).toBe(false);
        expect(country.allowedGateways).toEqual(['stripe']);
        expect(country.allowedGateways).not.toContain('mercadopago');
        expect(country.allowedGateways).not.toContain('transfer');
      }
    });
  });

  describe('convertUsdAmount', () => {
    const mockRates = {
      USD: 1,
      ARS: 1500,
      MXN: 20,
      COP: 4000,
      CLP: 1000,
      PEN: 3.8,
      UYU: 42,
    };

    it('returns exact amount for USD', () => {
      expect(convertUsdAmount(29.99, 'USD', mockRates)).toBe(29.99);
    });

    it('rounds ARS, CLP, COP to whole numbers', () => {
      expect(convertUsdAmount(29.99, 'ARS', mockRates)).toBe(Math.round(29.99 * 1500));
      expect(convertUsdAmount(10, 'CLP', mockRates)).toBe(10000);
      expect(convertUsdAmount(10, 'COP', mockRates)).toBe(40000);
    });

    it('rounds MXN and PEN to 2 decimal places', () => {
      expect(convertUsdAmount(29.99, 'MXN', mockRates)).toBe(599.8);
      expect(convertUsdAmount(10, 'PEN', mockRates)).toBe(38);
    });

    it('falls back to FALLBACK_RATES if currency is missing from rate map', () => {
      const emptyRates = {} as any;
      const converted = convertUsdAmount(10, 'ARS', emptyRates);
      expect(converted).toBe(Math.round(10 * FALLBACK_RATES.ARS));
    });
  });

  describe('formatCurrencyAmount', () => {
    it('formats ARS without decimals', () => {
      const formatted = formatCurrencyAmount(45000, 'ARS');
      expect(formatted).toBe('ARS $45.000');
    });

    it('formats USD with decimals', () => {
      const formatted = formatCurrencyAmount(29.99, 'USD');
      expect(formatted).toBe('USD $29,99');
    });

    it('formats MXN with decimals', () => {
      const formatted = formatCurrencyAmount(520.5, 'MXN');
      expect(formatted).toBe('MXN $520,50');
    });
  });

  describe('getCurrencyRates', () => {
    it('returns valid rates structure with base USD', async () => {
      const result = await getCurrencyRates();
      expect(result.base).toBe('USD');
      expect(result.rates.USD).toBe(1);
      expect(result.rates.ARS).toBeGreaterThan(0);
      expect(result.rates.MXN).toBeGreaterThan(0);
      expect(result.rates.COP).toBeGreaterThan(0);
      expect(['live', 'cache', 'fallback']).toContain(result.source);
    });
  });
});
