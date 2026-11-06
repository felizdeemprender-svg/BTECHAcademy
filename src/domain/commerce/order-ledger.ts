/**
 * Comercio — Libro Contable Multimoneda de Transacciones (Transaction Ledger).
 * Registra de manera inmutable cada orden con su moneda original, cotización
 * histórica al momento del cobro, comisiones deducidas por la pasarela y neto
 * en la moneda base del tutor.
 */
import { z } from 'zod';
import { EmailSchema } from './email';

export const OrderLedgerStatusSchema = z.enum(['completed', 'pending', 'failed', 'refunded']);
export type OrderLedgerStatus = z.infer<typeof OrderLedgerStatusSchema>;

export const OrderLedgerSchema = z.object({
  id: z.string().min(1, 'id requerido'),
  courseId: z.string().min(1, 'courseId requerido'),
  courseTitle: z.string().optional(),
  tutorId: z.string().min(1, 'tutorId requerido'),
  buyerEmail: EmailSchema,
  buyerName: z.string().default(''),
  buyerCountry: z.string().default('AR'),
  gatewayId: z.string().min(1, 'gatewayId requerido'),
  chargedAmount: z.number().min(0, 'chargedAmount no puede ser negativo'),
  chargedCurrency: z.string().default('ARS'),
  exchangeRateToUSD: z.number().min(0, 'exchangeRateToUSD no puede ser negativo'),
  amountInUSD: z.number().min(0, 'amountInUSD no puede ser negativo'),
  gatewayFee: z.number().min(0, 'gatewayFee no puede ser negativo'),
  netAmount: z.number().min(0, 'netAmount no puede ser negativo'),
  tutorHomeCurrency: z.string().default('ARS'),
  netInTutorCurrency: z.number().min(0, 'netInTutorCurrency no puede ser negativo'),
  status: OrderLedgerStatusSchema.default('completed'),
  landingId: z.string().optional(),
  referidoId: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type OrderLedger = z.infer<typeof OrderLedgerSchema>;

export interface CreateOrderLedgerParams {
  readonly id: string;
  readonly courseId: string;
  readonly courseTitle?: string;
  readonly tutorId: string;
  readonly buyerEmail: string;
  readonly buyerName?: string;
  readonly buyerCountry?: string;
  readonly gatewayId: string;
  readonly chargedAmount: number;
  readonly chargedCurrency: string;
  readonly exchangeRateToUSD: number;
  readonly gatewayFee?: number;
  readonly tutorHomeCurrency?: string;
  readonly landingId?: string;
  readonly referidoId?: string | null;
  readonly status?: OrderLedgerStatus;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt?: Date;
}

export function createOrderLedgerEntry(params: CreateOrderLedgerParams): OrderLedger {
  const chargedAmount = Math.max(0, params.chargedAmount);
  const chargedCurrency = (params.chargedCurrency || 'ARS').trim().toUpperCase();
  const tutorHomeCurrency = (params.tutorHomeCurrency || 'ARS').trim().toUpperCase();
  const exchangeRate = params.exchangeRateToUSD > 0 ? params.exchangeRateToUSD : 1;
  const gatewayFee = params.gatewayFee !== undefined && params.gatewayFee >= 0 ? params.gatewayFee : 0;

  const netAmount = Math.max(0, Math.round((chargedAmount - gatewayFee) * 100) / 100);

  let amountInUSD: number;
  if (chargedCurrency === 'USD') {
    amountInUSD = chargedAmount;
  } else {
    amountInUSD = Math.round((chargedAmount / exchangeRate) * 100) / 100;
  }

  let netInTutorCurrency: number;
  if (chargedCurrency === tutorHomeCurrency) {
    netInTutorCurrency = netAmount;
  } else if (chargedCurrency === 'USD' && tutorHomeCurrency === 'ARS') {
    netInTutorCurrency = Math.round(netAmount * exchangeRate * 100) / 100;
  } else {
    // Conversión genérica vía USD
    netInTutorCurrency = Math.round(amountInUSD * exchangeRate * 100) / 100;
  }

  return OrderLedgerSchema.parse({
    id: params.id,
    courseId: params.courseId,
    courseTitle: params.courseTitle,
    tutorId: params.tutorId,
    buyerEmail: params.buyerEmail,
    buyerName: params.buyerName || '',
    buyerCountry: (params.buyerCountry || 'AR').trim().toUpperCase(),
    gatewayId: params.gatewayId.toLowerCase(),
    chargedAmount,
    chargedCurrency,
    exchangeRateToUSD: exchangeRate,
    amountInUSD,
    gatewayFee,
    netAmount,
    tutorHomeCurrency,
    netInTutorCurrency,
    status: params.status || 'completed',
    landingId: params.landingId,
    referidoId: params.referidoId,
    metadata: params.metadata,
    createdAt: params.createdAt || new Date(),
    updatedAt: new Date(),
  });
}

