import { baseLayout, solidHeader, ctaButton, enqueueEmail, PLATFORM_URL, ADMIN_SENDER_NAME, SUPPORT_EMAIL } from './core';

// ─────────────────────────────────────────────────────────────────
// TRIAL ENDING
// ─────────────────────────────────────────────────────────────────
export async function sendTrialEndingEmail(
  tutorEmail: string,
  tutorName: string,
  daysLeft: number,
  planName: string
): Promise<void> {
  const subject = `⏰ Tu período de prueba de Fastoria termina en ${daysLeft} días`;
  const header = solidHeader('⏰ Tu trial está por vencer', 'linear-gradient(135deg, #6366f1, #8b5cf6)');
  const body = `
    <p style="font-size: 16px; color: #374151;">Hola <strong>${tutorName}</strong>,</p>
    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
      Tu período de prueba gratuita del <strong>Plan ${planName}</strong> vence en <strong>${daysLeft} días</strong>.
    </p>
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 15px; color: #92400e;">
        A partir de esa fecha, comenzaremos a cobrar tu suscripción mensual de forma automática utilizando el medio de pago registrado en tu cuenta.
      </p>
    </div>
    <p style="font-size: 14px; color: #374151;">Si deseás actualizar tu medio de pago o cambiar de plan, podés hacerlo en cualquier momento desde tu panel.</p>
    ${ctaButton('Ver mi plan', `${PLATFORM_URL}/dashboard/plan`)}
  `;

  await enqueueEmail({
    to: tutorEmail,
    subject,
    html: baseLayout(header, body, ADMIN_SENDER_NAME),
    fromName: ADMIN_SENDER_NAME,
    replyTo: SUPPORT_EMAIL
  });
}

// ─────────────────────────────────────────────────────────────────
// ACTIVATED
// ─────────────────────────────────────────────────────────────────
export async function sendSubscriptionActivatedEmail(
  tutorEmail: string,
  tutorName: string,
  planName: string,
  nextBillingDate: string
): Promise<void> {
  const subject = `✅ Tu suscripción Fastoria ${planName} está activa`;
  const header = solidHeader('✅ ¡Suscripción Activa!', 'linear-gradient(135deg, #10b981, #059669)');
  const body = `
    <p style="font-size: 16px; color: #374151;">Hola <strong>${tutorName}</strong>,</p>
    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
      Tu suscripción al <strong>Plan ${planName}</strong> ha sido procesada correctamente.
    </p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #15803d; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Próximo Cobro</p>
      <p style="margin: 0; font-size: 22px; font-weight: 900; color: #15803d;">${nextBillingDate}</p>
    </div>
    ${ctaButton('Ir a mi panel', `${PLATFORM_URL}/dashboard`)}
  `;

  await enqueueEmail({
    to: tutorEmail,
    subject,
    html: baseLayout(header, body, ADMIN_SENDER_NAME),
    fromName: ADMIN_SENDER_NAME,
    replyTo: SUPPORT_EMAIL
  });
}

// ─────────────────────────────────────────────────────────────────
// UPGRADE / NEW (desde subscription.ts)
// ─────────────────────────────────────────────────────────────────
export async function sendSubscriptionUpgradeEmail(
  tutorEmail: string,
  tutorName: string,
  planName: string,
  remainingMonths: number,
  nextBillingDate: Date
): Promise<void> {
  const subject = `✅ ¡Tu upgrade al Plan ${planName} fue exitoso!`;
  const header = solidHeader('✅ ¡Upgrade Exitoso!', 'linear-gradient(135deg, #10b981, #059669)');
  const body = `
    <h1>¡Hola ${tutorName}!</h1>
    <p>Tu mejora al plan <strong>${planName}</strong> ha sido procesada.</p>
    ${remainingMonths > 0
      ? `<p>Hemos sumado tus <strong>${remainingMonths} meses restantes</strong> a la nueva vigencia. Tu nueva fecha de renovación es el <strong>${nextBillingDate.toLocaleDateString('es-AR')}</strong>.</p>`
      : ''}
    <p>Ya podés acceder a todas las herramientas de tu nuevo nivel.</p>
    ${ctaButton('Ir al Dashboard', `${PLATFORM_URL}/dashboard`)}
  `;

  await enqueueEmail({
    to: tutorEmail,
    subject,
    html: baseLayout(header, body, ADMIN_SENDER_NAME),
    fromName: ADMIN_SENDER_NAME,
    replyTo: SUPPORT_EMAIL
  });
}

