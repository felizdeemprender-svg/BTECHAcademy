import { baseLayout, ctaButton, enqueueEmail, PLATFORM_URL, BRAND_COLOR, BRAND_NAME } from './core';

export interface WelcomeEmailParams {
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  mentorName?: string;
  mentorEmail?: string;
}

export async function sendWelcomeEmailServer(params: WelcomeEmailParams): Promise<void> {
  const { studentName, studentEmail, courseTitle, mentorName, mentorEmail } = params;
  
  const normalizedEmail = studentEmail.toLowerCase().trim();
  if (!normalizedEmail) {
    console.warn('[WelcomeEmail] Email del estudiante está vacío.');
    return;
  }

  const subject = `¡Felicidades por tu ingreso a ${courseTitle}! 🚀`;
  const signature = mentorName || BRAND_NAME;

  const header = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: ${BRAND_COLOR}; margin: 0; font-size: 26px;">¡Bienvenido/a a ${BRAND_NAME}!</h1>
    </div>
  `;

  const body = `
    <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hola <strong>${studentName}</strong>,</p>
    <p style="font-size: 16px; color: #374151; line-height: 1.6;">¡Felicidades! Has sido inscrito/a exitosamente en el curso:</p>
    <div style="background-color: #f3f4f6; border-left: 4px solid ${BRAND_COLOR}; padding: 12px 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">${courseTitle}</p>
    </div>
    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
      Ya tenés el acceso habilitado. Para comenzar, iniciá sesión con tu correo <strong>${normalizedEmail}</strong>.
    </p>
    ${ctaButton('Acceder a mis cursos', `${PLATFORM_URL}/auth/login`)}
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 24px;">
      Si tenés alguna duda, respondé a este correo y te ayudamos.
    </p>
  `;

  const html = baseLayout(header, body, signature);

  await enqueueEmail({
    to: normalizedEmail,
    subject,
    html,
    fromName: signature,
    replyTo: mentorEmail
  });

  console.log(`[WelcomeEmail] Encolado para: ${normalizedEmail}`);
}
