import { collection, addDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';

/**
 * Encola un correo de felicitación por inscripción en la colección 'mail' (para Firebase Trigger Email).
 * Versión segura para ejecutar desde el CLIENTE (Frontend Web SDK).
 */
export async function sendWelcomeEmailClient(
  db: Firestore,
  studentEmail: string,
  studentName: string,
  courseTitle: string
) {
  try {
    const normalizedEmail = studentEmail.toLowerCase().trim();
    if (!normalizedEmail) {
      console.warn('[WelcomeEmailClient] Email del estudiante está vacío.');
      return;
    }

    await addDoc(collection(db, 'mail'), {
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
    console.log(`[WelcomeEmailClient] Correo encolado exitosamente para: ${normalizedEmail}`);
  } catch (error) {
    console.error('Error al encolar el correo de bienvenida (cliente):', error);
  }
}
