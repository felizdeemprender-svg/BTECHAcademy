/**
 * API — Resolución del gateway (misma convención que las rutas existentes:
 * Admin SDK si hay credenciales, si no fallback al SDK cliente).
 */
import { getAdminFirestore, hasAdminCredentials } from '@/firebase/admin';
import { getFirebaseServer } from '@/firebase/server';

import { AdminFirestoreGateway } from '@/data/firestore/admin-gateway';
import { FirebaseGateway, type FirestoreGateway } from '@/data/firestore/gateway';

export async function resolveGateway(): Promise<FirestoreGateway> {
  if (hasAdminCredentials()) {
    return new AdminFirestoreGateway(getAdminFirestore());
  }
  return new FirebaseGateway(getFirebaseServer().firestore);
}
