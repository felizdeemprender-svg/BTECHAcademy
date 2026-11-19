import { NextResponse } from 'next/server';
import { getCurrencyRates } from '@/lib/currency/rates-service';
import { SUPPORTED_COUNTRIES } from '@/lib/currency/types';

export const revalidate = 3600;

export async function GET() {
  try {
    const data = await getCurrencyRates();
    return NextResponse.json(
      {
        ...data,
        countries: SUPPORTED_COUNTRIES,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error: unknown) {
    console.error('[API_CURRENCY_RATES_ERROR]:', error);
    return NextResponse.json({ error: 'Error al consultar cotizaciones' }, { status: 500 });
  }
}
