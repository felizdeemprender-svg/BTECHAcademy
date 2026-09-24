/**
 * Tests del dominio mentoría: programas, sesiones, tareas,
 * logros y progreso. Dominio puro, sin Firebase.
 */
import { describe, expect, it } from 'vitest';

import {
  MentoringProgramSchema,
  isGroupProgram,
  isProgramActive,
  isProgramReadyToStart,
  programStatusLabel,
} from '../program';
import {
  MentoringSessionSchema,
  compareSessions,
  deriveSessionStatus,
  isSessionCompleted,
} from '../session';
import {
  MentoringTaskSchema,
  isTaskCompleted,
  isTaskFormValid,
  submitTaskAnswer,
} from '../task';
import {
  StudentAchievementSchema,
  averageModuleScore,
  buildAchievementId,
} from '../achievement';
import { averageTaskProgress, computeProgramProgress } from '../program-progress';

describe('program', () => {
  function baseProgram(overrides: Record<string, unknown> = {}) {
    return {
      id: 'f1',
      title: 'Mentoría X',
      mentorId: 'm1',
      studentId: 's1',
      totalSessions: 8,
      ...overrides,
    };
  }

  it('aplica defaults (individual, active)', () => {
    const p = MentoringProgramSchema.parse(baseProgram());
    expect(p.type).toBe('individual');
    expect(p.status).toBe('active');
    expect(p.goal).toBe('');
  });

  it('grupal no requiere alumno; individual sí', () => {
    expect(isGroupProgram({ type: 'group' })).toBe(true);
    expect(isProgramReadyToStart({ type: 'group', title: 'G', studentId: '' })).toBe(true);
    expect(isProgramReadyToStart({ type: 'individual', title: 'I', studentId: '' })).toBe(false);
    expect(isProgramReadyToStart({ type: 'individual', title: '  ', studentId: 's1' })).toBe(false);
    expect(isProgramReadyToStart({ type: 'individual', title: 'I', studentId: 's1' })).toBe(true);
  });

  it('estado activo y etiquetas de la tabla', () => {
    expect(isProgramActive({ status: 'active' })).toBe(true);
    expect(isProgramActive({ status: 'suspended' })).toBe(false);
    expect(programStatusLabel('active')).toBe('En Curso');
    expect(programStatusLabel('paused')).toBe('Pausada');
    expect(programStatusLabel('suspended')).toBe('Suspendida');
    expect(programStatusLabel('finished')).toBe('Finalizada');
  });

  it('rechaza sin título ni mentor', () => {
    expect(() => MentoringProgramSchema.parse(baseProgram({ title: '' }))).toThrow();
    expect(() => MentoringProgramSchema.parse(baseProgram({ mentorId: '' }))).toThrow();
  });
});

describe('session', () => {
  function baseSession(overrides: Record<string, unknown> = {}) {
    return { id: 's1', followUpId: 'f1', ...overrides };
  }

  it('aplica defaults del formulario', () => {
    const s = MentoringSessionSchema.parse(baseSession());
    expect(s.status).toBe('pending');
    expect(s.isCompleted).toBe(false);
    expect(s.duration).toBe(60);
    expect(s.topics).toEqual([]);
    expect(s.orderIndex).toBe(0);
  });

  it('deriveSessionStatus replica handleSaveSession', () => {
    expect(deriveSessionStatus(true, '')).toBe('completed');
    expect(deriveSessionStatus(true, '2026-01-01')).toBe('completed');
    expect(deriveSessionStatus(false, '2026-01-01')).toBe('scheduled');
    expect(deriveSessionStatus(false, '')).toBe('pending');
  });

  it('isSessionCompleted acepta ambas marcas (igual que useFollowUps)', () => {
    expect(isSessionCompleted({ isCompleted: true, status: 'pending' })).toBe(true);
    expect(isSessionCompleted({ isCompleted: false, status: 'completed' })).toBe(true);
    expect(isSessionCompleted({ isCompleted: false, status: 'scheduled' })).toBe(false);
  });

  it('compareSessions ordena por fecha y luego orderIndex', () => {
    const a = { date: '2026-01-02', time: '10:00', orderIndex: 0 };
    const b = { date: '2026-01-01', time: '10:00', orderIndex: 5 };
    expect(compareSessions(a, b)).toBeGreaterThan(0);
    expect(compareSessions(b, a)).toBeLessThan(0);
    expect(
      compareSessions(
        { date: '', time: '', orderIndex: 2 },
        { date: '', time: '', orderIndex: 1 },
      ),
    ).toBeGreaterThan(0);
    expect(
      compareSessions(
        { date: '2026-01-01', time: '', orderIndex: 9 },
        { date: '', time: '', orderIndex: 0 },
      ),
    ).toBeLessThan(0);
  });
});

