import { baseLayout, enqueueEmail, BRAND_COLOR, BRAND_NAME } from './core';

export interface TransferStudentEmailParams {
  studentEmail: string;
  studentName: string;
  courseTitle: string;
  amount: number;
  bankDetails: { alias: string; cbu: string; bankName: string; titularName: string };
  referenceCode: string;
  mentorName?: string;
  mentorEmail?: string;
}

export async function sendTransferStudentEmail(params: TransferStudentEmailParams): Promise<void> {
  const { studentEmail, studentName, courseTitle, amount, bankDetails, referenceCode, mentorName, mentorEmail } = params;
  
  const formattedAmount = amount.toLocaleString('es-AR');
  const signature = mentorName || BRAND_NAME;
  const subject = `Instrucciones de pago para "${courseTitle}" 💸`;

  const header = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: ${BRAND_COLOR}; margin: 0; font-size: 24px;">¡Ya casi terminás!</h1>
      <p style="color: #6b7280; margin-top: 8px;">Solo falta realizar la transferencia para activar tu acceso.</p>
    </div>
  `;

  const body = `
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
        <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Monto:</td><td style="padding: 6px 0; font-weight: bold; color: ${BRAND_COLOR}; font-size: 20px;">$${formattedAmount}</td></tr>
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
  `;

  const html = baseLayout(header, body, signature);

  await enqueueEmail({
    to: studentEmail,
    subject,
    html,
    fromName: signature,
    replyTo: mentorEmail
  });
}
