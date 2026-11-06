import type { IPaymentGatewayAdapter, GatewayScope } from '../gateway-adapter';

export class GetnetAdapter implements IPaymentGatewayAdapter {
  readonly id = 'getnet';
  readonly name = 'Getnet';
  readonly defaultCurrency = 'ARS';
  readonly scope: GatewayScope = 'LOCAL';
  readonly supportedCountries = ['AR'] as const;
  readonly isManual = false;

  private readonly feeRate: number;
  private readonly fixedFee: number;

  constructor(feeRate = 0.045, fixedFee = 0) {
    this.feeRate = feeRate;
    this.fixedFee = fixedFee;
  }

  isEligible(tutorCountry: string, buyerCountry: string): boolean {
    const t = tutorCountry.trim().toUpperCase();
    const b = buyerCountry.trim().toUpperCase();
    return t === 'AR' && b === 'AR';
  }

  calculateFee(amount: number): number {
    if (amount <= 0) return 0;
    return Math.round((amount * this.feeRate + this.fixedFee) * 100) / 100;
  }
}

