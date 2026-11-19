import type { IPaymentGatewayAdapter, GatewayScope } from '../gateway-adapter';

export class StripeAdapter implements IPaymentGatewayAdapter {
  readonly id = 'stripe';
  readonly name = 'Stripe (Tarjetas Internacionales)';
  readonly defaultCurrency = 'USD';
  readonly scope: GatewayScope = 'GLOBAL';
  readonly supportedCountries = 'GLOBAL' as const;
  readonly isManual = false;

  private readonly feeRate: number;
  private readonly fixedFeeUSD: number;

  constructor(feeRate = 0.039, fixedFeeUSD = 0.30) {
    this.feeRate = feeRate;
    this.fixedFeeUSD = fixedFeeUSD;
  }

  isEligible(_tutorCountry: string, _buyerCountry: string): boolean {
    // Stripe como pasarela global opera para cualquier país de comprador
    return true;
  }

  calculateFee(amount: number): number {
    if (amount <= 0) return 0;
    return Math.round((amount * this.feeRate + this.fixedFeeUSD) * 100) / 100;
  }
}

