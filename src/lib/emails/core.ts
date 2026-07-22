import { getAdminFirestore } from '@/firebase/admin';

export const PLATFORM_URL = 'https://fastoriaacademy.ai';
export const BRAND_COLOR = '#6366f1';
export const BRAND_NAME = 'Fastoria Academy';
export const ADMIN_SENDER_NAME = 'Equipo de Fastoria Academy';
export const SUPPORT_EMAIL = 'soporte@fastoriaacademy.ai';
export const NOREPLY_EMAIL = 'noreply@fastoriaacademy.ai';

export interface EnqueueEmailParams {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  replyTo?: string;
}

/**
 * Encola un documento en la colección 'mail' (Firebase Trigger Email).
 * Configura los campos "from" y "replyTo" para mayor personalización.
 * Solo se ejecuta en el servidor (Admin SDK).
 */
export async function enqueueEmail(params: EnqueueEmailParams): Promise<void> {
  const db = getAdminFirestore();
  const { to, subject, html, fromName = BRAND_NAME, replyTo } = params;
  
  const from = `${fromName} <${NOREPLY_EMAIL}>`;
  
  const mailData: any = {
    to,
    from,
    message: { subject, html }
  };
  
  if (replyTo) {
    mailData.replyTo = replyTo;
  }

  await db.collection('mail').add(mailData);
}

/** Layout base compartido: header de color + body wrapeado + firma dinámica */
export function baseLayout(headerHtml: string, bodyHtml: string, signatureName: string, footerNote?: string): string {
  const year = new Date().getFullYear();
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
      ${headerHtml}
      ${bodyHtml}
      <p style="font-size: 15px; color: #374151; margin-top: 24px; line-height: 1.6;">
        Saludos cordiales,<br/>
        <strong>${signatureName}</strong>
      </p>
      <p style="font-size: 14px; color: #9ca3af; margin-top: 24px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px;">
        ${footerNote ?? `© ${year} ${BRAND_NAME}. Todos los derechos reservados.`}
      </p>
    </div>
  `;
}

export function solidHeader(title: string, gradient: string): string {
  return `
    <div style="text-align: center; margin-bottom: 24px; background: ${gradient}; padding: 32px; border-radius: 8px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${title}</h1>
    </div>
  `;
}

export function ctaButton(label: string, href: string, color: string = BRAND_COLOR): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${href}"
         style="background-color: ${color}; color: #ffffff; padding: 14px 28px; text-decoration: none;
                border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;
                box-shadow: 0 4px 6px -1px rgba(99,102,241,0.4);">
        ${label}
      </a>
    </div>
  `;
}
