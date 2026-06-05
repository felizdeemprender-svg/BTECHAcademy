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
  db: any,
  landingId: string,
  courseId: string,
  referidoId: string | null,
  studentEmail: string,
  studentName: string
): Promise<{ lead: Lead; wasExisting: boolean }> {
  const { collection, query, where, getDocs, limit, doc, setDoc, serverTimestamp } = await import('firebase/firestore');

  const normalizedEmail = studentEmail.toLowerCase().trim();

  // 1. Buscar si ya existe un lead para este email + curso
  const leadsRef = collection(db, 'leads');
  const existingQuery = query(
    leadsRef,
    where('studentEmail', '==', normalizedEmail),
    where('courseId', '==', courseId),
    limit(1)
  );

  const existingSnap = await getDocs(existingQuery);

  if (!existingSnap.empty) {
    // Ya existe un lead → respetar atribución original (anti-colisión)
    const existingLead = { id: existingSnap.docs[0].id, ...existingSnap.docs[0].data() } as Lead;
    console.log(`[Leads] Lead existente encontrado para ${normalizedEmail} / Curso: ${courseId}. Referido original: ${existingLead.referidoId}`);
    return { lead: existingLead, wasExisting: true };
  }

  // 2. No existe → crear nuevo lead
  const leadId = `lead_${courseId}_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
  const leadRef = doc(db, 'leads', leadId);

  const newLead: Omit<Lead, 'id'> = {
    landingId,
    courseId,
    referidoId: referidoId || null,
    studentName,
    studentEmail: normalizedEmail,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(leadRef, newLead);

  console.log(`[Leads] Nuevo lead creado: ${leadId} | Referido: ${referidoId || 'orgánico'}`);
  return { lead: { id: leadId, ...newLead } as Lead, wasExisting: false };
}

/**
 * Clave de sessionStorage para persistir el ID del referido durante la sesión.
 */
export const REFERIDO_SESSION_KEY = 'btech_referido_id';

/**
 * Clave de sessionStorage para persistir el ID de la landing durante la sesión.
 */
export const LANDING_SESSION_KEY = 'btech_landing_id';