describe('task', () => {
  function baseTask(overrides: Record<string, unknown> = {}) {
    return { id: 't1', followUpId: 'f1', title: 'Desafío Libre', ...overrides };
  }

  it('nace pending con progreso 0', () => {
    const t = MentoringTaskSchema.parse(baseTask());
    expect(t.status).toBe('pending');
    expect(t.progress).toBe(0);
    expect(t.type).toBe('free');
    expect(isTaskCompleted(t)).toBe(false);
  });

  it('isTaskFormValid replica la validación de asignación', () => {
    expect(isTaskFormValid({ type: 'free', description: 'Haz X' })).toBe(true);
    expect(isTaskFormValid({ type: 'free', description: '  ' })).toBe(false);
    expect(
      isTaskFormValid({ type: 'module', description: '', courseId: 'c1', moduleId: 'm1' }),
    ).toBe(true);
    expect(
      isTaskFormValid({ type: 'module', description: '', courseId: 'c1' }),
    ).toBe(false);
    expect(isTaskFormValid({ type: 'course', description: '', courseId: 'c1' })).toBe(true);
    expect(isTaskFormValid({ type: 'course', description: '' })).toBe(false);
  });

  it('submitTaskAnswer es inmutable y completa al 100', () => {
    const original = MentoringTaskSchema.parse(baseTask());
    const submitted = submitTaskAnswer(original, {
      answer: 'Mi respuesta',
      fileUrl: null,
      aiFeedback: 'Bien',
      score: 85,
      completedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(submitted.status).toBe('completed');
    expect(submitted.progress).toBe(100);
    expect(submitted.score).toBe(85);
    expect(isTaskCompleted(submitted)).toBe(true);
    expect(original.status).toBe('pending');
    expect(original.progress).toBe(0);
  });
});

describe('achievement', () => {
  it('buildAchievementId une student + course', () => {
    expect(buildAchievementId('s1', 'c1')).toBe('s1_c1');
  });

  it('parsea logro con snapshot de título', () => {
    const a = StudentAchievementSchema.parse({
      id: 's1_c1',
      studentId: 's1',
      studentEmail: 's@x.com',
      courseId: 'c1',
      courseTitle: 'Curso (snapshot)',
      mentorId: 'm1',
      completedAt: '2026-01-01',
      finalScore: 90,
      moduleSummary: [{ moduleId: 'm1', moduleTitle: 'M1', score: 90, completedAt: '2026-01-01' }],
    });
    expect(a.moduleSummary).toHaveLength(1);
  });

  it('averageModuleScore promedia y 0 si vacío', () => {
    expect(averageModuleScore([{ score: 80 }, { score: 100 }])).toBe(90);
    expect(averageModuleScore([])).toBe(0);
  });
});

describe('program-progress', () => {
  it('computeProgramProgress replica los conteos de la página', () => {
    const p = computeProgramProgress({
      totalPlanned: 8,
      completedPlanned: 2,
      completedExtra: 1,
      totalExtra: 1,
      tasksCompleted: 3,
      tasksTotal: 4,
      avgTaskProgress: 75,
    });
    expect(p.sessionProgressPercent).toBe(25);
    expect(p.extraCompleted).toBe(1);
    expect(p.tasksCompleted).toBe(3);
    expect(p.tasksTotal).toBe(4);
    expect(p.avgTaskProgress).toBe(75);
  });

  it('sin plan ni tareas devuelve ceros', () => {
    const p = computeProgramProgress({
      totalPlanned: 0,
      completedPlanned: 0,
      completedExtra: 0,
      totalExtra: 0,
      tasksCompleted: 0,
      tasksTotal: 0,
      avgTaskProgress: 0,
    });
    expect(p.sessionProgressPercent).toBe(0);
    expect(p.avgTaskProgress).toBe(0);
  });

  it('averageTaskProgress promedia progress y 0 si vacía', () => {
    expect(averageTaskProgress([{ progress: 100 }, { progress: 50 }, {}])).toBe(50);
    expect(averageTaskProgress([])).toBe(0);
  });
});
