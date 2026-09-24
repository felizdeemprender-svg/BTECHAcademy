/**
 * Capa de datos — Repositorio de sesiones (`followups/{id}/sessions`).
 * Mismas escrituras que las páginas actuales (mismos campos).
 */
import type {
  MentoringSession,
  NewSession,
  SessionPatch,
  SessionRepository,
} from '@/domain/mentoring';

import { mapSessionDoc } from './mappers';
import type { FirestoreGateway } from './gateway';

const PARENT = 'followups';
const SUB = 'sessions';

export class FirestoreSessionRepository implements SessionRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async listByProgram(programId: string): Promise<MentoringSession[]> {
    const snap = await this.gateway.listSubDocs(PARENT, programId, SUB);
    const out: MentoringSession[] = [];
    for (const d of snap.docs) {
      const raw = d.data();
      if (!raw) continue;
      try {
        out.push(mapSessionDoc(d.id, raw));
      } catch (e) {
        console.warn(`[session-repo] Documento corrupto omitido: ${d.id}`, e);
      }
    }
    return out;
  }

  async createMany(programId: string, sessions: NewSession[]): Promise<void> {
    for (const s of sessions) {
      await this.gateway.createSubDoc(PARENT, programId, SUB, s.id, {
        id: s.id,
        followUpId: s.followUpId,
        orderIndex: s.orderIndex,
        isCompleted: false,
        status: 'pending',
        topics: [],
        minutes: '',
        updatedAt: this.gateway.serverTimestamp(),
      });
    }
  }

  async createAdditional(programId: string, session: NewSession): Promise<void> {
    await this.gateway.createSubDoc(PARENT, programId, SUB, session.id, {
      id: session.id,
      followUpId: session.followUpId,
      orderIndex: session.orderIndex,
      isAdditional: true,
      isCompleted: false,
      status: 'pending',
      topics: [],
      minutes: '',
      updatedAt: this.gateway.serverTimestamp(),
    });
  }

  async update(programId: string, sessionId: string, patch: SessionPatch): Promise<void> {
    await this.gateway.updateSubDoc(PARENT, programId, SUB, sessionId, {
      ...patch,
      updatedAt: this.gateway.serverTimestamp(),
    });
  }

  async removeAllByProgram(programId: string): Promise<number> {
    const snap = await this.gateway.listSubDocs(PARENT, programId, SUB);
    await Promise.all(
      snap.docs.map((d) => this.gateway.deleteSubDoc(PARENT, programId, SUB, d.id)),
    );
    return snap.docs.length;
  }
}
