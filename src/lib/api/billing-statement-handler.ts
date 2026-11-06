/**
 * API — Handler para el Reporte Financiero y Estado Contable por Ciclo de Facturación.
 * Consolida ventas de cursos (locales e internacionales), costos de suscripción SaaS,
 * paquetes de créditos IA y comisiones de pasarelas, devolviendo los dos niveles:
 * 1. Nivel 1: Totalizado por concepto discriminado (ventas por pasarela, costos plataforma, balance neto, cuadre).
 * 2. Nivel 2: Detalle transaccional individual de cada movimiento del ciclo.
 */
import { NextResponse } from 'next/server';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import { canAccessMentorData, type Caller } from './mentor-auth';
import {
  buildTutorFinancialStatement,
  type PlatformSubscriptionExpense,
  type AiCreditsExpense,
} from '@/domain/commerce/use-cases/build-tutor-financial-statement';
import { createOrderLedgerEntry, type OrderLedger } from '@/domain/commerce/order-ledger';

export interface BillingStatementQueryParams {
  readonly tutorId: string;
  readonly from?: string;
  readonly to?: string;
  readonly cycleId?: string;
  readonly cycleLabel?: string;
}

export async function handleGetBillingStatement(
  gateway: FirestoreGateway,
  caller: Caller | null,
  params: BillingStatementQueryParams,
): Promise<NextResponse> {
  if (!caller) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const tutorId = params.tutorId?.trim();
  if (!tutorId) {
    return NextResponse.json({ error: 'tutorId es requerido' }, { status: 400 });
  }

  if (!canAccessMentorData(caller, tutorId)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const userSnap = await gateway.getDoc('users', tutorId);
    if (!userSnap) {
      return NextResponse.json({ error: 'Tutor no encontrado' }, { status: 404 });
    }

    const userData = userSnap.data() || {};
    const homeCountry = (userData.homeCountry as string) || 'AR';
    const homeCurrency = (userData.homeCurrency as string) || 'ARS';

    const fromDate = params.from ? new Date(params.from) : undefined;
    const toDate = params.to ? new Date(params.to) : undefined;

    // 1. Recolección de Órdenes / Ventas
    const orders: OrderLedger[] = [];

    // Intento 1: Colección dedicada orderLedger si existe
    try {
      const ledgerSnap = await gateway.queryByField('orderLedger', 'tutorId', tutorId, 500);
      if (ledgerSnap && ledgerSnap.docs.length > 0) {
        for (const doc of ledgerSnap.docs) {
          const raw = doc.data() || {};
          const created = raw.createdAt instanceof Date ? raw.createdAt : (raw.createdAt ? new Date(String(raw.createdAt)) : new Date());
          orders.push(createOrderLedgerEntry({
            id: doc.id,
            courseId: (raw.courseId as string) || 'desconocido',
            courseTitle: raw.courseTitle as string | undefined,
            tutorId,
            buyerEmail: (raw.buyerEmail as string) || 'alumno@ejemplo.com',
            buyerName: (raw.buyerName as string) || '',
            buyerCountry: (raw.buyerCountry as string) || homeCountry,
            chargedAmount: Number(raw.chargedAmount) || 0,
            chargedCurrency: (raw.chargedCurrency as string) || homeCurrency,
            exchangeRateToUSD: Number(raw.exchangeRateToUSD) || 1,
            gatewayId: (raw.gatewayId as string) || 'mercadopago',
            gatewayFee: Number(raw.gatewayFee) || 0,
            tutorHomeCurrency: homeCurrency,
            status: (raw.status as any) || 'completed',
            createdAt: created,
          }));
        }
      }
    } catch (e) {
      console.warn('[billing-statement-handler] Lectura de orderLedger:', e);
    }

    // Intento 2: Si no hay en orderLedger, recopilar desde enrollments
    if (orders.length === 0) {
      try {
        const enrollmentsSnap = await gateway.queryByField('enrollments', 'mentorId', tutorId, 500);
        if (enrollmentsSnap && enrollmentsSnap.docs.length > 0) {
          for (const doc of enrollmentsSnap.docs) {
            const raw = doc.data() || {};
            if (raw.status !== 'active' && raw.status !== 'completed') continue;

            const created = raw.enrolledAt instanceof Date
              ? raw.enrolledAt
              : (raw.createdAt instanceof Date ? raw.createdAt : new Date());

            const amount = Number(raw.price || raw.amount || raw.chargedAmount || 0);
            const currency = (raw.currency as string) || (raw.chargedCurrency as string) || homeCurrency;
            const gatewayId = (raw.gateway as string) || (raw.source as string) || 'mercadopago';

            // Estimación de comisión de pasarela estándar si no viene explícita
            const feeRate = gatewayId.toLowerCase().includes('stripe') ? 0.045 : (gatewayId.toLowerCase().includes('mp') || gatewayId.toLowerCase().includes('mercadopago') ? 0.06 : 0);
            const fee = Math.round(amount * feeRate * 100) / 100;

            orders.push(createOrderLedgerEntry({
              id: doc.id,
              courseId: (raw.courseId as string) || (raw.productId as string) || 'curso',
              courseTitle: (raw.courseTitle as string) || (raw.productTitle as string) || 'Curso Formativo',
              tutorId,
              buyerEmail: (raw.inviteEmail as string) || (raw.studentEmail as string) || 'alumno@ejemplo.com',
              buyerName: (raw.studentName as string) || '',
              buyerCountry: (raw.buyerCountry as string) || homeCountry,
              chargedAmount: amount,
              chargedCurrency: currency,
              exchangeRateToUSD: Number(raw.exchangeRateToUSD) || 1200,
              gatewayId,
              gatewayFee: fee,
              tutorHomeCurrency: homeCurrency,
              status: 'completed',
              createdAt: created,
            }));
          }
        }
      } catch (e) {
        console.warn('[billing-statement-handler] Lectura de enrollments:', e);
      }
    }

    // 2. Recolección de Egresos de Suscripción SaaS
    const subscriptions: PlatformSubscriptionExpense[] = [];
    const subData = userData.subscription as Record<string, unknown> | undefined;
    if (subData && subData.status === 'active') {
      const subAmountUSD = Number(subData.priceUSD || subData.amountUSD || 29);
      const subExchangeRate = Number(subData.exchangeRate || 1200);
      subscriptions.push({
        id: (subData.id as string) || `sub-${tutorId}`,
        planName: (subData.planName as string) || (subData.name as string) || 'Plan Pro Tutor',
        amountUSD: subAmountUSD,
        exchangeRateToHomeCurrency: subExchangeRate,
        chargedCurrency: 'USD',
        chargedAmount: subAmountUSD,
        billedAt: fromDate || new Date(),
      });
    }

    // 3. Recolección de Egresos de Créditos IA
    const aiCredits: AiCreditsExpense[] = [];
    const creditsPurchases = (userData.creditsPurchases as Array<Record<string, unknown>>) || [];
    for (const p of creditsPurchases) {
      const pDate = p.createdAt instanceof Date ? p.createdAt : (p.createdAt ? new Date(String(p.createdAt)) : new Date());
      aiCredits.push({
        id: (p.id as string) || `cred-${Math.random().toString(36).substring(7)}`,
        creditsAmount: Number(p.credits) || 500,
        amountUSD: Number(p.amountUSD) || 15,
        exchangeRateToHomeCurrency: Number(p.exchangeRate) || 1200,
        chargedCurrency: (p.currency as string) || 'USD',
        chargedAmount: Number(p.chargedAmount) || Number(p.amountUSD) || 15,
        billedAt: pDate,
      });
    }

    // Construcción del Estado Financiero Consolidado
    const statement = buildTutorFinancialStatement({
      tutorId,
      homeCountry,
      homeCurrency,
      cycleId: params.cycleId,
      cycleLabel: params.cycleLabel,
      fromDate,
      toDate,
      orders,
      subscriptions,
      aiCredits,
    });

    return NextResponse.json({ ok: true, statement });
  } catch (error: any) {
    console.error('[billing-statement-handler] Error generando estado contable:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno generando estado contable' },
      { status: 500 },
    );
  }
}

