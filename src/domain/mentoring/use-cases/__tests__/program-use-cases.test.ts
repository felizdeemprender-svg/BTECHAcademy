/**
 * Tests del caso de uso de programas con repositorio falso.
 * Sin Firebase: el falso implementa MentoringProgramRepository.
 */
import { describe, expect, it } from 'vitest';

import { isErr, isOk } from '@/domain/shared/result';

import type { MentoringProgram } from '../../program';
import type { MentoringProgramRepository } from '../../program-repository';
import { getMentorPrograms, listAllPrograms } from '../get-mentor-programs';

function program(overrides: Partial<MentoringProgram> & { id: string }): MentoringProgram {
  return {
    type: 'individual',
    title: 'P',
    goal: '',
    mentorId: 'm1',
    studentId: 's1',
    totalSessions: 4,
    status: 'active',
    ...overrides,
  } as MentoringProgram;
}

class FakeRepo implements MentoringProgramRepository {
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

describe('getMentorPrograms', () => {
  it('marca activos y ordena por creación desc', async () => {
    const repo = new FakeRepo([
      program({ id: 'old', createdAt: new Date('2026-01-01') }),
      program({ id: 'new', status: 'suspended', createdAt: new Date('2026-02-01') }),
      program({ id: 'other', mentorId: 'm2' }),
    ]);
    const result = await getMentorPrograms(repo, { mentorId: 'm1' });
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value.map((s) => s.program.id)).toEqual(['new', 'old']);
    expect(result.value[0].active).toBe(false);
    expect(result.value[1].active).toBe(true);
  });

  it('mentorId vacío devuelve VALIDATION', async () => {
    const result = await getMentorPrograms(new FakeRepo([]), { mentorId: '' });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.code).toBe('VALIDATION');
  });
});

describe('listAllPrograms', () => {
  it('devuelve todos ordenados', async () => {
    const repo = new FakeRepo([
      program({ id: 'a', mentorId: 'm1' }),
      program({ id: 'b', mentorId: 'm2' }),
    ]);
    const result = await listAllPrograms(repo);
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value.map((s) => s.program.id).sort()).toEqual(['a', 'b']);
  });
});
