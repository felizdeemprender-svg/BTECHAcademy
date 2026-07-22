import { baseLayout, ctaButton, enqueueEmail, PLATFORM_URL, BRAND_COLOR, ADMIN_SENDER_NAME, SUPPORT_EMAIL } from './core';

export interface TransferMentorEmailParams {
  mentorEmail: string;
  mentorName: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  amount: number;
  referenceCode: string;
}

export async function sendTransferMentorEmail(params: TransferMentorEmailParams): Promise<void> {
  const { mentorEmail, mentorName, studentName, studentEmail, courseTitle, amount, referenceCode } = params;
  
  if (!mentorEmail) return;

  const formattedAmount = amount.toLocaleString('es-AR');
  const subject = `💰 Nueva transferencia pendiente de ${studentName} – ${courseTitle}`;

  const header = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: ${BRAND_COLOR}; margin: 0; font-size: 22px;">Tenés una transferencia pendiente</h1>
    </div>
  `;

  const body = `
    <p style="font-size: 15px; color: #374151;">Hola <strong>${mentorName}</strong>,</p>
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">
      <strong>${studentName}</strong> (<a href="mailto:${studentEmail}">${studentEmail}</a>) declaró haber realizado una transferencia para inscribirse en <strong>${courseTitle}</strong>.
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Alumno:</td><td style="padding: 6px 0; font-weight: bold; color: #111827;">${studentName}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Email:</td><td style="padding: 6px 0; font-weight: bold; color: #111827;">${studentEmail}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Curso:</td><td style="padding: 6px 0; font-weight: bold; color: #111827;">${courseTitle}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Monto declarado:</td><td style="padding: 6px 0; font-weight: bold; color: ${BRAND_COLOR};">$${formattedAmount}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Código de referencia:</td><td style="padding: 6px 0; font-weight: bold; color: #92400e; font-family: monospace;">${referenceCode}</td></tr>
      </table>
    </div>
    <p style="font-size: 14px; color: #374151; line-height: 1.6;">
      Por favor, verificá en tu cuenta bancaria que el pago fue acreditado con el código de referencia y luego aprobá la inscripción desde tu panel:
    </p>
    ${ctaButton('Ver Transferencias Pendientes', `${PLATFORM_URL}/dashboard/transfers`)}
  `;

  const html = baseLayout(header, body, ADMIN_SENDER_NAME);

  await enqueueEmail({
    to: mentorEmail,
    subject,
    html,
    fromName: ADMIN_SENDER_NAME,
    replyTo: SUPPORT_EMAIL
  });
}
