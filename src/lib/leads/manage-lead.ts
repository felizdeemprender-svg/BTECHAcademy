/**
 * Lógica de gestión de Leads para el Sistema de Referidos.
 *
 * Esta función implementa la regla de atribución única (anti-colisión):
 * El primer referido que captó al alumno para un curso determinado
 * mantiene la atribución permanentemente. Los intentos posteriores
 * de atribución a otros referidos son ignorados silenciosamente.
 */

import { Lead } from '@/types/referido';

/**
 * Crea un lead nuevo en la colección `leads` de Firestore (cliente-lado).
 * Si ya existe un lead para el mismo email+courseId, retorna el existente
 * sin modificarlo (control anti-colisión).
 *
 * @param db         - Instancia de Firestore (cliente)
 * @param landingId  - ID del documento `salesPages`
 * @param courseId   - ID del curso asociado a la landing
 * @param referidoId - ID del referido (de sessionStorage), o null
 * @param studentEmail - Email del alumno (se normaliza a minúsculas)
 * @param studentName  - Nombre completo del alumno
 * @returns El lead creado o el existente (con `wasExisting: true`)
 */
export async function createOrFindLead(
  db: any, // Mantenemos la firma por retrocompatibilidad, pero no se usará
  landingId: string,
  courseId: string,
  referidoId: string | null,
  studentEmail: string,
  studentName: string
): Promise<{ lead: Lead; wasExisting: boolean }> {
  
  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: studentEmail,
        name: studentName,
        mentorId: referidoId,
        courseId,
        landingId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      lead: data.lead,
      wasExisting: data.wasExisting
    };
  } catch (error) {
    console.error('[Leads] Error calling /api/leads', error);
    throw error;
  }
}

/**
 * Clave de sessionStorage para persistir el ID del referido durante la sesión.
 */
export const REFERIDO_SESSION_KEY = 'btech_referido_id';

/**
 * Clave de sessionStorage para persistir el ID de la landing durante la sesión.
 */
export const LANDING_SESSION_KEY = 'btech_landing_id';
