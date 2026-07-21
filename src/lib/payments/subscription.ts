import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Servicio centralizado para activar suscripciones de mentores.
 * Soporta activaciones desde Webhooks (Mercado Pago) o directas (Planes Gratis).
 * Maneja lógica de Upgrades con prorrateo de tiempo.
 */
export async function processSuccessfulSubscription(
  paymentId: string,
  planId: string,
  status: string,
  leadData?: { email: string; displayName: string; userId?: string },
  isUpgrade: boolean = false
) {
  const db = getAdminFirestore();

  if (status !== 'approved' && status !== 'free_activation') {
    return { success: false, reason: 'not_approved' };
  }

  try {
    console.log(`[Subscription] Activando: Plan=${planId} | Pago=${paymentId} | Upgrade=${isUpgrade}`);

    // 1. Obtener datos del plan nuevo
    const planSnap = await db.collection('subscriptionPlans').doc(planId).get();
    if (!planSnap.exists) {
      throw new Error(`Plan ${planId} no encontrado`);
    }
    const plan = planSnap.data();

    // 2. Identificar o Crear Usuario
    let userRef;
    let userData: any = null;

    if (leadData?.userId && typeof leadData.userId === 'string' && leadData.userId.length > 5 && leadData.userId !== 'new_mentor' && leadData.userId !== 'temp_lead' && leadData.userId !== 'free_activation') {
      userRef = db.collection('users').doc(leadData.userId);
      const snap = await userRef.get();
      userData = snap.exists ? snap.data() : null;
    } 
    
    if (!userData && leadData?.email) {
      const userByEmail = await db.collection('users').where('email', '==', leadData.email).limit(1).get();
      if (!userByEmail.empty) {
        userRef = userByEmail.docs[0].ref;
        userData = userByEmail.docs[0].data();
      } else {
        const newUserId = `mentor_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        userRef = db.collection('users').doc(newUserId);
        userData = {
          uid: newUserId,
          email: leadData.email,
          displayName: leadData.displayName || 'Nuevo Mentor',
          roles: ['mentor'],
          createdAt: FieldValue.serverTimestamp(),
          metadata: { isMentor: true }
        };
        await userRef.set(userData);
      }
    }

    if (!userRef || !userData) {
      throw new Error('No se pudo identificar al usuario para la suscripción');
    }

    // 3. Lógica de Vigencia (Upgrade vs New)
    let remainingMonths = 0;
    let baseStartDate = new Date();
    
    if (isUpgrade && userData.subscription?.status === 'active') {
      // Calcular meses restantes del plan anterior
      const oldStartDate = userData.subscription.startDate?.toDate ? userData.subscription.startDate.toDate() : new Date(userData.subscription.startDate);
      const oldDuration = userData.subscription.durationMonths || 12;
      const expirationDate = new Date(oldStartDate);
      expirationDate.setMonth(expirationDate.getMonth() + oldDuration);
      
      const now = new Date();
      if (expirationDate > now) {
        const diffTime = Math.abs(expirationDate.getTime() - now.getTime());
        remainingMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
      }
    }

    const newDurationMonths = (plan?.durationMonths || 12) + remainingMonths;
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + newDurationMonths);

    // 4. Preparar datos de suscripción y permisos
    const roles = Array.from(new Set([...(userData?.roles || []), 'mentor']));
    const planPermissions = plan?.permissions || {};
    const mentorPermissions = Object.keys(planPermissions).filter(key => planPermissions[key] === true);
    
    const subscriptionData = {
      planId: planId,
      planName: plan?.name,
      status: 'active',
      startDate: FieldValue.serverTimestamp(),
      paymentId: paymentId,
      aiQuotas: {
        totalCredits: plan?.aiQuotas?.totalCredits || 0,
        usedCredits: 0
      },
      lastBillingDate: FieldValue.serverTimestamp(),
      nextBillingDate: nextBillingDate, // Nueva fecha extendida
      durationMonths: plan?.durationMonths || 12,
      remainingMonthsFromPrevious: remainingMonths,
      totalValidityMonths: newDurationMonths,
      // Inyectar límites y capacidades para que la UI los detecte
      limits: plan?.limits || {},
      invitationsPerCourse: plan?.invitationsPerCourse || 0,
      hasPremiumAI: plan?.hasPremiumAI || false
    };

    // 5. Actualizar Perfil
    await userRef.update({
      roles: roles,
      mentorPermissions: mentorPermissions,
      subscription: subscriptionData,
      'metadata.lastPlanActivation': FieldValue.serverTimestamp(),
      'metadata.isMentor': true,
      displayName: userData.displayName || leadData?.displayName
    });

    // 6. Registrar Historial
    await db.collection('billingHistory').add({
      userId: userRef.id,
      planId,
      planName: plan?.name,
      amount: plan?.price || 0,
      paymentId,
      status: 'success',
      createdAt: FieldValue.serverTimestamp(),
      type: isUpgrade ? 'plan_upgrade' : 'subscription_activation',
      details: isUpgrade ? `Upgrade con ${remainingMonths} meses de extensión` : 'Nueva suscripción'
    });

    // 7. Notificación
    await db.collection('mail').add({
      to: userData.email,
      message: {
        subject: isUpgrade ? '¡Tu Upgrade ha sido exitoso!' : '¡Bienvenido a FastoriaAcademy! Tu cuenta de Mentor está activa',
        html: `
          <h1>¡Hola ${userData.displayName || 'Mentor'}!</h1>
          <p>Tu ${isUpgrade ? 'mejora al' : 'suscripción al'} plan <strong>${plan?.name}</strong> ha sido procesada.</p>
          ${isUpgrade ? `<p>Hemos sumado tus ${remainingMonths} meses restantes a la nueva vigencia. Tu nueva fecha de renovación es el ${nextBillingDate.toLocaleDateString()}.</p>` : ''}
          <p>Ya puedes acceder a todas las herramientas de tu nuevo nivel.</p>
          <br/>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background:#4f46e5; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Ir al Dashboard</a>
        `
      }
    });

    return { success: true, userId: userRef.id };

  } catch (error: any) {
    console.error('[Subscription Service Error]', error);
    throw error;
  }
}
