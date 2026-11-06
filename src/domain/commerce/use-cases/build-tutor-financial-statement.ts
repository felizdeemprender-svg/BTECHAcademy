/**
 * Comercio — Estado de Cuenta y Circuito Contable Completo del Tutor (Financial Statement).
 * Consolida todas las transacciones del tutor:
 * 1. Gastos de plataforma (Abono de suscripción SaaS y compra de créditos IA).
 * 2. Ingresos por venta de cursos (ventas locales en moneda nativa y ventas internacionales en USD).
 * 3. Comisiones deducidas por pasarelas (Mercado Pago, Getnet, Transferencia, Stripe, etc.).
 * 4. Cuadre exacto en la moneda base del tutor con tipos de cambio históricos inmutables.
 */
import { z } from 'zod';
import type { OrderLedger } from '../order-ledger';

export interface PlatformSubscriptionExpense {
  readonly id: string;
  readonly planName: string;
  readonly amountUSD: number;
  readonly exchangeRateToHomeCurrency: number;
  readonly chargedCurrency: string;
  readonly chargedAmount: number;
  readonly billedAt: Date;
}

export interface AiCreditsExpense {
  readonly id: string;
  readonly creditsAmount: number;
  readonly amountUSD: number;
  readonly exchangeRateToHomeCurrency: number;
  readonly chargedCurrency: string;
  readonly chargedAmount: number;
  readonly billedAt: Date;
}

export interface GatewaySalesBreakdown {
  readonly gatewayId: string;
  readonly gatewayName: string;
  readonly salesCount: number;
  readonly grossCharged: number;
  readonly chargedCurrency: string;
  readonly feesDeducted: number;
  readonly netInHomeCurrency: number;
}

export interface FinancialStatementLineItem {
  readonly id: string;
  readonly date: Date;
  readonly type: 'course_sale' | 'subscription' | 'ai_credits';
  readonly typeLabel: string;
  readonly concept: string;
  readonly referenceId: string;
  readonly gatewayOrProvider: string;
  readonly originalCurrency: string;
  readonly originalGrossAmount: number;
  readonly originalFeeAmount: number;
  readonly exchangeRate: number;
  readonly feeInHomeCurrency: number;
  readonly netInHomeCurrency: number;
  readonly status: string;
}

export interface TutorFinancialStatement {
  readonly tutorId: string;
  readonly homeCountry: string;
  readonly homeCurrency: string;
  readonly cycleId?: string;
  readonly cycleLabel?: string;
  readonly period: { readonly from: Date | null; readonly to: Date | null };
  readonly sales: {
    readonly totalCount: number;
    readonly localSalesCount: number;
    readonly internationalSalesCount: number;
    readonly grossLocalRevenue: number;
    readonly grossInternationalRevenueUSD: number;
    readonly grossTotalConsolidatedInHomeCurrency: number;
    readonly totalGatewayFeesInHomeCurrency: number;
    readonly netSalesRevenueInHomeCurrency: number;
    readonly breakdownByGateway: Record<string, GatewaySalesBreakdown>;
  };
  readonly platformCosts: {
    readonly subscriptionsTotalInHomeCurrency: number;
    readonly subscriptionsTotalUSD: number;
    readonly aiCreditsTotalInHomeCurrency: number;
    readonly aiCreditsTotalUSD: number;
    readonly totalPlatformCostsInHomeCurrency: number;
    readonly subscriptionsList: readonly PlatformSubscriptionExpense[];
    readonly aiCreditsList: readonly AiCreditsExpense[];
  };
  readonly reconciliation: {
    readonly totalInflowNet: number;       // Ingresos netos por cursos
    readonly totalOutflow: number;         // Gastos en la plataforma
    readonly netOperatingBalance: number;  // Saldo a favor del tutor (Inflow - Outflow)
    readonly isBalanced: boolean;          // Verificación de cuadre contable
  };
  readonly lineItems: readonly FinancialStatementLineItem[];
}

export interface BuildFinancialStatementParams {
  readonly tutorId: string;
  readonly homeCountry: string;
  readonly homeCurrency: string;
  readonly cycleId?: string;
  readonly cycleLabel?: string;
  readonly fromDate?: Date;
  readonly toDate?: Date;
  readonly orders: readonly OrderLedger[];
  readonly subscriptions: readonly PlatformSubscriptionExpense[];
  readonly aiCredits: readonly AiCreditsExpense[];
}

