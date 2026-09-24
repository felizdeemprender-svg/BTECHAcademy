/**
 * API — Autenticación del llamante (misma convención que las rutas existentes:
 * `Authorization: Bearer <Firebase ID token>`).
 */
import { getAdminAuth } from '@/firebase/admin';

export interface Caller {
  readonly uid: string;
  readonly isAdmin: boolean;
}

/** Verifica el ID token. `null` = no autenticado (la ruta responde 401). */
export async function authenticateCaller(req: Request): Promise<Caller | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.split('Bearer ')[1];
    if (!token) return null;
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { uid: decoded.uid, isAdmin: decoded.admin === true };
  } catch {
    return null;
  }
}

/** El llamante ve datos de un mentor si es él mismo o admin. */
export function canAccessMentorData(caller: Caller, mentorId: string): boolean {
  return caller.isAdmin || caller.uid === mentorId;
}
