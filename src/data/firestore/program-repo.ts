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
  constructor(private readonly gateway: FirestoreGateway) { }

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

  /**
   * Programas asignados a un alumno:
   * 1) Individuales con `studentId == uid` o `studentEmail == email`
   * 2) Grupales/individuales vinculados por `enrollments` (`studentId` o `inviteEmail`).
   */
  async listByStudent(studentId: string, studentEmail?: string): Promise<MentoringProgram[]> {
    const normalizedEmail = (studentEmail ?? '').toLowerCase().trim();
    const byId = new Map<string, MentoringProgram>();

    const [byUidSnap, byEmailSnap, enrollByUidSnap, enrollByEmailSnap] = await Promise.all([
      studentId ? this.gateway.queryByField(COLLECTION, 'studentId', studentId) : Promise.resolve({ docs: [] }),
      normalizedEmail ? this.gateway.queryByField(COLLECTION, 'studentEmail', normalizedEmail) : Promise.resolve({ docs: [] }),
      studentId ? this.gateway.queryByField('enrollments', 'studentId', studentId) : Promise.resolve({ docs: [] }),
      normalizedEmail ? this.gateway.queryByField('enrollments', 'inviteEmail', normalizedEmail) : Promise.resolve({ docs: [] }),
    ]);

    for (const prog of collectValid([...byUidSnap.docs, ...byEmailSnap.docs])) {
      byId.set(prog.id, prog);
    }

    const candidateProgramIds = new Set<string>();
    for (const d of [...enrollByUidSnap.docs, ...enrollByEmailSnap.docs]) {
      const raw = d.data();
      if (!raw) continue;
      if (raw.status === 'suspended') continue;
      const productType = typeof raw.productType === 'string' ? raw.productType : '';
      if (productType && productType !== 'followup' && productType !== 'mentoria_individual') {
        continue;
      }
      for (const candidate of [raw.courseId, raw.productId]) {
        if (typeof candidate === 'string' && candidate.trim() && !byId.has(candidate)) {
          candidateProgramIds.add(candidate.trim());
        }
      }
    }

    if (candidateProgramIds.size > 0) {
      const resolved = await Promise.all(
        Array.from(candidateProgramIds).map(async (id) => {
          try {
            return await this.findById(id);
          } catch {
            return null;
          }
        })
      );
      for (const prog of resolved) {
        if (prog) byId.set(prog.id, prog);
      }
    }

    return Array.from(byId.values());
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
