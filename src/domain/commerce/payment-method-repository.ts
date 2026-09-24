/**
 * Comercio — Contrato de métodos de pago (F0.2).
 * Mismas colecciones y filtros que los routes legacy:
 * `systemPaymentMethods` (doc por id o `isActive ==`),
 * subcolección `users/{uid}/paymentMethods`
 * (`type ==` + `isActive ==`), `users` (perfil del mentor con
 * fallback legacy `profile.mercadopago`) y
 * `mp_seller_mappings` (doc por sellerId → mentorId).
 * Sin cambios de storage.
 */

export interface SystemPaymentMethodSnapshot {
  readonly id: string;
  readonly name?: unknown;
  readonly type?: unknown;
  readonly description?: unknown;
  readonly icon?: unknown;
  readonly isActive?: unknown;
  readonly config?: Record<string, unknown>;
}

export interface TutorPaymentMethodSnapshot {
  readonly id: string;
  /** F1.3 (aditivo): lo muestra `payment-options` en la respuesta. */
  readonly name?: unknown;
  readonly type?: unknown;
  readonly isActive?: unknown;
  readonly config?: Record<string, unknown>;
}

export interface MentorPaymentProfile {
  readonly uid: string;
  readonly email?: unknown;
  readonly displayName?: unknown;
  /** Fallback legacy: `users.profile.mercadopago` (p. ej. `{ accessToken }`). */
  readonly mercadopagoConfig?: Record<string, unknown>;
}

export interface PaymentMethodRepository {
  /** Lee `systemPaymentMethods` doc(id). `null` si no existe. */
  findSystemMethodById(id: string): Promise<SystemPaymentMethodSnapshot | null>;
  /** Primer `systemPaymentMethods` con `isActive == true` (fallback legacy). */
  findFirstActiveSystemMethod(): Promise<SystemPaymentMethodSnapshot | null>;
  /** Todos los `systemPaymentMethods` con `isActive == true` (route methods). */
  listActiveSystemMethods(): Promise<SystemPaymentMethodSnapshot[]>;
  /** `users/{mentorId}/paymentMethods` con `type ==` + `isActive ==`. */
  findTutorMethodByType(mentorId: string, type: string): Promise<TutorPaymentMethodSnapshot | null>;
  /**
   * F1.3 (aditivo) — `users/{mentorId}/paymentMethods` con `isActive == true`
   * (`api/tutors/[username]/payment-options` lista todos los activos).
   */
  listActiveTutorMethods(mentorId: string): Promise<TutorPaymentMethodSnapshot[]>;
  /** `users/{uid}/paymentMethods` con al menos uno `isActive == true`. */
  hasActiveTutorMethod(uid: string): Promise<boolean>;
  /** Lee `users` doc(uid) con email/displayName + mercadopago legacy. */
  getMentorProfile(uid: string): Promise<MentorPaymentProfile | null>;
  /** Lee `mp_seller_mappings` doc(sellerId) → mentorId. `null` si no existe. */
  findMentorIdBySellerId(sellerId: string): Promise<string | null>;
}
