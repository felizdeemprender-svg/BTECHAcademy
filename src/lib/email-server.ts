import { getAdminFirestore } from '@/firebase/admin';

/**
 * Encola un correo de felicitación por inscripción en la colección 'mail' (para Firebase Trigger Email).
 * Versión segura para ejecutar en el SERVIDOR (Firebase Admin SDK).
 */
export async function sendWelcomeEmailServer(
  studentEmail: string,
  studentName: string,
  courseTitle: string
) {
  try {
    const db = getAdminFirestore();
    const normalizedEmail = studentEmail.toLowerCase().trim();
    if (!normalizedEmail) {
      console.warn('[WelcomeEmailServer] Email del estudiante está vacío.');
      return;
    }

    await db.collection('mail').add({
      to: normalizedEmail,
      message: {
        subject: `¡Felicidades por tu ingreso a ${courseTitle}! 🚀`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #6366f1; margin: 0; font-size: 26px;">¡Bienvenido/a a BTECH Academy!</h1>
            </div>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Hola <strong>${studentName}</strong>,
            </p>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              ¡Felicidades! Has sido inscrito/a exitosamente en el curso:
            </p>
            <div style="background-color: #f3f4f6; border-left: 4px solid #6366f1; padding: 12px 20px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">${courseTitle}</p>
            </div>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Ya tienes el acceso habilitado. Para comenzar, simplemente inicia sesión en la plataforma con tu correo <strong>${normalizedEmail}</strong>.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://btechacademy.ai/auth/login" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4);">
                Acceder a mis cursos
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 24px;">
              Si tienes alguna duda o necesitas ayuda para ingresar, por favor ponte en contacto con nosotros respondiendo a este correo.
            </p>
            <p style="font-size: 14px; color: #9ca3af; margin-top: 8px; text-align: center;">
              © ${new Date().getFullYear()} BTECH Academy. Todos los derechos reservados.
            </p>
          </div>
        `
      }
    });
    console.log(`[WelcomeEmailServer] Correo encolado exitosamente en servidor para: ${normalizedEmail}`);
  } catch (error) {
    console.error('Error al encolar el correo de bienvenida (servidor):', error);
  }
}

interface TransferEmailParams {
  studentEmail: string;
  studentName: string;
  mentorEmail: string;
  mentorName: string;
  courseTitle: string;
  amount: number;
  bankDetails: {
    alias: string;
    cbu: string;
    bankName: string;
    titularName: string;
  };
  referenceCode: string;
}

/**
 * Envía dos correos al iniciar un pago por transferencia:
 * 1. Al alumno con los datos bancarios y el código de referencia.
 * 2. Al tutor avisando que hay una transferencia pendiente de aprobación.
 */
export async function sendTransferNotificationEmails(params: TransferEmailParams) {
  const db = getAdminFirestore();
  const {
    studentEmail, studentName, mentorEmail, mentorName,
    courseTitle, amount, bankDetails, referenceCode
  } = params;

  const formattedAmount = amount.toLocaleString('es-AR');
  const platformUrl = 'https://btechacademy.ai';

  // === EMAIL AL ALUMNO ===
  await db.collection('mail').add({
    to: studentEmail,
    message: {
      subject: `Instrucciones de pago para "${courseTitle}" 💸`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 24px;">¡Ya casi terminás!</h1>
            <p style="color: #6b7280; margin-top: 8px;">Solo falta realizar la transferencia para activar tu acceso.</p>
          </div>

          <p style="font-size: 15px; color: #374151;">Hola <strong>${studentName}</strong>,</p>
          <p style="font-size: 15px; color: #374151; line-height: 1.6;">
            Gracias por tu interés en <strong>${courseTitle}</strong>. A continuación encontrás los datos para realizar la transferencia:
          </p>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #15803d; margin: 0 0 16px 0; font-size: 16px;">🏦 Datos Bancarios</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Titular:</td><td style="padding: 6px 0; font-weight: bold; color: #111827;">${bankDetails.titularName || '–'}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Banco:</td><td style="padding: 6px 0; font-weight: bold; color: #111827;">${bankDetails.bankName || '–'}</td></tr>
              ${bankDetails.alias ? `<tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Alias:</td><td style="padding: 6px 0; font-weight: bold; color: #111827; font-size: 18px; letter-spacing: 1px;">${bankDetails.alias}</td></tr>` : ''}
              ${bankDetails.cbu ? `<tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">CBU/CVU:</td><td style="padding: 6px 0; font-weight: bold; color: #111827; font-family: monospace;">${bankDetails.cbu}</td></tr>` : ''}
              <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Monto:</td><td style="padding: 6px 0; font-weight: bold; color: #6366f1; font-size: 20px;">$${formattedAmount}</td></tr>
            </table>
          </div>

          <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: center;">
            <p style="margin: 0 0 8px 0; color: #92400e; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">📋 Tu Código de Referencia</p>
            <p style="margin: 0; color: #92400e; font-size: 24px; font-weight: 900; font-family: monospace; letter-spacing: 2px;">${referenceCode}</p>
            <p style="margin: 8px 0 0 0; color: #b45309; font-size: 12px;">Incluí este código en el concepto de la transferencia.</p>
          </div>

          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            Una vez que tu tutor confirme el pago, recibirás un correo de bienvenida con acceso a la plataforma. Esto suele demorar <strong>menos de 24 horas hábiles</strong>.
          </p>

          <p style="font-size: 14px; color: #9ca3af; margin-top: 24px; text-align: center;">
            © ${new Date().getFullYear()} BTECH Academy. Todos los derechos reservados.
          </p>
        </div>
      `
    }
  });

  // === EMAIL AL TUTOR ===
  if (mentorEmail) {
    await db.collection('mail').add({
      to: mentorEmail,
      message: {
        subject: `💰 Nueva transferencia pendiente de ${studentName} – ${courseTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #6366f1; margin: 0; font-size: 22px;">Tenés una transferencia pendiente</h1>
            </div>

            <p style="font-size: 15px; color: #374151;">Hola <strong>${mentorName}</strong>,</p>
            <p style="font-size: 15px; color: #374151; line-height: 1.6;">
              <strong>${studentName}</strong> (<a href="mailto:${studentEmail}">${studentEmail}</a>) declaró haber realizado una transferencia para inscribirse en <strong>${courseTitle}</strong>.
            </p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Alumno:</td><td style="padding: 6px 0; font-weight: bold; color: #111827;">${studentName}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Email:</td><td style="padding: 6px 0; font-weight: bold; color: #111827;">${studentEmail}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Curso:</td><td style="padding: 6px 0; font-weight: bold; color: #111827;">${courseTitle}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Monto declarado:</td><td style="padding: 6px 0; font-weight: bold; color: #6366f1;">$${formattedAmount}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Código de referencia:</td><td style="padding: 6px 0; font-weight: bold; color: #92400e; font-family: monospace;">${referenceCode}</td></tr>
              </table>
            </div>

            <p style="font-size: 14px; color: #374151; line-height: 1.6;">
              Por favor, verificá en tu cuenta bancaria que el pago fue acreditado con el código de referencia y luego aprobá la inscripción desde tu panel:
            </p>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${platformUrl}/dashboard/transfers" style="background-color: #6366f1; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
                Ver Transferencias Pendientes
              </a>
            </div>

            <p style="font-size: 13px; color: #9ca3af; margin-top: 24px; text-align: center;">
              © ${new Date().getFullYear()} BTECH Academy.
            </p>
          </div>
        `
      }
    });
  }

  console.log(`[TransferEmails] Correos encolados para orden ${referenceCode}.`);
}

// ─────────────────────────────────────────────────────────────────
// CORREOS DE SUSCRIPCIÓN
// ─────────────────────────────────────────────────────────────────

/** Aviso de que el período de prueba está por terminar */
export async function sendTrialEndingEmail(
  tutorEmail: string,
  tutorName: string,
  daysLeft: number,
  planName: string
) {
  const db = getAdminFirestore();
  await db.collection('mail').add({
    to: tutorEmail,
    message: {
      subject: `⏰ Tu período de prueba de BTECH termina en ${daysLeft} días`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; border-radius: 8px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⏰ Tu trial está por vencer</h1>
          </div>
          <p style="font-size: 16px; color: #374151;">Hola <strong>${tutorName}</strong>,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Tu período de prueba gratuita del <strong>Plan ${planName}</strong> vence en <strong>${daysLeft} días</strong>.
          </p>
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 15px; color: #92400e;">
              A partir de esa fecha, comenzaremos a cobrar tu suscripción mensual de forma automática utilizando el medio de pago registrado en tu cuenta.
            </p>
          </div>
          <p style="font-size: 14px; color: #374151;">Si deseas actualizar tu medio de pago o cambiar de plan, podés hacerlo en cualquier momento desde tu panel.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://btechacademy.ai/dashboard/plan" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Ver mi plan
            </a>
          </div>
          <p style="font-size: 14px; color: #9ca3af; margin-top: 8px; text-align: center;">© ${new Date().getFullYear()} BTECH Academy. Todos los derechos reservados.</p>
        </div>
      `
    }
  });
  console.log(`[TrialEndingEmail] Encolado para: ${tutorEmail}`);
}

/** Notificación de que la suscripción fue activada exitosamente */
export async function sendSubscriptionActivatedEmail(
  tutorEmail: string,
  tutorName: string,
  planName: string,
  nextBillingDate: string
) {
  const db = getAdminFirestore();
  await db.collection('mail').add({
    to: tutorEmail,
    message: {
      subject: `✅ Tu suscripción BTECH ${planName} está activa`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px; background: linear-gradient(135deg, #10b981, #059669); padding: 32px; border-radius: 8px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ ¡Suscripción Activa!</h1>
          </div>
          <p style="font-size: 16px; color: #374151;">Hola <strong>${tutorName}</strong>,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Tu suscripción al <strong>Plan ${planName}</strong> ha sido procesada correctamente.
          </p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #15803d; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Próximo Cobro</p>
            <p style="margin: 0; font-size: 22px; font-weight: 900; color: #15803d;">${nextBillingDate}</p>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://btechacademy.ai/dashboard" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Ir a mi panel
            </a>
          </div>
          <p style="font-size: 14px; color: #9ca3af; margin-top: 8px; text-align: center;">© ${new Date().getFullYear()} BTECH Academy.</p>
        </div>
      `
    }
  });
  console.log(`[SubscriptionActivatedEmail] Encolado para: ${tutorEmail}`);
}

/** Notificación de cobro fallido con período de gracia */
export async function sendPaymentFailedEmail(
  tutorEmail: string,
  tutorName: string,
  gracePeriodEndsAt: string
) {
  const db = getAdminFirestore();
  await db.collection('mail').add({
    to: tutorEmail,
    message: {
      subject: `⚠️ No pudimos procesar tu pago de BTECH`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px; background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px; border-radius: 8px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ Problema con tu pago</h1>
          </div>
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
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://btechacademy.ai/dashboard/payment-methods" style="background-color: #f59e0b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Actualizar Medio de Pago
            </a>
          </div>
          <p style="font-size: 14px; color: #9ca3af; margin-top: 8px; text-align: center;">© ${new Date().getFullYear()} BTECH Academy.</p>
        </div>
      `
    }
  });
  console.log(`[PaymentFailedEmail] Encolado para: ${tutorEmail}`);
}

/** Notificación de suspensión de cuenta */
export async function sendAccountSuspendedEmail(
  tutorEmail: string,
  tutorName: string
) {
  const db = getAdminFirestore();
  await db.collection('mail').add({
    to: tutorEmail,
    message: {
      subject: `🔴 Tu cuenta de BTECH ha sido suspendida`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px; background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px; border-radius: 8px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔴 Cuenta Suspendida</h1>
          </div>
          <p style="font-size: 16px; color: #374151;">Hola <strong>${tutorName}</strong>,</p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Lamentablemente, tu cuenta en BTECH Academy ha sido <strong>suspendida temporalmente</strong> debido a que no fue posible procesar el pago de tu suscripción dentro del período de gracia.
          </p>
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
              Tus páginas de venta han sido pausadas y tus alumnos no podrán inscribirse a nuevos cursos hasta que regularices tu suscripción.
            </p>
          </div>
          <p style="font-size: 14px; color: #374151;">Para reactivar tu cuenta, actualizá tu medio de pago y el sistema procesará el pago pendiente automáticamente.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://btechacademy.ai/dashboard/payment-methods" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Reactivar mi Cuenta
            </a>
          </div>
          <p style="font-size: 14px; color: #9ca3af; margin-top: 8px; text-align: center;">© ${new Date().getFullYear()} BTECH Academy. Todos los derechos reservados.</p>
        </div>
      `
    }
  });
  console.log(`[AccountSuspendedEmail] Encolado para: ${tutorEmail}`);
}
