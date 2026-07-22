import { getAdminFirestore } from '@/firebase/admin';
import { format, addDays, addMonths } from 'date-fns';
import {
  sendTrialEndingEmail,
  sendSubscriptionActivatedEmail,
  sendPaymentFailedEmail,
  sendAccountSuspendedEmail,
} from '@/lib/emails/subscription';
import { createMercadoPagoSession } from '@/services/payments/mercadopago';

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled';

/**
 * MOTOR DE SUSCRIPCIONES
 * Servicio centralizado que maneja el ciclo de vida completo de una suscripción.
 * Nunca hay lógica de billing duplicada: todo pasa por aquí.
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

/** Intenta cobrar la mensualidad a un tutor */
export async function processBilling(tutorId: string): Promise<'success' | 'failed'> {
  const db = getAdminFirestore();

  const userDoc = await db.collection('users').doc(tutorId).get();
  const user = userDoc.data();
  if (!user) throw new Error(`Usuario ${tutorId} no encontrado`);

  const planDoc = await db.collection('subscriptionPlans').doc(user.subscription?.planId).get();
  const plan = planDoc.data();
  if (!plan) throw new Error(`Plan no encontrado para ${tutorId}`);

  // Buscar el método de pago del sistema (el administrador cobra al tutor)
  const methodsSnap = await db.collection('systemPaymentMethods')
    .where('isActive', '==', true)
    .where('type', '==', 'mercadopago')
    .limit(1)
    .get();

  if (methodsSnap.empty) {
    console.error(`[SubscriptionEngine] No hay métodos de pago del sistema para cobrar a ${tutorId}`);
    return 'failed';
  }

  const systemPaymentConfig = methodsSnap.docs[0].data().config;

  try {
    // Generar preferencia de pago (el tutor deberá aprobarla desde su email o usar preaprobación)
    // En una integración completa con Getnet/MP Preapproval, esto sería un débito automático sin redirección.
    // Por ahora generamos la preferencia y registramos el intento.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fastoriaacademy.ai';

    await createMercadoPagoSession({
      pageId: `sub_${tutorId}`,
      title: `Suscripción Fastoria - ${plan.name}`,
      price: plan.price,
      studentEmail: user.email,
      studentName: user.displayName || 'Tutor',
      mentorId: 'system',
      mpAccessToken: systemPaymentConfig.accessToken,
      baseUrl,
    });

    // Cobro generado exitosamente - actualizar nextBillingAt
    const billingCycleMonths = plan.billingCycleMonths ?? 1;
    const nextBillingAt = addMonths(new Date(), billingCycleMonths);

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

    console.log(`[SubscriptionEngine] Cobro exitoso: ${tutorId}`);
    return 'success';
  } catch (error) {
    console.error(`[SubscriptionEngine] Error procesando cobro para ${tutorId}:`, error);
    return 'failed';
  }
}

/** Maneja un cobro fallido: activa el período de gracia y envía email */
export async function handleBillingFailure(tutorId: string) {
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

  console.log(`[SubscriptionEngine] Cobro fallido para ${tutorId}. Gracia hasta ${format(gracePeriodEndsAt, 'dd/MM/yyyy')}`);
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

  const userDoc = await db.collection('users').doc(tutorId).get();
  const plan = userDoc.data()?.subscription;

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