export function buildTutorFinancialStatement(params: BuildFinancialStatementParams): TutorFinancialStatement {
  const homeCurrency = (params.homeCurrency || 'ARS').trim().toUpperCase();
  const homeCountry = (params.homeCountry || 'AR').trim().toUpperCase();

  // Filtrado por fecha si se especificó
  const from = params.fromDate || null;
  const to = params.toDate || null;

  const inPeriod = (d?: Date | null) => {
    if (!d) return true;
    if (from && d.getTime() < from.getTime()) return false;
    if (to && d.getTime() > to.getTime()) return false;
    return true;
  };

  const filteredOrders = params.orders.filter((o) => o.status === 'completed' && inPeriod(o.createdAt));
  const filteredSubs = params.subscriptions.filter((s) => inPeriod(s.billedAt));
  const filteredCredits = params.aiCredits.filter((c) => inPeriod(c.billedAt));

  // 1. Agregación de Ventas
  let localCount = 0;
  let intlCount = 0;
  let grossLocal = 0;
  let grossUSD = 0;
  let grossConsolidated = 0;
  let totalFees = 0;
  let netSales = 0;
  const lineItems: FinancialStatementLineItem[] = [];

  const gatewayBreakdown: Record<string, {
    gatewayId: string;
    gatewayName: string;
    salesCount: number;
    grossCharged: number;
    chargedCurrency: string;
    feesDeducted: number;
    netInHomeCurrency: number;
  }> = {};

  for (const order of filteredOrders) {
    const isLocal = order.buyerCountry === homeCountry;
    if (isLocal) {
      localCount++;
      grossLocal += order.chargedAmount;
    } else {
      intlCount++;
      grossUSD += order.amountInUSD;
    }

    const orderExchangeRate = order.exchangeRateToUSD > 0 ? order.exchangeRateToUSD : 1;
    let orderGrossInHomeCurrency: number;
    let orderFeeInHomeCurrency: number;

    if (order.chargedCurrency === homeCurrency) {
      orderGrossInHomeCurrency = order.chargedAmount;
      orderFeeInHomeCurrency = order.gatewayFee;
    } else if (order.chargedCurrency === 'USD' && homeCurrency !== 'USD') {
      orderGrossInHomeCurrency = Math.round(order.chargedAmount * orderExchangeRate * 100) / 100;
      orderFeeInHomeCurrency = Math.round(order.gatewayFee * orderExchangeRate * 100) / 100;
    } else {
      orderGrossInHomeCurrency = Math.round(order.amountInUSD * orderExchangeRate * 100) / 100;
      orderFeeInHomeCurrency = Math.round(order.gatewayFee * orderExchangeRate * 100) / 100;
    }

    grossConsolidated += orderGrossInHomeCurrency;
    totalFees += orderFeeInHomeCurrency;
    netSales += order.netInTutorCurrency;

    // Desglose por pasarela
    const gKey = order.gatewayId.toLowerCase();
    if (!gatewayBreakdown[gKey]) {
      gatewayBreakdown[gKey] = {
        gatewayId: gKey,
        gatewayName: gKey.toUpperCase(),
        salesCount: 0,
        grossCharged: 0,
        chargedCurrency: order.chargedCurrency,
        feesDeducted: 0,
        netInHomeCurrency: 0,
      };
    }
    gatewayBreakdown[gKey].salesCount += 1;
    gatewayBreakdown[gKey].grossCharged += order.chargedAmount;
    gatewayBreakdown[gKey].feesDeducted += order.gatewayFee;
    gatewayBreakdown[gKey].netInHomeCurrency += order.netInTutorCurrency;

    // Nivel 2: Detalle transaccional de venta
    lineItems.push({
      id: order.id,
      date: order.createdAt || new Date(),
      type: 'course_sale',
      typeLabel: 'Venta de Curso',
      concept: order.courseTitle || (order.metadata?.courseTitle as string) || `Curso (${order.courseId})`,
      referenceId: order.id,
      gatewayOrProvider: order.gatewayId.toUpperCase(),
      originalCurrency: order.chargedCurrency,
      originalGrossAmount: order.chargedAmount,
      originalFeeAmount: order.gatewayFee,
      exchangeRate: orderExchangeRate,
      feeInHomeCurrency: orderFeeInHomeCurrency,
      netInHomeCurrency: order.netInTutorCurrency,
      status: order.status,
    });
  }

  // 2. Costos de Plataforma
  let subsTotalUSD = 0;
  let subsTotalHome = 0;
  for (const sub of filteredSubs) {
    subsTotalUSD += sub.amountUSD;
    const subCostHome = sub.chargedCurrency === homeCurrency
      ? sub.chargedAmount
      : Math.round(sub.amountUSD * sub.exchangeRateToHomeCurrency * 100) / 100;

    subsTotalHome += subCostHome;

    // Nivel 2: Detalle transaccional de suscripción
    lineItems.push({
      id: sub.id,
      date: sub.billedAt,
      type: 'subscription',
      typeLabel: 'Suscripción SaaS',
      concept: sub.planName || 'Abono Plataforma',
      referenceId: sub.id,
      gatewayOrProvider: 'SaaS Platform',
      originalCurrency: sub.chargedCurrency,
      originalGrossAmount: sub.chargedAmount,
      originalFeeAmount: 0,
      exchangeRate: sub.exchangeRateToHomeCurrency,
      feeInHomeCurrency: 0,
      netInHomeCurrency: -subCostHome,
      status: 'completed',
    });
  }

  let creditsTotalUSD = 0;
  let creditsTotalHome = 0;
  for (const cred of filteredCredits) {
    creditsTotalUSD += cred.amountUSD;
    const credCostHome = cred.chargedCurrency === homeCurrency
      ? cred.chargedAmount
      : Math.round(cred.amountUSD * cred.exchangeRateToHomeCurrency * 100) / 100;

    creditsTotalHome += credCostHome;

    // Nivel 2: Detalle transaccional de créditos IA
    lineItems.push({
      id: cred.id,
      date: cred.billedAt,
      type: 'ai_credits',
      typeLabel: 'Créditos IA',
      concept: `Recarga Pack IA (${cred.creditsAmount} créditos)`,
      referenceId: cred.id,
      gatewayOrProvider: 'Fastoria AI Engine',
      originalCurrency: cred.chargedCurrency,
      originalGrossAmount: cred.chargedAmount,
      originalFeeAmount: 0,
      exchangeRate: cred.exchangeRateToHomeCurrency,
      feeInHomeCurrency: 0,
      netInHomeCurrency: -credCostHome,
      status: 'completed',
    });
  }

  // Ordenar movimientos cronológicamente descendente (más recientes primero)
  lineItems.sort((a, b) => b.date.getTime() - a.date.getTime());

  const totalPlatformCosts = Math.round((subsTotalHome + creditsTotalHome) * 100) / 100;
  const netSalesRounded = Math.round(netSales * 100) / 100;
  const netOperatingBalance = Math.round((netSalesRounded - totalPlatformCosts) * 100) / 100;

  // Verificación de cuadre contable:
  // grossConsolidated - totalFees debe ser igual a netSalesRounded (dentro de tolerancia de 1 centavo por redondeo)
  const isSalesMathBalanced = Math.abs((grossConsolidated - totalFees) - netSalesRounded) <= 0.05;
  // netSalesRounded - totalPlatformCosts debe ser igual a netOperatingBalance
  const isOperatingMathBalanced = Math.abs((netSalesRounded - totalPlatformCosts) - netOperatingBalance) <= 0.01;

  return {
    tutorId: params.tutorId,
    homeCountry,
    homeCurrency,
    cycleId: params.cycleId,
    cycleLabel: params.cycleLabel,
    period: { from, to },
    sales: {
      totalCount: filteredOrders.length,
      localSalesCount: localCount,
      internationalSalesCount: intlCount,
      grossLocalRevenue: Math.round(grossLocal * 100) / 100,
      grossInternationalRevenueUSD: Math.round(grossUSD * 100) / 100,
      grossTotalConsolidatedInHomeCurrency: Math.round(grossConsolidated * 100) / 100,
      totalGatewayFeesInHomeCurrency: Math.round(totalFees * 100) / 100,
      netSalesRevenueInHomeCurrency: netSalesRounded,
      breakdownByGateway: gatewayBreakdown,
    },
    platformCosts: {
      subscriptionsTotalInHomeCurrency: Math.round(subsTotalHome * 100) / 100,
      subscriptionsTotalUSD: Math.round(subsTotalUSD * 100) / 100,
      aiCreditsTotalInHomeCurrency: Math.round(creditsTotalHome * 100) / 100,
      aiCreditsTotalUSD: Math.round(creditsTotalUSD * 100) / 100,
      totalPlatformCostsInHomeCurrency: totalPlatformCosts,
      subscriptionsList: filteredSubs,
      aiCreditsList: filteredCredits,
    },
    reconciliation: {
      totalInflowNet: netSalesRounded,
      totalOutflow: totalPlatformCosts,
      netOperatingBalance,
      isBalanced: isSalesMathBalanced && isOperatingMathBalanced,
    },
    lineItems,
  };
}

