import { describe, it, expect } from 'vitest';
import {
  buildTutorFinancialStatement,
  type PlatformSubscriptionExpense,
  type AiCreditsExpense,
} from '../build-tutor-financial-statement';
import { createOrderLedgerEntry, type OrderLedger } from '../../order-ledger';

describe('buildTutorFinancialStatement - Circuito Contable Completo Multimoneda', () => {
  it('cuadra exactamente las cuentas de un tutor argentino que se suscribe, compra créditos IA y vende cursos local e internacionalmente', () => {
    const tutorId = 'tutor-angel-101';
    const homeCountry = 'AR';
    const homeCurrency = 'ARS';

    // 1. Gastos de plataforma (Abono SaaS Pro $29 USD @ TC 1200)
    const subscriptions: PlatformSubscriptionExpense[] = [
      {
        id: 'sub-oct-2026',
        planName: 'Plan Pro Tutor',
        amountUSD: 29,
        exchangeRateToHomeCurrency: 1200,
        chargedCurrency: 'USD',
        chargedAmount: 29,
        billedAt: new Date('2026-10-01T10:00:00Z'),
      },
    ];

    // 2. Compra de créditos de IA (Pack 500 créditos por $15 USD @ TC 1200)
    const aiCredits: AiCreditsExpense[] = [
      {
        id: 'ai-pack-500',
        creditsAmount: 500,
        amountUSD: 15,
        exchangeRateToHomeCurrency: 1200,
        chargedCurrency: 'USD',
        chargedAmount: 15,
        billedAt: new Date('2026-10-05T15:30:00Z'),
      },
    ];

    // 3. Ventas de cursos del tutor (locales en ARS e internacionales en USD)
    const orders: OrderLedger[] = [
      // Venta 1 Local: Alumno en Argentina pagando por Mercado Pago
      createOrderLedgerEntry({
        id: 'ord-ar-mp-01',
        courseId: 'curso-ventas-b2b',
        courseTitle: 'Ventas B2B para Consultores',
        tutorId,
        buyerEmail: 'carlos@ejemplo.com',
        buyerName: 'Carlos Gómez',
        buyerCountry: 'AR',
        chargedCurrency: 'ARS',
        chargedAmount: 50000,
        exchangeRateToUSD: 1200,
        gatewayId: 'mercadopago',
        gatewayFee: 3000,
        tutorHomeCurrency: 'ARS',
        status: 'completed',
        createdAt: new Date('2026-10-10T14:00:00Z'),
      }),
      // Venta 2 Local: Alumno en Argentina pagando por Transferencia Bancaria Directa
      createOrderLedgerEntry({
        id: 'ord-ar-transf-02',
        courseId: 'curso-ventas-b2b',
        courseTitle: 'Ventas B2B para Consultores',
        tutorId,
        buyerEmail: 'maria@ejemplo.com',
        buyerName: 'María Rodríguez',
        buyerCountry: 'AR',
        chargedCurrency: 'ARS',
        chargedAmount: 45000,
        exchangeRateToUSD: 1200,
        gatewayId: 'transfer',
        gatewayFee: 0, // Transferencia sin comisión de pasarela
        tutorHomeCurrency: 'ARS',
        status: 'completed',
        createdAt: new Date('2026-10-12T16:00:00Z'),
      }),
      // Venta 3 Internacional: Alumno en Chile pagando con tarjeta vía Stripe en USD
      createOrderLedgerEntry({
        id: 'ord-cl-stripe-03',
        courseId: 'curso-ventas-b2b',
        courseTitle: 'Ventas B2B para Consultores',
        tutorId,
        buyerEmail: 'diego@ejemplo.cl',
        buyerName: 'Diego Silva',
        buyerCountry: 'CL',
        chargedCurrency: 'USD',
        chargedAmount: 50,
        exchangeRateToUSD: 1200, // TC al momento del cobro: 1 USD = 1200 ARS
        gatewayId: 'stripe',
        gatewayFee: 2.25, // Fee 4.5% Stripe internacional = 2.25 USD * 1200 = 2700 ARS
        tutorHomeCurrency: 'ARS',
        status: 'completed',
        createdAt: new Date('2026-10-15T18:00:00Z'),
      }),
      // Venta 4 Internacional: Alumno en España pagando con tarjeta vía Stripe en USD (TC varió a 1250)
      createOrderLedgerEntry({
        id: 'ord-es-stripe-04',
        courseId: 'curso-ventas-b2b',
        courseTitle: 'Ventas B2B para Consultores',
        tutorId,
        buyerEmail: 'lucia@ejemplo.es',
        buyerName: 'Lucía Fernández',
        buyerCountry: 'ES',
        chargedCurrency: 'USD',
        chargedAmount: 50,
        exchangeRateToUSD: 1250, // TC al momento del cobro: 1 USD = 1250 ARS
        gatewayId: 'stripe',
        gatewayFee: 2.25, // 2.25 USD * 1250 = 2812.50 ARS
        tutorHomeCurrency: 'ARS',
        status: 'completed',
        createdAt: new Date('2026-10-25T11:00:00Z'),
      }),
    ];

    // Ejecutar consolidación contable
    const statement = buildTutorFinancialStatement({
      tutorId,
      homeCountry,
      homeCurrency,
      orders,
      subscriptions,
      aiCredits,
    });

    // Verificaciones de Identidad y Metadatos
    expect(statement.tutorId).toBe('tutor-angel-101');
    expect(statement.homeCountry).toBe('AR');
    expect(statement.homeCurrency).toBe('ARS');

    // Verificaciones de Desglose de Ventas
    expect(statement.sales.totalCount).toBe(4);
    expect(statement.sales.localSalesCount).toBe(2);
    expect(statement.sales.internationalSalesCount).toBe(2);
    expect(statement.sales.grossLocalRevenue).toBe(95000); // 50000 + 45000
    expect(statement.sales.grossInternationalRevenueUSD).toBe(100); // 50 + 50 USD

    // Consolidación en Moneda del Tutor (ARS):
    // Bruto: 95.000 + (50 * 1200) + (50 * 1250) = 95.000 + 60.000 + 62.500 = 217.500 ARS
    expect(statement.sales.grossTotalConsolidatedInHomeCurrency).toBe(217500);

    // Comisiones deducidas por pasarelas:
    // MP: 3000 + Transfer: 0 + Stripe CL: (2.25*1200 = 2700) + Stripe ES: (2.25*1250 = 2812.50) = 8512.50 ARS
    expect(statement.sales.totalGatewayFeesInHomeCurrency).toBe(8512.5);

    // Ingreso neto por venta de cursos en moneda del tutor:
    // 217.500 - 8.512,50 = 208.987,50 ARS
    expect(statement.sales.netSalesRevenueInHomeCurrency).toBe(208987.5);

    // Verificación de Desglose por Pasarela
    expect(statement.sales.breakdownByGateway.mercadopago.salesCount).toBe(1);
    expect(statement.sales.breakdownByGateway.mercadopago.grossCharged).toBe(50000);
    expect(statement.sales.breakdownByGateway.transfer.salesCount).toBe(1);
    expect(statement.sales.breakdownByGateway.stripe.salesCount).toBe(2);
    expect(statement.sales.breakdownByGateway.stripe.grossCharged).toBe(100);

    // Verificación de Costos de Plataforma
    // Suscripción: 29 USD * 1200 = 34.800 ARS
    expect(statement.platformCosts.subscriptionsTotalUSD).toBe(29);
    expect(statement.platformCosts.subscriptionsTotalInHomeCurrency).toBe(34800);

    // Créditos IA: 15 USD * 1200 = 18.000 ARS
    expect(statement.platformCosts.aiCreditsTotalUSD).toBe(15);
    expect(statement.platformCosts.aiCreditsTotalInHomeCurrency).toBe(18000);

    // Total Costos Plataforma: 34.800 + 18.000 = 52.800 ARS
    expect(statement.platformCosts.totalPlatformCostsInHomeCurrency).toBe(52800);

    // Verificación de Cuadre y Conciliación Operativa:
    // Saldo Operativo Neto = Ingresos Netos de Cursos (208.987,50) - Costos Plataforma (52.800) = 156.187,50 ARS
    expect(statement.reconciliation.totalInflowNet).toBe(208987.5);
    expect(statement.reconciliation.totalOutflow).toBe(52800);
    expect(statement.reconciliation.netOperatingBalance).toBe(156187.5);

    // Cuadre contable estricto: la ecuación matemática cierra al 100%
    expect(statement.reconciliation.isBalanced).toBe(true);

    // Nivel 2: Verificación de Detalle Transaccional (Libro Mayor del Ciclo)
    expect(statement.lineItems.length).toBe(6); // 4 ventas + 1 suscripción + 1 recarga IA
    // Primer item (más reciente: 25 de Octubre - Venta Stripe ES)
    expect(statement.lineItems[0].type).toBe('course_sale');
    expect(statement.lineItems[0].referenceId).toBe('ord-es-stripe-04');
    expect(statement.lineItems[0].netInHomeCurrency).toBe(59687.5);

    // Verificar presencia de suscripción SaaS con importe negativo
    const subItem = statement.lineItems.find((i) => i.type === 'subscription');
    expect(subItem).toBeDefined();
    expect(subItem?.netInHomeCurrency).toBe(-34800);
    expect(subItem?.concept).toBe('Plan Pro Tutor');

    // Verificar presencia de recarga de créditos IA con importe negativo
    const aiItem = statement.lineItems.find((i) => i.type === 'ai_credits');
    expect(aiItem).toBeDefined();
    expect(aiItem?.netInHomeCurrency).toBe(-18000);
    expect(aiItem?.concept).toContain('500');
  });

  it('cuadra las cuentas de un tutor radicado en Estados Unidos (USD) operando a nivel global', () => {
    const tutorId = 'tutor-global-us';
    const homeCountry = 'US';
    const homeCurrency = 'USD';

    const subscriptions: PlatformSubscriptionExpense[] = [
      {
        id: 'sub-pro-us',
        planName: 'Plan Pro Tutor USD',
        amountUSD: 29,
        exchangeRateToHomeCurrency: 1,
        chargedCurrency: 'USD',
        chargedAmount: 29,
        billedAt: new Date('2026-10-01T00:00:00Z'),
      },
    ];

    const aiCredits: AiCreditsExpense[] = [
      {
        id: 'ai-us-pack',
        creditsAmount: 1000,
        amountUSD: 25,
        exchangeRateToHomeCurrency: 1,
        chargedCurrency: 'USD',
        chargedAmount: 25,
        billedAt: new Date('2026-10-02T00:00:00Z'),
      },
    ];

    const orders: OrderLedger[] = [
      // Venta local en EE.UU. por Stripe
      createOrderLedgerEntry({
        id: 'ord-us-01',
        courseId: 'leadership-course',
        tutorId,
        buyerEmail: 'john@example.com',
        buyerName: 'John Smith',
        buyerCountry: 'US',
        chargedCurrency: 'USD',
        chargedAmount: 100,
        exchangeRateToUSD: 1,
        gatewayId: 'stripe',
        gatewayFee: 3.2,
        tutorHomeCurrency: 'USD',
        status: 'completed',
        createdAt: new Date('2026-10-10T00:00:00Z'),
      }),
      // Venta internacional en Reino Unido por PayPal
      createOrderLedgerEntry({
        id: 'ord-uk-02',
        courseId: 'leadership-course',
        tutorId,
        buyerEmail: 'emma@example.co.uk',
        buyerName: 'Emma Watson',
        buyerCountry: 'GB',
        chargedCurrency: 'USD',
        chargedAmount: 150,
        exchangeRateToUSD: 1,
        gatewayId: 'paypal',
        gatewayFee: 6.0,
        tutorHomeCurrency: 'USD',
        status: 'completed',
        createdAt: new Date('2026-10-15T00:00:00Z'),
      }),
    ];

    const statement = buildTutorFinancialStatement({
      tutorId,
      homeCountry,
      homeCurrency,
      orders,
      subscriptions,
      aiCredits,
    });

    expect(statement.sales.grossTotalConsolidatedInHomeCurrency).toBe(250);
    expect(statement.sales.totalGatewayFeesInHomeCurrency).toBe(9.2);
    expect(statement.sales.netSalesRevenueInHomeCurrency).toBe(240.8);

    expect(statement.platformCosts.totalPlatformCostsInHomeCurrency).toBe(54); // 29 + 25
    expect(statement.reconciliation.netOperatingBalance).toBe(186.8); // 240.80 - 54.00
    expect(statement.reconciliation.isBalanced).toBe(true);
  });

  it('filtra correctamente transacciones por rango de fechas (período mensual aislado)', () => {
    const tutorId = 'tutor-filtro-fechas';
    const homeCountry = 'AR';
    const homeCurrency = 'ARS';

    const subscriptions: PlatformSubscriptionExpense[] = [
      {
        id: 'sub-oct',
        planName: 'Plan Pro Octubre',
        amountUSD: 29,
        exchangeRateToHomeCurrency: 1200,
        chargedCurrency: 'USD',
        chargedAmount: 29,
        billedAt: new Date('2026-10-01T00:00:00Z'),
      },
      {
        id: 'sub-nov',
        planName: 'Plan Pro Noviembre',
        amountUSD: 29,
        exchangeRateToHomeCurrency: 1200,
        chargedCurrency: 'USD',
        chargedAmount: 29,
        billedAt: new Date('2026-11-01T00:00:00Z'),
      },
    ];

    const orders: OrderLedger[] = [
      createOrderLedgerEntry({
        id: 'ord-octubre',
        courseId: 'bootcamp-oct',
        tutorId,
        buyerEmail: 'oct@ejemplo.com',
        buyerCountry: 'AR',
        chargedCurrency: 'ARS',
        chargedAmount: 30000,
        exchangeRateToUSD: 1200,
        gatewayId: 'transfer',
        gatewayFee: 0,
        tutorHomeCurrency: 'ARS',
        status: 'completed',
        createdAt: new Date('2026-10-15T12:00:00Z'),
      }),
      createOrderLedgerEntry({
        id: 'ord-noviembre',
        courseId: 'bootcamp-nov',
        tutorId,
        buyerEmail: 'nov@ejemplo.com',
        buyerCountry: 'AR',
        chargedCurrency: 'ARS',
        chargedAmount: 50000,
        exchangeRateToUSD: 1200,
        gatewayId: 'transfer',
        gatewayFee: 0,
        tutorHomeCurrency: 'ARS',
        status: 'completed',
        createdAt: new Date('2026-11-05T12:00:00Z'),
      }),
    ];

    // Consulta acotada exclusivamente a Octubre 2026
    const octoberStatement = buildTutorFinancialStatement({
      tutorId,
      homeCountry,
      homeCurrency,
      fromDate: new Date('2026-10-01T00:00:00Z'),
      toDate: new Date('2026-10-31T23:59:59Z'),
      orders,
      subscriptions,
      aiCredits: [],
    });

    expect(octoberStatement.sales.totalCount).toBe(1);
    expect(octoberStatement.sales.netSalesRevenueInHomeCurrency).toBe(30000);
    expect(octoberStatement.platformCosts.subscriptionsList.length).toBe(1);
    expect(octoberStatement.platformCosts.totalPlatformCostsInHomeCurrency).toBe(34800);
    // En octubre tuvo balance de: 30000 - 34800 = -4800 ARS (inversión de inicio)
    expect(octoberStatement.reconciliation.netOperatingBalance).toBe(-4800);
    expect(octoberStatement.reconciliation.isBalanced).toBe(true);
  });

  it('cuadra perfectamente cuando el tutor aún no ha realizado ventas (solo costos iniciales de plataforma)', () => {
    const statement = buildTutorFinancialStatement({
      tutorId: 'tutor-nuevo',
      homeCountry: 'AR',
      homeCurrency: 'ARS',
      orders: [],
      subscriptions: [
        {
          id: 'sub-1',
          planName: 'Plan Starter',
          amountUSD: 10,
          exchangeRateToHomeCurrency: 1200,
          chargedCurrency: 'USD',
          chargedAmount: 10,
          billedAt: new Date('2026-10-01T00:00:00Z'),
        },
      ],
      aiCredits: [
        {
          id: 'cred-1',
          creditsAmount: 100,
          amountUSD: 5,
          exchangeRateToHomeCurrency: 1200,
          chargedCurrency: 'USD',
          chargedAmount: 5,
          billedAt: new Date('2026-10-02T00:00:00Z'),
        },
      ],
    });

    expect(statement.sales.totalCount).toBe(0);
    expect(statement.sales.netSalesRevenueInHomeCurrency).toBe(0);
    expect(statement.platformCosts.totalPlatformCostsInHomeCurrency).toBe(18000); // (10 + 5) * 1200
    expect(statement.reconciliation.netOperatingBalance).toBe(-18000);
    expect(statement.reconciliation.isBalanced).toBe(true);
  });
});
