import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import {
  processTrialEndingReminder,
  processBilling,
  handleBillingFailure,
  suspendTutor,
} from '@/services/subscriptions/subscription-engine';

/**
 * CRON JOB DIARIO DE SUSCRIPCIONES
 *
 * Llamar este endpoint todos los días a las 00:00 hs desde:
 * - Vercel Cron (vercel.json) o
 * - Un servicio externo como EasyCron
 *
 * Protección mediante CRON_SECRET en las headers.
 */
export async function GET(req: NextRequest) {
  // Proteger el endpoint
  const cronSecret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  if (cronSecret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminFirestore();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const results = {
    trialReminders: 0,
    billingAttempts: 0,
    billingSuccesses: 0,
    billingFailures: 0,
    suspensions: 0,
    errors: [] as string[],
  };

  try {
    // ── 1. ENVIAR RECORDATORIOS DE TRIAL ──────────────────────────────────
    // Buscar tutores en "trialing" y verificar si les toca el reminder
    const trialingSnap = await db.collection('users')
      .where('subscription.status', '==', 'trialing')
      .get();

    for (const doc of trialingSnap.docs) {
      try {
        await processTrialEndingReminder(doc.id);
        results.trialReminders++;
      } catch (e: any) {
        results.errors.push(`trialReminder:${doc.id}: ${e.message}`);
      }
    }

    // ── 2. COBRAR MENSUALIDADES VENCIDAS ──────────────────────────────────
    // Buscar tutores activos/trialing cuyo nextBillingAt es hoy
    const billingSnap = await db.collection('users')
      .where('subscription.nextBillingAt', '>=', todayStart)
      .where('subscription.nextBillingAt', '<', todayEnd)
      .get();

    for (const doc of billingSnap.docs) {
      const sub = doc.data().subscription;
      // Solo cobrar si el plan tiene precio > 0
      const planDoc = await db.collection('subscriptionPlans').doc(sub?.planId || '').get();
      const plan = planDoc.data();
      if (!plan || !plan.price || plan.price === 0) continue;

      results.billingAttempts++;
      try {
        const outcome = await processBilling(doc.id);
        if (outcome === 'success') {
          results.billingSuccesses++;
        } else {
          results.billingFailures++;
          await handleBillingFailure(doc.id);
        }
      } catch (e: any) {
        results.billingFailures++;
        results.errors.push(`billing:${doc.id}: ${e.message}`);
        await handleBillingFailure(doc.id).catch(() => {});
      }
    }

    // ── 3. REINTENTOS AUTOMÁTICOS (past_due) ─────────────────────────────
    const pastDueSnap = await db.collection('users')
      .where('subscription.status', '==', 'past_due')
      .get();

    for (const doc of pastDueSnap.docs) {
      const sub = doc.data().subscription;
      const failedAt = sub?.failedBillingAt?.toDate
        ? sub.failedBillingAt.toDate()
        : sub?.failedBillingAt ? new Date(sub.failedBillingAt) : null;

      if (!failedAt) continue;

      const planDoc = await db.collection('subscriptionPlans').doc(sub?.planId || '').get();
      const plan = planDoc.data() || {};
      const retryIntervalDays = plan.retryIntervalDays ?? 2;

      const daysSinceFailed = Math.floor((now.getTime() - failedAt.getTime()) / (1000 * 60 * 60 * 24));

      // Reintentar si es múltiplo del intervalo (ej: días 2, 4, 6...)
      if (daysSinceFailed > 0 && daysSinceFailed % retryIntervalDays === 0) {
        results.billingAttempts++;
        try {
          const outcome = await processBilling(doc.id);
          if (outcome === 'success') {
            results.billingSuccesses++;
            console.log(`[Cron] Reintento exitoso para ${doc.id}`);
          }
        } catch (e: any) {
          results.errors.push(`retry:${doc.id}: ${e.message}`);
        }
      }
    }

    // ── 4. SUSPENDER CUENTAS CON GRACIA VENCIDA ───────────────────────────
    const graceDueSnap = await db.collection('users')
      .where('subscription.status', '==', 'past_due')
      .where('subscription.gracePeriodEndsAt', '>=', todayStart)
      .where('subscription.gracePeriodEndsAt', '<', todayEnd)
      .get();

    for (const doc of graceDueSnap.docs) {
      try {
        await suspendTutor(doc.id);
        results.suspensions++;
      } catch (e: any) {
        results.errors.push(`suspend:${doc.id}: ${e.message}`);
      }
    }

    console.log('[Cron Suscripciones] Resultado:', results);
    return NextResponse.json({ success: true, results, runAt: now.toISOString() });

  } catch (error: any) {
    console.error('[Cron Suscripciones] Error fatal:', error);
    return NextResponse.json({ error: error.message, results }, { status: 500 });
  }
}
