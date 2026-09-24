/**
 * Capa de datos — Repositorio de tareas (`followups/{id}/tasks`).
 * Solo lectura en esta fase (conteo para borrado + listado futuro).
 */
import type {
  MentoringTask,
  NewTask,
  TaskPatch,
  TaskRepository,
} from '@/domain/mentoring';

import { mapTaskDoc } from './mappers';
import type { FirestoreGateway } from './gateway';

const PARENT = 'followups';
const SUB = 'tasks';

export class FirestoreTaskRepository implements TaskRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async listByProgram(programId: string): Promise<MentoringTask[]> {
    const snap = await this.gateway.listSubDocs(PARENT, programId, SUB);
    const out: MentoringTask[] = [];
    for (const d of snap.docs) {
      const raw = d.data();
      if (!raw) continue;
      try {
        out.push(mapTaskDoc(d.id, programId, raw));
      } catch (e) {
        console.warn(`[task-repo] Documento corrupto omitido: ${d.id}`, e);
      }
    }
    return out;
  }

  async countByProgram(programId: string): Promise<number> {
    return this.gateway.countSubDocs(PARENT, programId, SUB);
  }

  async remove(programId: string, taskId: string): Promise<void> {
    await this.gateway.deleteSubDoc(PARENT, programId, SUB, taskId);
  }

  async create(programId: string, task: NewTask & { id: string }): Promise<void> {
    await this.gateway.createSubDoc(PARENT, programId, SUB, task.id, {
      ...task,
      status: 'pending',
      progress: 0,
      createdAt: this.gateway.serverTimestamp(),
    });
  }

  async update(programId: string, taskId: string, patch: TaskPatch): Promise<void> {
    await this.gateway.updateSubDoc(PARENT, programId, SUB, taskId, {
      ...patch,
      updatedAt: this.gateway.serverTimestamp(),
    });
  }
}
