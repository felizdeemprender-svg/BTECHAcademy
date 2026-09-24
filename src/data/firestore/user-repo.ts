/**
 * Capa de datos — Repositorio de lectura de usuarios (`users`).
 * Mismos accesos que el código actual: documento directo por id
 * (`users` doc(id), igual que `api/tutors/by-id/[id]`) y
 * `username ==` con límite 1 (igual que `api/tutors/[username]/status`).
 */
import type { User, UserRepository } from '@/domain/identity';

import { mapUserDoc } from './mappers';
import type { FirestoreGateway } from './gateway';

const COLLECTION = 'users';

export class FirestoreUserRepository implements UserRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findById(uid: string): Promise<User | null> {
    const snap = await this.gateway.getDoc(COLLECTION, uid);
    if (!snap) return null;
    const raw = snap.data();
    if (!raw) return null;
    return mapUserDoc(snap.id, raw);
  }

  async findByUsername(username: string): Promise<User | null> {
    const snap = await this.gateway.queryByField(COLLECTION, 'username', username, 1);
    const first = snap.docs[0];
    if (!first) return null;
    const raw = first.data();
    if (!raw) return null;
    return mapUserDoc(first.id, raw);
  }
}
