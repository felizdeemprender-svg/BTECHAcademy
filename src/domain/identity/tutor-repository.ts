/**
 * Kernel identidad — Contrato de lectura pública de tutores (F1.3).
 * Solo las operaciones que los routes legacy realmente hacen:
 * - `api/tutors/[username]/status`: `users` username== (limit 1) + doc
 *   `landingStyles` por styleId.
 * - `api/tutors/by-id/[id]`: `users` doc directo.
 * - `api/tutors/featured`: `users` con subscription.isPublic==true +
 *   subscription.status in [active,ACTIVE] + limit.
 * Los documentos viajan CRUDOS (igual que el legacy, que tolera campos
 * faltantes con defaults en la presentación): sin parse estricto.
 * Dominio puro: sin firebase, sin next.
 */

export interface TutorSnapshot {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

export interface LandingStyleSnapshot {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

export interface TutorRepository {
  /** `users` con username== (limit 1). `null` si no existe. */
  findTutorByUsername(username: string): Promise<TutorSnapshot | null>;
  /** `users` doc(id) directo. `null` si no existe. */
  findTutorById(id: string): Promise<TutorSnapshot | null>;
  /** `users` con subscription.isPublic==true + status in [active,ACTIVE]. */
  listFeaturedTutors(limit?: number): Promise<TutorSnapshot[]>;
  /** `landingStyles` doc(styleId) directo. `null` si no existe. */
  findLandingStyleById(styleId: string): Promise<LandingStyleSnapshot | null>;
}
