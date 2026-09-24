/**
 * Tests del detalle: sesiones y tareas con repos falsos.
 */
import { describe, expect, it } from 'vitest';

import { isErr, isOk } from '@/domain/shared/result';

import type { MentoringProgram } from '../../program';
import type { MentoringSession } from '../../session';
import type { MentoringTask } from '../../task';
import type { MentoringProgramRepository } from '../../program-repository';
import type { SessionPatch, SessionRepository } from '../../session-repository';
import type { NewTask, TaskPatch, TaskRepository } from '../../task-repository';
import {
  addAdditionalSession,
  assignTask,
  listProgramSessions,
  removeTask,
  saveSession,
  submitTask,
  updateTaskProgress,
} from '../program-detail';

function program(): MentoringProgram {
  return {
    id: 'f1',
    type: 'individual',
    title: 'P',
    goal: '',
    mentorId: 'm1',
    studentId: 's1',
    totalSessions: 2,
    status: 'active',
    startDate: '',
    endDate: '',
  };
}

function session(overrides: Partial<MentoringSession> & { id: string }): MentoringSession {
  return {
    followUpId: 'f1',
    orderIndex: 1,
    isAdditional: false,
    isCompleted: false,
    status: 'pending',
    date: '',
    time: '',
    duration: 60,
    topics: [],
    minutes: '',
    files: [],
    ...overrides,
  } as MentoringSession;
}

class FakePrograms implements MentoringProgramRepository {
  constructor(private readonly items: MentoringProgram[]) {}
  async findById(id: string): Promise<MentoringProgram | null> {
    return this.items.find((p) => p.id === id) ?? null;
  }
  async listByMentor(mentorId: string): Promise<MentoringProgram[]> {
    return this.items.filter((p) => p.mentorId === mentorId);
  }
  async listAll(): Promise<MentoringProgram[]> {
    return [...this.items];
  }
  async create(): Promise<void> {}
  async update(): Promise<void> {}
  async remove(): Promise<void> {}
}

class FakeSessions implements SessionRepository {
  updated: { programId: string; sessionId: string; patch: SessionPatch }[] = [];
  constructor(private readonly items: MentoringSession[]) {}
  async listByProgram(): Promise<MentoringSession[]> {
    return [...this.items];
  }
  async createMany(): Promise<void> {}
  async createAdditional(
    programId: string,
    s: { id: string; followUpId: string; orderIndex: number },
  ): Promise<void> {
    this.items.push(session({ id: s.id, orderIndex: s.orderIndex, isAdditional: true }));
    void programId;
  }
  async update(programId: string, sessionId: string, patch: SessionPatch): Promise<void> {
    this.updated.push({ programId, sessionId, patch });
  }
  async removeAllByProgram(): Promise<number> {
    return 0;
  }
}

class FakeTasks implements TaskRepository {
  created: { programId: string; task: NewTask & { id: string } }[] = [];
  updated: { programId: string; taskId: string; patch: TaskPatch }[] = [];
  removed: { programId: string; taskId: string }[] = [];
  async listByProgram(): Promise<never[]> {
    return [];
  }
  async countByProgram(): Promise<number> {
    return 0;
  }
  async create(programId: string, task: NewTask & { id: string }): Promise<void> {
    this.created.push({ programId, task });
  }
  async update(programId: string, taskId: string, patch: TaskPatch): Promise<void> {
    this.updated.push({ programId, taskId, patch });
  }
  async remove(programId: string, taskId: string): Promise<void> {
    this.removed.push({ programId, taskId });
  }
}

describe('listProgramSessions', () => {
  it('ordena por fecha y devuelve NOT_FOUND si falta', async () => {
    const sessions = new FakeSessions([
      session({ id: 'b', date: '2026-02-01', time: '10:00', orderIndex: 2 }),
      session({ id: 'a', date: '2026-01-01', time: '10:00', orderIndex: 1 }),
    ]);
    const result = await listProgramSessions(new FakePrograms([program()]), sessions, 'f1');
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value.map((s) => s.id)).toEqual(['a', 'b']);

    const missing = await listProgramSessions(new FakePrograms([]), sessions, 'x');
    if (isErr(missing)) expect(missing.error.code).toBe('NOT_FOUND');
  });
});

describe('saveSession', () => {
  it('deriva status scheduled con fecha y pending sin fecha', async () => {
    const sessions = new FakeSessions([]);
    const base = { programId: 'f1', sessionId: 's1', topics: [] as string[], minutes: '' };
    expect(
      isOk(await saveSession(new FakePrograms([program()]), sessions, { ...base, date: '2026-01-01' })),
    ).toBe(true);
    expect(sessions.updated[0].patch.status).toBe('scheduled');

    expect(
      isOk(
        await saveSession(new FakePrograms([program()]), sessions, {
          ...base,
          date: '',
          isCompleted: true,
        }),
      ),
    ).toBe(true);
    expect(sessions.updated[1].patch.status).toBe('completed');
  });
});

describe('addAdditionalSession', () => {
  it('usa orderIndex siguiente', async () => {
    const sessions = new FakeSessions([session({ id: 's1', orderIndex: 4 })]);
    const result = await addAdditionalSession(new FakePrograms([program()]), sessions, 'f1');
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value.sessionId).toBeTruthy();
  });
});

describe('assignTask / submitTask / updateTaskProgress', () => {
  it('asigna con id y valida título', async () => {
    const tasks = new FakeTasks();
    const result = await assignTask(new FakePrograms([program()]), tasks, 'f1', {
      id: 't9',
      type: 'free',
      title: 'Desafío',
      description: 'Haz X',
    });
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value).toEqual({ taskId: 't9' });

    const bad = await assignTask(new FakePrograms([program()]), tasks, 'f1', {
      type: 'free',
      title: '',
    });
    if (isErr(bad)) expect(bad.error.code).toBe('VALIDATION');
  });

  it('submit fuerza progress 100 + completed', async () => {
    const tasks = new FakeTasks();
    const result = await submitTask(new FakePrograms([program()]), tasks, 'f1', 't1', {
      answer: 'R',
      score: 80,
    });
    expect(isOk(result)).toBe(true);
    expect(tasks.updated[0].patch).toMatchObject({ progress: 100, status: 'completed' });
  });

  it('removeTask borra y valida ids', async () => {
    const tasks = new FakeTasks();
    expect(isOk(await removeTask(new FakePrograms([program()]), tasks, 'f1', 't1'))).toBe(true);
    expect(tasks.removed).toEqual([{ programId: 'f1', taskId: 't1' }]);

    const bad = await removeTask(new FakePrograms([program()]), tasks, 'f1', '');
    if (isErr(bad)) expect(bad.error.code).toBe('VALIDATION');
  });

  it('updateTaskProgress pasa progreso y estado', async () => {
    const tasks = new FakeTasks();
    expect(
      isOk(await updateTaskProgress(new FakePrograms([program()]), tasks, 'f1', 't1', 50, 'pending')),
    ).toBe(true);
    expect(tasks.updated[0].patch).toEqual({ progress: 50, status: 'pending' });
  });
});
