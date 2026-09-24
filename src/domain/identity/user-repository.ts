/**
 * Kernel identidad — Contrato de lectura de usuarios.
 * Solo lectura en esta fase (F2.1 cimiento).
 * Mismos accesos que el código actual: documento directo
 * por id (`users` doc(id)) y `username ==` con límite 1.
 */
import type { User } from './user';

export interface UserRepository {
  findById(uid: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
}
