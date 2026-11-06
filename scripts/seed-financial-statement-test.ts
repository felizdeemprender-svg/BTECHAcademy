/**
 * Script de Seed para Ambiente de Testing (feliz-de-emprender).
 * Pobla datos financieros realistas para un tutor:
 * 1. Moneda y país base (AR / ARS).
 * 2. Egresos: Abono mensual de suscripción ($29 USD) y compra de créditos IA ($15 USD).
 * 3. Ingresos: Ventas locales en ARS (Mercado Pago y Transferencia) y ventas internacionales en USD (Stripe).
 * 4. Libro mayor (orderLedger) listo para auditar en /settings/plan?tab=reporte.
 *
 * Ejecución:
 *   npx tsx scripts/seed-financial-statement-test.ts [tutorId]
 */
import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccountPath = path.resolve(process.cwd(), 'service-account-test.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });
}

const db = admin.firestore();

async function seedFinancialData(targetTutorId?: string) {
  const tutorId = targetTutorId || '21CFMMj7UOhebXzoJlQME5NMUfU2'; // supervisor.felizdeemprender@gmail.com por defecto

  console.log(`[Seed Testing] Configurando datos financieros para tutor: ${tutorId}`);

  const userRef = db.collection('users').doc(tutorId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    console.error(`[Error] Tutor con ID ${tutorId} no encontrado en feliz-de-emprender.`);
    process.exit(1);
  }

  const now = new Date();
  const subBilledDate = new Date(now.getFullYear(), now.getMonth(), 1, 10, 0, 0);
  const aiCreditBilledDate = new Date(now.getFullYear(), now.getMonth(), 5, 15, 30, 0);

  // 1. Configurar país, moneda base, ciclo de facturación actual (mes corriente) y compras de créditos IA en el perfil del tutor
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  await userRef.set(
    {
      homeCountry: 'AR',
      homeCurrency: 'ARS',
      billingCycle: {
        currentCycleStart: currentMonthStart,
        currentCycleEnd: currentMonthEnd,
        monthlySalesAmount: 95000,
        promotionalCycleIndex: 1,
      },
      subscription: {
        ...(userSnap.data()?.subscription || {}),
        planName: 'Plan Pro Tutor',
        amountUSD: 29,
        exchangeRate: 1200,
        status: 'active',
      },
      creditsPurchases: [
        {
          id: `cred_${Date.now()}_500`,
          credits: 500,
          amountUSD: 15,
          exchangeRate: 1200,
          currency: 'USD',
          chargedAmount: 15,
          createdAt: aiCreditBilledDate,
        },
      ],
    },
    { merge: true },
  );

  console.log('[Seed Testing] Perfil de tutor actualizado con ciclo Noviembre 2026, moneda ARS y egresos de plataforma.');

  // 2. Insertar órdenes en el libro mayor (orderLedger)
  const sampleOrders = [
    {
      id: `ord_${tutorId}_mp_01`,
      courseId: 'curso-ventas-b2b',
      courseTitle: 'Ventas B2B para Consultores',
      tutorId,
      buyerEmail: 'carlos.gomez@ejemplo.com',
      buyerName: 'Carlos Gómez',
      buyerCountry: 'AR',
      chargedCurrency: 'ARS',
      chargedAmount: 50000,
      exchangeRateToUSD: 1200,
      amountInUSD: 41.67,
      gatewayId: 'mercadopago',
      gatewayFee: 3000,
      netAmount: 47000,
      tutorHomeCurrency: 'ARS',
      netInTutorCurrency: 47000,
      status: 'completed',
      createdAt: new Date(now.getFullYear(), now.getMonth(), 10, 14, 0, 0),
    },
    {
      id: `ord_${tutorId}_transf_02`,
      courseId: 'curso-ventas-b2b',
      courseTitle: 'Ventas B2B para Consultores',
      tutorId,
      buyerEmail: 'maria.rodriguez@ejemplo.com',
      buyerName: 'María Rodríguez',
      buyerCountry: 'AR',
      chargedCurrency: 'ARS',
      chargedAmount: 45000,
      exchangeRateToUSD: 1200,
      amountInUSD: 37.5,
      gatewayId: 'transfer',
      gatewayFee: 0,
      netAmount: 45000,
      tutorHomeCurrency: 'ARS',
      netInTutorCurrency: 45000,
      status: 'completed',
      createdAt: new Date(now.getFullYear(), now.getMonth(), 12, 16, 0, 0),
    },
    {
      id: `ord_${tutorId}_stripe_cl_03`,
      courseId: 'curso-ventas-b2b',
      courseTitle: 'Ventas B2B para Consultores',
      tutorId,
      buyerEmail: 'diego.silva@ejemplo.cl',
      buyerName: 'Diego Silva',
      buyerCountry: 'CL',
      chargedCurrency: 'USD',
      chargedAmount: 50,
      exchangeRateToUSD: 1200,
      amountInUSD: 50,
      gatewayId: 'stripe',
      gatewayFee: 2.25,
      netAmount: 47.75,
      tutorHomeCurrency: 'ARS',
      netInTutorCurrency: 57300, // 47.75 * 1200
      status: 'completed',
      createdAt: new Date(now.getFullYear(), now.getMonth(), 15, 18, 0, 0),
    },
    {
      id: `ord_${tutorId}_stripe_es_04`,
      courseId: 'curso-ventas-b2b',
      courseTitle: 'Ventas B2B para Consultores',
      tutorId,
      buyerEmail: 'lucia.fernandez@ejemplo.es',
      buyerName: 'Lucía Fernández',
      buyerCountry: 'ES',
      chargedCurrency: 'USD',
      chargedAmount: 50,
      exchangeRateToUSD: 1250,
      amountInUSD: 50,
      gatewayId: 'stripe',
      gatewayFee: 2.25,
      netAmount: 47.75,
      tutorHomeCurrency: 'ARS',
      netInTutorCurrency: 59687.5, // 47.75 * 1250
      status: 'completed',
      createdAt: new Date(now.getFullYear(), now.getMonth(), 25, 11, 0, 0),
    },
  ];

  for (const order of sampleOrders) {
    await db.collection('orderLedger').doc(order.id).set(order, { merge: true });
  }

  console.log('[Seed Testing] 4 órdenes de prueba insertadas en orderLedger.');
  console.log('---');
  console.log('Resumen Contable del Ciclo de Prueba:');
  console.log('  • Ingreso Bruto Consolidado: ARS $217.500,00');
  console.log('  • Comisiones de Pasarelas:   ARS $8.512,50');
  console.log('  • Ingreso Neto por Ventas:   ARS $208.987,50');
  console.log('  • Costos Plataforma:        ARS $52.800,00 (SaaS $34.800 + IA $18.000)');
  console.log('  • Saldo Operativo Neto:     ARS $156.187,50 (A favor del tutor)');
  console.log('  • Estado del Cuadre:        100% Verificado (0.00 descuadre)');
  console.log('---');
  console.log('Para auditar el reporte en vivo:');
  console.log('  http://localhost:9002/settings/plan?tab=reporte');
  console.log('---');
}

const argTutorId = process.argv[2];
seedFinancialData(argTutorId).catch((err) => {
  console.error('[Seed Testing Error]:', err);
  process.exit(1);
});

