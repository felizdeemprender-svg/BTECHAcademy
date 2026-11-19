import type { IPaymentGatewayAdapter, GatewayScope } from '../gateway-adapter';

export class BankTransferAdapter implements IPaymentGatewayAdapter {
  readonly id: string;
  readonly name = 'Transferencia Bancaria';
  readonly defaultCurrency = 'ARS';
  readonly scope: GatewayScope = 'LOCAL';
  readonly supportedCountries = ['AR'] as const;
  readonly isManual = true;

  constructor(id: 'transfer' | 'bank_transfer' = 'transfer') {
    this.id = id;
  }

  isEligible(tutorCountry: string, buyerCountry: string): boolean {
    const t = tutorCountry.trim().toUpperCase();
    const b = buyerCountry.trim().toUpperCase();
    return t === 'AR' && b === 'AR';
  }

  calculateFee(_amount: number): number {
    return 0; // Transferencia directa sin comisión de pasarela
  }
}

