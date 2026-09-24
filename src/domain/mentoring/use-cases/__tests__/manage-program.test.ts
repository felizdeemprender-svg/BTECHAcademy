/**
 * Tests de escritura de programas con repos falsos en memoria.
 */
import { describe, expect, it } from 'vitest';

import { isErr, isOk } from '@/domain/shared/result';

import type { MentoringProgram } from '../../program';
import type {
  MentoringProgramPatch,
  MentoringProgramRepository,
  NewMentoringProgram,
} from '../../program-repository';
import type { NewSession, SessionRepository } from '../../session-repository';
import type { TaskRepository } from '../../task-repository';
import {
  createMentoringProgram,
  removeMentoringProgram,
  setProgramStatus,
  updateMentoringProgram,
} from '../manage-program';

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

class FakePrograms implements MentoringProgramRepository {
  created: NewMentoringProgram[] = [];
  updates: { id: string; patch: MentoringProgramPatch }[] = [];
  removed: string[] = [];
  constructor(private items: MentoringProgram[]) {}
  async findById(id: string): Promise<MentoringProgram | null> {
    return this.items.find((p) => p.id === id) ?? null;
  }
  async listByMentor(mentorId: string): Promise<MentoringProgram[]> {
    return this.items.filter((p) => p.mentorId === mentorId);
  }
  async listAll(): Promise<MentoringProgram[]> {
    return [...this.items];
  }
  async create(p: NewMentoringProgram): Promise<void> {
    this.created.push(p);
  }
  async update(id: string, patch: MentoringProgramPatch): Promise<void> {
    this.updates.push({ id, patch });
  }
  async remove(id: string): Promise<void> {
    this.removed.push(id);
  }
}

class FakeSessions implements SessionRepository {
  created: { programId: string; sessions: NewSession[] }[] = [];
  removed: string[] = [];
  constructor(private readonly existing: string[] = []) {}
  async listByProgram(): Promise<never[]> {
    return [];
  }
  async createMany(programId: string, sessions: NewSession[]): Promise<void> {
    this.created.push({ programId, sessions });
  }
  async createAdditional(): Promise<void> {}
  async update(): Promise<void> {}
  async removeAllByProgram(programId: string): Promise<number> {
    this.removed.push(programId);
    return this.existing.length;
  }
}

class FakeTasks implements TaskRepository {
  constructor(private readonly count: number = 0) {}
  async listByProgram(): Promise<never[]> {
    return [];
  }
  async countByProgram(): Promise<number> {
    return this.count;
  }
  async create(): Promise<void> {}
  async update(): Promise<void> {}
  async remove(): Promise<void> {}
}

describe('createMentoringProgram', () => {
  it('crea programa grupal sin alumno + N sesiones iniciales', async () => {
    const programs = new FakePrograms([]);
    const sessions = new FakeSessions();
    const result = await createMentoringProgram(programs, sessions, {
      id: 'f9',
      mentorId: 'm1',
      type: 'group',
      title: 'G',
      totalSessions: 3,
    });
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value).toEqual({ id: 'f9' });
    expect(programs.created[0]).toMatchObject({
      id: 'f9',
      type: 'group',
      studentId: '',
      status: 'active',
    });
    expect(sessions.created[0].sessions.map((s) => s.orderIndex)).toEqual([1, 2, 3]);
  });

  it('individual con invitación manual (studentId vacío) se permite', async () => {
    const programs = new FakePrograms([]);
    const result = await createMentoringProgram(programs, new FakeSessions(), {
      id: 'f10',
      mentorId: 'm1',
      type: 'individual',
      title: 'I',
      studentEmail: 'a@x.com',
    });
    expect(isOk(result)).toBe(true);
  });

  it('sin título → VALIDATION', async () => {
    const result = await createMentoringProgram(new FakePrograms([]), new FakeSessions(), {
      mentorId: 'm1',
      title: '',
    });
    if (isErr(result)) expect(result.error.code).toBe('VALIDATION');
  });
});

describe('updateMentoringProgram / setProgramStatus', () => {
  it('actualiza campos y omite masterFileUrl si no es grupal', async () => {
    const programs = new FakePrograms([program()]);
    const result = await updateMentoringProgram(programs, {
      id: 'f1',
      title: 'Nuevo',
      masterFileUrl: 'https://x',
    });
    expect(isOk(result)).toBe(true);
    expect(programs.updates[0].patch).toMatchObject({ title: 'Nuevo' });
    expect('masterFileUrl' in programs.updates[0].patch).toBe(false);
  });

  it('inexistente → NOT_FOUND', async () => {
    const result = await updateMentoringProgram(new FakePrograms([]), { id: 'x', title: 'T' });
    if (isErr(result)) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('setProgramStatus alterna a suspended', async () => {
    const programs = new FakePrograms([program()]);
    expect(isOk(await setProgramStatus(programs, { id: 'f1', status: 'suspended' }))).toBe(true);
    expect(programs.updates[0].patch).toEqual({ status: 'suspended' });
  });
});

describe('removeMentoringProgram', () => {
  it('borra sesiones y programa si no hay tareas', async () => {
    const programs = new FakePrograms([program()]);
    const sessions = new FakeSessions(['s1', 's2']);
    const result = await removeMentoringProgram(programs, sessions, new FakeTasks(0), 'f1');
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value).toEqual({ sessionsRemoved: 2 });
    expect(programs.removed).toEqual(['f1']);
  });

  it('bloquea si hay tareas (mismo mensaje que la página)', async () => {
    const programs = new FakePrograms([program()]);
    const result = await removeMentoringProgram(
      programs,
      new FakeSessions(),
      new FakeTasks(2),
      'f1',
    );
    if (isErr(result)) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.message).toBe('Existen tareas registradas');
    } else {
      throw new Error('se esperaba error');
    }
    expect(programs.removed).toHaveLength(0);
  });
});
