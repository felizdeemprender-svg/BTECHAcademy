import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
export const dynamic = 'force-dynamic';
import { chargeTutorMonthlyBill } from '@/services/payments/orchestrator';

export async function GET(request: Request) {
  // 1. Verificación de seguridad para evitar llamadas no autorizadas al cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar usuarios con ciclos vencidos o que venzan hoy
    // En Firestore no podemos hacer `<=` directo sobre fechas sin crear un índice si lo combinamos con status.
    // Lo simplificaremos asumiendo una colección "users".
    const usersSnapshot = await adminDb.collection('users')
      .where('subscription.status', 'in', ['active', 'trial'])
      .get();

    const results = [];

    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      const billing = user.billingCycle;
      const sub = user.subscription;
      
      if (!billing || !billing.currentCycleEnd) continue;

      const cycleEnd = billing.currentCycleEnd.toDate();
      if (cycleEnd > today) continue; // Aún no vence

      // --- PASO B: Calcular Abono Fijo y Promociones ---
      let fixedAmount = sub.fixedAmount || 0;
      let discountPercent = 0;
      let promoIndex = billing.promotionalCycleIndex || 0;

      // Obtener el plan para ver las reglas de la promoción (simulado)
      const planSnapshot = await adminDb.collection('subscriptionPlans').doc(sub.planId).get();
      const plan = planSnapshot.exists ? planSnapshot.data() : null;

      if (plan && plan.promotions && plan.promotions.periods) {
        // Encontrar en qué periodo cae el index actual
        let elapsed = 0;
        for (const period of plan.promotions.periods) {
          if (promoIndex >= elapsed && promoIndex < elapsed + period.cycleCount) {
            discountPercent = period.discountPercent;
            break;
          }
          elapsed += period.cycleCount;
        }
      }

      const discountedFixedAmount = fixedAmount * (1 - (discountPercent / 100));

      // --- PASO C: Calcular Regalías ---
      let royaltiesAmount = 0;
      const sales = billing.monthlySalesAmount || 0;
      let activeStudentsCount = 0;
      
      if (sub.type === 'mixed' && plan?.pricing?.revenueShare) {
        // Contar la cantidad de alumnos únicos activos del tutor
        const enrollmentsSnap = await adminDb.collection('enrollments')
          .where('mentorId', '==', doc.id)
          .where('status', '==', 'active')
          .get();
        
        const uniqueStudents = new Set();
        enrollmentsSnap.forEach(e => uniqueStudents.add(e.data().studentId));
        activeStudentsCount = uniqueStudents.size;
        
        const { freeStudentsIncluded = 0, tiers = [] } = plan.pricing.revenueShare;
        
        // Calcular estudiantes sujetos a comisión
        const studentsForTier = Math.max(0, activeStudentsCount - freeStudentsIncluded);
        
        // Encontrar el tier que aplique basado en la cantidad de alumnos
        const matchingTier = tiers.find((t: any) => studentsForTier >= t.min && (t.max === -1 || t.max === 0 || studentsForTier <= t.max));
        
        if (matchingTier) {
          royaltiesAmount = sales * (matchingTier.percentage / 100);
        }
      }

      const totalToCharge = discountedFixedAmount + royaltiesAmount;
      let chargeStatus = 'pending';
      let chargeReason = null;

      // --- PASO D: Ejecutar el Cobro ---
      if (totalToCharge > 0) {
        const stripeCustomerId = user.payment?.stripeCustomerId;
        if (!stripeCustomerId) {
          chargeStatus = 'failed';
          chargeReason = 'No Stripe Customer ID';
          results.push({ userId: doc.id, success: false, reason: chargeReason });
          
          await doc.ref.collection('invoices').doc(cycleEnd.toISOString().split('T')[0]).set({
            cycleStart: billing.currentCycleStart,
            cycleEnd: billing.currentCycleEnd,
            planId: sub.planId,
            planName: sub.planName || plan?.name || 'Plan',
            fixedAmount, discountPercent, discountedFixedAmount,
            salesAmount: sales, activeStudentsCount,
            royaltiesAmount, totalCharged: totalToCharge,
            status: chargeStatus, failureReason: chargeReason,
            createdAt: new Date(),
          });

          // Pasar a past_due
          await doc.ref.update({
            'subscription.status': 'past_due',
            'subscription.gracePeriodEndsAt': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días de gracia
          });
          continue;
        }

        const chargeResult = await chargeTutorMonthlyBill(
          stripeCustomerId, 
          totalToCharge, 
          'usd', 
          `Facturación mensual - Abono + Regalías`
        );

        if (!chargeResult.success) {
          chargeStatus = 'failed';
          chargeReason = chargeResult.error;
          results.push({ userId: doc.id, success: false, reason: chargeReason });
          
          await doc.ref.collection('invoices').doc(cycleEnd.toISOString().split('T')[0]).set({
            cycleStart: billing.currentCycleStart,
            cycleEnd: billing.currentCycleEnd,
            planId: sub.planId,
            planName: sub.planName || plan?.name || 'Plan',
            fixedAmount, discountPercent, discountedFixedAmount,
            salesAmount: sales, activeStudentsCount,
            royaltiesAmount, totalCharged: totalToCharge,
            status: chargeStatus, failureReason: chargeReason,
            createdAt: new Date(),
          });

          // Pasar a past_due
          await doc.ref.update({
            'subscription.status': 'past_due',
            'subscription.gracePeriodEndsAt': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          });
          continue;
        } else {
          chargeStatus = 'paid';
        }
      } else {
        chargeStatus = 'paid'; // Si es 0, es gratis, se considera pagado
      }

      // --- PASO E: Renovación Exitosa ---
      await doc.ref.collection('invoices').doc(cycleEnd.toISOString().split('T')[0]).set({
        cycleStart: billing.currentCycleStart,
        cycleEnd: billing.currentCycleEnd,
        planId: sub.planId,
        planName: sub.planName || plan?.name || 'Plan',
        fixedAmount, discountPercent, discountedFixedAmount,
        salesAmount: sales, activeStudentsCount,
        royaltiesAmount, totalCharged: totalToCharge,
        status: chargeStatus, failureReason: null,
        createdAt: new Date(),
      });
      // Calcular próxima fecha según el ciclo del plan
      const nextCycleEnd = new Date(cycleEnd);
      const monthsToAdd = plan?.pricing?.billingCycleMonths || 1;
      nextCycleEnd.setMonth(nextCycleEnd.getMonth() + monthsToAdd);

      await doc.ref.update({
        'billingCycle.currentCycleStart': cycleEnd,
        'billingCycle.currentCycleEnd': nextCycleEnd,
        'billingCycle.promotionalCycleIndex': promoIndex + 1,
        'billingCycle.monthlySalesAmount': 0 // Resetear acumulador de ventas
      });

      results.push({ userId: doc.id, success: true, charged: totalToCharge });
    }

    return NextResponse.json({ success: true, processed: results.length, results });

  } catch (error: any) {
    console.error('Error in billing cron job:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
