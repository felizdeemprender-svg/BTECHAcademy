import {
  FALLBACK_RATES,
  type CurrencyRatesResponse,
  type SupportedCurrency,
} from './types';

interface CacheState {
  rates: Record<SupportedCurrency, number>;
  updatedAt: number;
}

let ratesCache: CacheState | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

export async function fetchLiveRates(): Promise<Record<SupportedCurrency, number>> {
  const rates: Record<SupportedCurrency, number> = { ...FALLBACK_RATES };

  // 1. Consulta al feed global (open.er-api.com) con timeout de 3500ms
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
      next: { revalidate: 21600 },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data?.rates && typeof data.rates === 'object') {
        if (typeof data.rates.MXN === 'number') rates.MXN = data.rates.MXN;
        if (typeof data.rates.COP === 'number') rates.COP = data.rates.COP;
        if (typeof data.rates.CLP === 'number') rates.CLP = data.rates.CLP;
        if (typeof data.rates.PEN === 'number') rates.PEN = data.rates.PEN;
        if (typeof data.rates.UYU === 'number') rates.UYU = data.rates.UYU;
        if (typeof data.rates.ARS === 'number') rates.ARS = data.rates.ARS;
      }
    }
  } catch (err) {
    console.warn('[RatesService] Error consultando feed global, aplicando fallback:', err);
  }

  // 2. Consulta a DolarApi para mercado argentino: Dólar Oficial BCRA (operaciones locales ARS sin Impuesto PAIS)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('https://dolarapi.com/v1/dolares/oficial', {
      signal: controller.signal,
      next: { revalidate: 21600 },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (typeof data?.venta === 'number' && data.venta > 0) {
        rates.ARS = data.venta;
      }
    }
  } catch {
    // Si falla DolarApi, se conserva el valor de open.er-api o fallback
  }

  return rates;
}

export async function getCurrencyRates(forceRefresh = false): Promise<CurrencyRatesResponse> {
  const now = Date.now();

  if (!forceRefresh && ratesCache && now - ratesCache.updatedAt < CACHE_TTL_MS) {
    return {
      base: 'USD',
      rates: ratesCache.rates,
      updatedAt: new Date(ratesCache.updatedAt).toISOString(),
      source: 'cache',
    };
  }

  try {
    const liveRates = await fetchLiveRates();
    ratesCache = {
      rates: liveRates,
      updatedAt: now,
    };
    return {
      base: 'USD',
      rates: liveRates,
      updatedAt: new Date(now).toISOString(),
      source: 'live',
    };
  } catch (err) {
    console.error('[RatesService] Falla al actualizar cotizaciones:', err);
    if (ratesCache) {
      return {
        base: 'USD',
        rates: ratesCache.rates,
        updatedAt: new Date(ratesCache.updatedAt).toISOString(),
        source: 'cache',
      };
    }
    return {
      base: 'USD',
      rates: FALLBACK_RATES,
      updatedAt: new Date(now).toISOString(),
      source: 'fallback',
    };
  }
}

export function convertUsdAmount(
  usdAmount: number,
  targetCurrency: SupportedCurrency,
  rates: Record<SupportedCurrency, number>
): number {
  if (targetCurrency === 'USD') return usdAmount;
  const rate = rates[targetCurrency] || FALLBACK_RATES[targetCurrency] || 1;
  const converted = usdAmount * rate;

  if (['ARS', 'CLP', 'COP'].includes(targetCurrency)) {
    return Math.round(converted);
  }
  return Math.round(converted * 100) / 100;
}

export function convertAmount(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  rates: Record<SupportedCurrency, number>
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = rates[fromCurrency] || FALLBACK_RATES[fromCurrency] || 1;
  const inUsd = fromCurrency === 'USD' ? amount : amount / fromRate;
  return convertUsdAmount(inUsd, toCurrency, rates);
}

export function formatCurrencyAmount(
  amount: number,
  currency: SupportedCurrency
): string {
  const zeroDecimalCurrencies: SupportedCurrency[] = ['ARS', 'CLP', 'COP'];
  const hasDecimals = !zeroDecimalCurrencies.includes(currency);

  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(amount);

  return `${currency} $${formatted}`;
}
