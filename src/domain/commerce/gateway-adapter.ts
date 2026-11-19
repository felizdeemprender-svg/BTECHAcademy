/**
 * Comercio — Contrato de Adaptadores de Pasarelas de Pago (Strategy Pattern).
 * Cada pasarela encapsula sus capacidades de alcance geográfico, moneda nativa,
 * cálculo de comisiones y elegibilidad según origen del comprador y del tutor.
 */

export type GatewayScope = 'LOCAL' | 'GLOBAL';

export interface FeeStructure {
  readonly percentage: number; // Porcentaje en formato decimal (ej: 0.054 para 5.4%)
  readonly fixed: number;      // Costo fijo en la moneda de la pasarela
}

export interface IPaymentGatewayAdapter {
  readonly id: string;
  readonly name: string;
  readonly defaultCurrency: string;
  readonly scope: GatewayScope;
  readonly supportedCountries: readonly string[] | 'GLOBAL';
  readonly isManual: boolean;

  /**
   * Determina si la pasarela puede ser utilizada para una combinación de país tutor y país comprador.
   */
  isEligible(tutorCountry: string, buyerCountry: string): boolean;

  /**
   * Calcula la comisión estimada retenida por la pasarela para un monto dado.
   */
  calculateFee(amount: number): number;
}