export async function sendNewSubscriptionEmail(
  tutorEmail: string,
  tutorName: string,
  planName: string,
  nextBillingDate: Date
): Promise<void> {
  const subject = `✅ ¡Bienvenido! Tu cuenta de Mentor está activa — Plan ${planName}`;
  const header = solidHeader('🚀 ¡Cuenta de Mentor Activa!', 'linear-gradient(135deg, #6366f1, #8b5cf6)');
  const body = `
    <p style="font-size: 16px; color: #374151;">¡Hola <strong>${tutorName}</strong>!</p>
    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
      Tu suscripción al plan <strong>${planName}</strong> ha sido procesada. Ya podés acceder a todas las herramientas de tu nivel.
    </p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #15803d; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Próxima Renovación</p>
      <p style="margin: 0; font-size: 22px; font-weight: 900; color: #15803d;">${nextBillingDate.toLocaleDateString('es-AR')}</p>
    </div>
    ${ctaButton('Ir al Dashboard', `${PLATFORM_URL}/dashboard`)}
  `;

  await enqueueEmail({
    to: tutorEmail,
    subject,
    html: baseLayout(header, body, ADMIN_SENDER_NAME),
    fromName: ADMIN_SENDER_NAME,
    replyTo: SUPPORT_EMAIL
  });
}

// ─────────────────────────────────────────────────────────────────
// FAILED / SUSPENDED
// ─────────────────────────────────────────────────────────────────
export async function sendPaymentFailedEmail(
  tutorEmail: string,
  tutorName: string,
  gracePeriodEndsAt: string
): Promise<void> {
  const subject = `⚠️ No pudimos procesar tu pago de Fastoria`;
  const header = solidHeader('⚠️ Problema con tu pago', 'linear-gradient(135deg, #f59e0b, #d97706)');
  const body = `
    <p style="font-size: 16px; color: #374151;">Hola <strong>${tutorName}</strong>,</p>
    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
      Intentamos procesar el pago de tu suscripción pero no fue posible realizarlo con el medio de pago registrado.
    </p>
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400e; font-weight: bold;">¿Qué pasa ahora?</p>
      <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
        Reintentaremos el cobro automáticamente. Si el pago no se regulariza antes del <strong>${gracePeriodEndsAt}</strong>, tu cuenta será suspendida temporalmente.
      </p>
    </div>
    ${ctaButton('Actualizar Medio de Pago', `${PLATFORM_URL}/dashboard/payment-methods`, '#f59e0b')}
  `;

  await enqueueEmail({
    to: tutorEmail,
    subject,
    html: baseLayout(header, body, ADMIN_SENDER_NAME),
    fromName: ADMIN_SENDER_NAME,
    replyTo: SUPPORT_EMAIL
  });
}

export async function sendAccountSuspendedEmail(
  tutorEmail: string,
  tutorName: string
): Promise<void> {
  const subject = `🔴 Tu cuenta de Fastoria ha sido suspendida`;
  const header = solidHeader('🔴 Cuenta Suspendida', 'linear-gradient(135deg, #ef4444, #dc2626)');
  const body = `
    <p style="font-size: 16px; color: #374151;">Hola <strong>${tutorName}</strong>,</p>
    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
      Lamentablemente, tu cuenta ha sido <strong>suspendida temporalmente</strong> debido a que no fue posible procesar el pago de tu suscripción dentro del período de gracia.
    </p>
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
        Tus páginas de venta han sido pausadas y tus alumnos no podrán inscribirse a nuevos cursos hasta que regularices tu suscripción.
      </p>
    </div>
    <p style="font-size: 14px; color: #374151;">Para reactivar tu cuenta, actualizá tu medio de pago y el sistema procesará el pago pendiente automáticamente.</p>
    ${ctaButton('Reactivar mi Cuenta', `${PLATFORM_URL}/dashboard/payment-methods`, '#ef4444')}
  `;

  await enqueueEmail({
    to: tutorEmail,
    subject,
    html: baseLayout(header, body, ADMIN_SENDER_NAME),
    fromName: ADMIN_SENDER_NAME,
    replyTo: SUPPORT_EMAIL
  });
}
