'use client';

import React from 'react';
import { Globe, Info } from 'lucide-react';
import {
  FALLBACK_RATES,
  SUPPORTED_COUNTRIES,
  type CountryInfo,
  type SupportedCurrency,
} from '@/lib/currency/types';
import {
  convertAmount,
  convertUsdAmount,
  formatCurrencyAmount,
} from '@/lib/currency/rates-service';
import { cn } from '@/lib/utils';

interface CountryCurrencySelectorProps {
  selectedCountryCode: string;
  onSelectCountry: (country: CountryInfo) => void;
  usdAmount?: number;
  baseAmount?: number;
  baseCurrency?: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
  className?: string;
  showDisclaimer?: boolean;
  showConvertedAmount?: boolean;
  compact?: boolean;
}

export function CountryCurrencySelector({
  selectedCountryCode,
  onSelectCountry,
  usdAmount = 0,
  baseAmount,
  baseCurrency = 'USD',
  rates,
  className,
  showDisclaimer = true,
  showConvertedAmount = true,
  compact = false,
}: CountryCurrencySelectorProps) {
  const currentCountry =
    SUPPORTED_COUNTRIES.find((c) => c.code === selectedCountryCode) ||
    SUPPORTED_COUNTRIES[0];

  const rawBaseAmount = typeof baseAmount === 'number' ? baseAmount : usdAmount;

  // Si la moneda destino coincide con la moneda base, no aplicamos conversión para preservar el valor exacto
  const convertedAmount = currentCountry.currency === baseCurrency
    ? rawBaseAmount
    : convertAmount(rawBaseAmount, baseCurrency, currentCountry.currency, rates);

  // Referencia en USD si la moneda destino no es USD
  const referenceUsd = baseCurrency === 'USD'
    ? rawBaseAmount
    : Math.round((rawBaseAmount / (rates[baseCurrency] || FALLBACK_RATES[baseCurrency] || 1)) * 100) / 100;

  const showReference = currentCountry.currency !== 'USD' && referenceUsd > 0;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
            <Globe className="w-4 h-4 text-[#1CB899]" />
          </div>
          <div>
            <label htmlFor="country-selector" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Tu país de residencia
            </label>
            <div className="text-xs font-semibold text-slate-800">
              {currentCountry.name} ({currentCountry.currency})
            </div>
          </div>
        </div>

        <select
          id="country-selector"
          value={currentCountry.code}
          onChange={(e) => {
            const found = SUPPORTED_COUNTRIES.find((c) => c.code === e.target.value);
            if (found) onSelectCountry(found);
          }}
          className="bg-white border border-slate-200 text-xs font-bold text-slate-900 rounded-xl px-3 py-2 outline-none focus:border-[#1CB899] focus:ring-1 focus:ring-[#1CB899] transition-all cursor-pointer shadow-xs"
        >
          {SUPPORTED_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name} ({country.currency})
            </option>
          ))}
        </select>
      </div>

      {/* Valor grande en moneda del país elegido, valor chico en dólares */}
      {showConvertedAmount && rawBaseAmount > 0 && (
        <div className="bg-[#1CB899]/5 border border-[#1CB899]/20 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Total {currentCountry.name} ({currentCountry.currency})
            </span>
            {showReference && (
              <span className="text-xs font-bold text-slate-400">
                Ref: USD ${referenceUsd}
              </span>
            )}
          </div>
          <span className="text-lg font-black text-[#138d74]">
            {formatCurrencyAmount(convertedAmount, currentCountry.currency)}
          </span>
        </div>
      )}

      {/* Disclaimer explicativo de tipo de cambio */}
      {showDisclaimer && (
        <div className="flex items-start gap-2 p-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p>
            El valor puede cambiar según la cotización del momento de realizar la transacción.{' '}
            {currentCountry.isDomesticArgentina
              ? 'Para pagos en Argentina el cobro se efectúa en pesos argentinos (ARS) mediante Mercado Pago, Getnet o Transferencia.'
              : `Para compras fuera de Argentina solo podrás pagar mediante Stripe con tarjeta internacional en USD (Mercado Pago y Transferencia bancaria quedan excluidos).`}
          </p>
        </div>
      )}
    </div>
  );
}
