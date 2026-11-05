export type SupportedCurrency = 'USD' | 'ARS' | 'MXN' | 'COP' | 'CLP' | 'PEN' | 'UYU';

export type PaymentGatewayType = 'mercadopago' | 'transfer' | 'getnet' | 'stripe';

export interface CountryInfo {
  readonly code: string;
  readonly name: string;
  readonly currency: SupportedCurrency;
  readonly symbol: string;
  readonly flagCode: string;
  readonly allowedGateways: readonly PaymentGatewayType[];
  readonly isDomesticArgentina: boolean;
}

export const SUPPORTED_COUNTRIES: readonly CountryInfo[] = [
  {
    code: 'AR',
    name: 'Argentina',
    currency: 'ARS',
    symbol: '$',
    flagCode: 'AR',
    allowedGateways: ['mercadopago', 'transfer', 'getnet', 'stripe'],
    isDomesticArgentina: true,
  },
  {
    code: 'MX',
    name: 'Mexico',
    currency: 'MXN',
    symbol: '$',
    flagCode: 'MX',
    allowedGateways: ['stripe'],
    isDomesticArgentina: false,
  },
  {
    code: 'CO',
    name: 'Colombia',
    currency: 'COP',
    symbol: '$',
    flagCode: 'CO',
    allowedGateways: ['stripe'],
    isDomesticArgentina: false,
  },
  {
    code: 'CL',
    name: 'Chile',
    currency: 'CLP',
    symbol: '$',
    flagCode: 'CL',
    allowedGateways: ['stripe'],
    isDomesticArgentina: false,
  },
  {
    code: 'PE',
    name: 'Peru',
    currency: 'PEN',
    symbol: 'S/',
    flagCode: 'PE',
    allowedGateways: ['stripe'],
    isDomesticArgentina: false,
  },
  {
    code: 'UY',
    name: 'Uruguay',
    currency: 'UYU',
    symbol: '$',
    flagCode: 'UY',
    allowedGateways: ['stripe'],
    isDomesticArgentina: false,
  },
  {
    code: 'GLOBAL',
    name: 'Internacional / Otro',
    currency: 'USD',
    symbol: 'US$',
    flagCode: 'GLOBAL',
    allowedGateways: ['stripe'],
    isDomesticArgentina: false,
  },
] as const;

export interface CurrencyRatesResponse {
  readonly base: 'USD';
  readonly rates: Record<SupportedCurrency, number>;
  readonly updatedAt: string;
  readonly source: 'live' | 'cache' | 'fallback';
}

export const FALLBACK_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  ARS: 1540,
  MXN: 18.5,
  COP: 3150,
  CLP: 990,
  PEN: 3.45,
  UYU: 41.5,
};
