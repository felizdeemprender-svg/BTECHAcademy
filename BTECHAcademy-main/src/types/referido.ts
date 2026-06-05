/**
 * Sistema de Leads y Referidos
 * 
 * Define los tipos para el sistema de captación de leads
 * asociados a influencers/referidos con vigencia controlada.
 */

/**
 * Estado del lead en el embudo de conversión.
 * - 'pending'  → El alumno dejó sus datos pero aún no pagó.
 * - 'converted' → El pago fue confirmado por el webhook de MercadoPago.
 */
export type LeadStatus = 'pending' | 'converted';

/**
 * Documento en la colección `leads` de Firestore.
 * Cada instancia representa un alumno que interactuó con una landing referida.
 */
export interface Lead {
  id: string;

  /** ID del documento en `salesPages` */
  landingId: string;

  /** ID del curso al que el lead quiere inscribirse */
  courseId: string;

  /**
   * ID del usuario con rol 'referido' (influencer).
   * Es null si el lead llegó de forma orgánica (sin link de referido).
   */
  referidoId: string | null;

  /** Nombre completo del alumno interesado */
  studentName: string;

  /** Email normalizado a minúsculas para comparaciones precisas */
  studentEmail: string;

  /** Estado en el embudo */
  status: LeadStatus;

  /** ID del pago de MercadoPago, se completa cuando el status pasa a 'converted' */
  paymentId?: string;

  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

/**
 * Campos adicionales que se agregan a un documento `salesPages`
 * cuando la landing es del tipo "referida" (con vigencia y asignación).
 */
export interface SalesPageReferidoFields {
  /** Fecha de inicio de la vigencia de la promoción */
  activeFrom?: any; // Firestore Timestamp o null

  /** Fecha de fin de la vigencia de la promoción */
  activeUntil?: any; // Firestore Timestamp o null

  /**
   * ID del usuario con rol 'referido' que "posee" esta landing.
   * Null si es una landing general sin referido asignado.
   */
  referidoId?: string | null;
}
