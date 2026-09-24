/**
 * Capa de datos — Repositorio de programas (`followups`).
 * Mismas escrituras que seguimientos/page.tsx (mismos campos).
 */
import type {
  MentoringProgram,
  MentoringProgramPatch,
  MentoringProgramRepository,
  NewMentoringProgram,
} from '@/domain/mentoring';

import { mapProgramDoc } from './mappers';
import type { DocSnapshotLike, FirestoreGateway } from './gateway';

const COLLECTION = 'followups';

function collectValid(docs: DocSnapshotLike[]): MentoringProgram[] {
  const out: MentoringProgram[] = [];
  for (const d of docs) {
    const raw = d.data();
    if (!raw) continue;
    try {
      out.push(mapProgramDoc(d.id, raw));
    } catch (e) {
      console.warn(`[program-repo] Documento corrupto omitido: ${d.id}`, e);
    }
  }
  return out;
}

export class FirestoreMentoringProgramRepository implements MentoringProgramRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findById(id: string): Promise<MentoringProgram | null> {
    const snap = await this.gateway.getDoc(COLLECTION, id);
    if (!snap) return null;
    const raw = snap.data();
    if (!raw) return null;
    return mapProgramDoc(snap.id, raw);
  }

  async listByMentor(mentorId: string, limit?: number): Promise<MentoringProgram[]> {
    const snap = await this.gateway.queryByField(COLLECTION, 'mentorId', mentorId, limit);
    return collectValid(snap.docs);
  }

  async listAll(limit?: number): Promise<MentoringProgram[]> {
    const snap = await this.gateway.listDocs(COLLECTION, limit);
    return collectValid(snap.docs);
  }

  async create(program: NewMentoringProgram): Promise<void> {
    await this.gateway.createDoc(COLLECTION, program.id, {
      ...program,
      createdAt: this.gateway.serverTimestamp(),
      updatedAt: this.gateway.serverTimestamp(),
    });
  }

  async update(id: string, patch: MentoringProgramPatch): Promise<void> {
    await this.gateway.updateDoc(COLLECTION, id, {
      ...patch,
      updatedAt: this.gateway.serverTimestamp(),
    });
  }

  async remove(id: string): Promise<void> {
    await this.gateway.deleteDoc(COLLECTION, id);
  }
}
