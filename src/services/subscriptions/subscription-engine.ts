import { getAdminFirestore } from '@/firebase/admin';
import { format, addDays, addMonths } from 'date-fns';
import {
  sendTrialEndingEmail,
  sendSubscriptionActivatedEmail,
  sendPaymentFailedEmail,
  sendAccountSuspendedEmail,
} from '@/lib/emails/subscription';

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled';

/**
 * MOTOR DE SUSCRIPCIONES (WEBHOOK DRIVEN)
 * Servicio centralizado que maneja el ciclo de vida completo de una suscripción.
 */

/** Activa el período de prueba cuando un tutor se registra */
export async function activateTrial(tutorId: string, planId: string) {
  const db = getAdminFirestore();

  const planDoc = await db.collection('subscriptionPlans').doc(planId).get();
  if (!planDoc.exists) throw new Error(`Plan ${planId} no encontrado`);
  const plan = planDoc.data()!;

  const trialDays = plan.trialDays ?? 90;
  const now = new Date();
  const trialEndsAt = addDays(now, trialDays);
  const nextBillingAt = trialEndsAt;

  await db.collection('users').doc(tutorId).update({
    'subscription.status': trialDays > 0 ? 'trialing' : 'active',
    'subscription.planId': planId,
    'subscription.planName': plan.name,
    'subscription.trialEndsAt': trialEndsAt,
    'subscription.nextBillingAt': nextBillingAt,
    'subscription.gracePeriodEndsAt': null,
    'subscription.limits': plan.limits,
    'subscription.permissions': plan.permissions,
    'subscription.invitationsPerCourse': plan.invitationsPerCourse || 5,
    'subscription.aiQuotas': { totalCredits: plan.aiQuotas?.totalCredits || 0, usedCredits: 0 },
    'subscription.hasPremiumAI': plan.hasPremiumAI || false,
    'subscription.startDate': now,
  });

  console.log(`[SubscriptionEngine] Trial activado: ${tutorId} → Plan ${plan.name} (${trialDays} días)`);
  return { trialDays, trialEndsAt };
}

/** Procesa el aviso de fin de trial cuando se acercan X días */
export async function processTrialEndingReminder(tutorId: string) {
  const db = getAdminFirestore();

  const userDoc = await db.collection('users').doc(tutorId).get();
  const user = userDoc.data();
  if (!user?.subscription?.trialEndsAt) return;

  const planDoc = await db.collection('subscriptionPlans').doc(user.subscription.planId).get();
  const plan = planDoc.data() || {};
  const trialReminderDays = plan.trialReminderDays ?? 5;

  const trialEndsAt = user.subscription.trialEndsAt.toDate
    ? user.subscription.trialEndsAt.toDate()
    : new Date(user.subscription.trialEndsAt);

  const daysLeft = Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= trialReminderDays && daysLeft > 0) {
    await sendTrialEndingEmail(
      user.email,
      user.displayName || 'Tutor',
      daysLeft,
      user.subscription.planName || plan.name || 'Fastoria'
    );
    console.log(`[SubscriptionEngine] Reminder enviado a ${user.email}: ${daysLeft} días restantes`);
  }
}

/** Invocado por Webhook: Cuando una suscripción es creada exitosamente en la pasarela */
export async function handleSubscriptionCreated(tutorId: string, subscriptionId: string, gateway: string) {
  const db = getAdminFirestore();
  await db.collection('users').doc(tutorId).update({
    'subscription.gateway': gateway,
    'subscription.gatewaySubscriptionId': subscriptionId,
  });
  console.log(`[SubscriptionEngine] Suscripción externa enlazada: ${tutorId} → ${subscriptionId} (${gateway})`);
}

