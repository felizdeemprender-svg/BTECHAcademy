'use server';

import { sendWelcomeEmailServer } from '@/lib/emails/welcome';

/**
 * Server Action: Envía el email de bienvenida por inscripción a un curso.
 * Invocada desde componentes cliente ('use client') que no tienen acceso al Admin SDK.
 * La escritura a Firestore ocurre en el servidor — nunca desde el browser.
 */
export async function sendWelcomeEmailAction(
  studentEmail: string,
  studentName: string,
  courseTitle: string,
  mentorName?: string,
  mentorEmail?: string
): Promise<void> {
  const normalizedEmail = studentEmail.toLowerCase().trim();
  if (!normalizedEmail) return;

  await sendWelcomeEmailServer({
    studentEmail: normalizedEmail,
    studentName,
    courseTitle,
    mentorName,
    mentorEmail
  });
}