/** Invocado por Webhook: Cuando se cobra exitosamente la recurrencia */
export async function handlePaymentSucceeded(tutorId: string, nextBillingDate?: Date) {
  const db = getAdminFirestore();

  const userDoc = await db.collection('users').doc(tutorId).get();
  const user = userDoc.data();
  if (!user) throw new Error(`Usuario ${tutorId} no encontrado`);

  // Si estaba suspendido, reactivarlo
  if (user.subscription?.status === 'suspended') {
    await reactivateTutor(tutorId);
  }

  const planDoc = await db.collection('subscriptionPlans').doc(user.subscription?.planId).get();
  const plan = planDoc.data() || { name: 'Plan Actual' };

  // Si la pasarela no nos dice la fecha, asumimos 1 mes o lo que diga el plan
  let nextBillingAt = nextBillingDate;
  if (!nextBillingAt) {
    const billingCycleMonths = plan.billingCycleMonths ?? 1;
    nextBillingAt = addMonths(new Date(), billingCycleMonths);
  }

  await db.collection('users').doc(tutorId).update({
    'subscription.status': 'active' as SubscriptionStatus,
    'subscription.nextBillingAt': nextBillingAt,
    'subscription.gracePeriodEndsAt': null,
    'subscription.lastBilledAt': new Date(),
  });

  await sendSubscriptionActivatedEmail(
    user.email,
    user.displayName || 'Tutor',
    plan.name,
    format(nextBillingAt, 'dd/MM/yyyy')
  );

  console.log(`[SubscriptionEngine] Pago recurrente exitoso (Webhook): ${tutorId}. Próximo cobro: ${format(nextBillingAt, 'dd/MM/yyyy')}`);
}

/** Invocado por Webhook: Cuando falla un cobro (activa Dunning) */
export async function handlePaymentFailed(tutorId: string) {
  const db = getAdminFirestore();

  const userDoc = await db.collection('users').doc(tutorId).get();
  const user = userDoc.data();
  if (!user) return;

  const planDoc = await db.collection('subscriptionPlans').doc(user.subscription?.planId).get();
  const plan = planDoc.data() || {};
  const gracePeriodDays = plan.gracePeriodDays ?? 7;

  const gracePeriodEndsAt = addDays(new Date(), gracePeriodDays);

  await db.collection('users').doc(tutorId).update({
    'subscription.status': 'past_due' as SubscriptionStatus,
    'subscription.gracePeriodEndsAt': gracePeriodEndsAt,
    'subscription.failedBillingAt': new Date(),
  });

  await sendPaymentFailedEmail(
    user.email,
    user.displayName || 'Tutor',
    format(gracePeriodEndsAt, 'dd/MM/yyyy')
  );

  console.log(`[SubscriptionEngine] Pago recurrente fallido (Webhook) para ${tutorId}. Gracia hasta ${format(gracePeriodEndsAt, 'dd/MM/yyyy')}`);
}

/** Invocado por Webhook: Cuando la suscripción es cancelada definitivamente */
export async function handleSubscriptionCanceled(tutorId: string) {
  await suspendTutor(tutorId);
}

/** Suspende la cuenta de un tutor y pausa sus landings */
export async function suspendTutor(tutorId: string) {
  const db = getAdminFirestore();

  const userDoc = await db.collection('users').doc(tutorId).get();
  const user = userDoc.data();
  if (!user) return;

  // 1. Cambiar estado de la cuenta
  await db.collection('users').doc(tutorId).update({
    'subscription.status': 'suspended' as SubscriptionStatus,
    'subscription.suspendedAt': new Date(),
  });

  // 2. Pausar todas las landings del tutor
  const landingsSnap = await db.collection('salesPages')
    .where('mentorId', '==', tutorId)
    .where('status', '==', 'active')
    .get();

  const batch = db.batch();
  landingsSnap.docs.forEach(doc => {
    batch.update(doc.ref, { status: 'suspended_by_system' });
  });
  await batch.commit();

  // 3. Notificar al tutor
  await sendAccountSuspendedEmail(user.email, user.displayName || 'Tutor');

  console.log(`[SubscriptionEngine] Tutor ${tutorId} suspendido. Landings pausadas: ${landingsSnap.size}`);
}

/** Reactiva la cuenta de un tutor tras cobro exitoso post-suspensión */
export async function reactivateTutor(tutorId: string) {
  const db = getAdminFirestore();

  await db.collection('users').doc(tutorId).update({
    'subscription.status': 'active' as SubscriptionStatus,
    'subscription.gracePeriodEndsAt': null,
    'subscription.suspendedAt': null,
  });

  // Reactivar landings pausadas por el sistema
  const landingsSnap = await db.collection('salesPages')
    .where('mentorId', '==', tutorId)
    .where('status', '==', 'suspended_by_system')
    .get();

  const batch = db.batch();
  landingsSnap.docs.forEach(doc => {
    batch.update(doc.ref, { status: 'active' });
  });
  await batch.commit();

  console.log(`[SubscriptionEngine] Tutor ${tutorId} reactivado. Landings restauradas: ${landingsSnap.size}`);
}
