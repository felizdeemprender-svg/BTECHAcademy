/**
 * F1.3 (TDD rojo) — UCs de identidad para tutors:
 * `resolveTutorByUsername` (users username==), `getTutorStatus` (checks de
 * suscripción/perfil + conteo de cursos + rama local sin service-account),
 * `listFeaturedTutors` (isPublic + status) y `getTutorById` (doc directo).
 * Misma semántica que `api/tutors/*` legacy.
 */
import { describe, expect, it } from 'vitest';

import { resolveTutorByUsername } from '../resolve-tutor-by-username';
import { getTutorStatus } from '../get-tutor-status';
import { listFeaturedTutors } from '../list-featured';
import { getTutorById } from '../get-tutor-by-id';
import type { TutorRepository, TutorSnapshot } from '../../tutor-repository';
import type { CourseRepository } from '../../../catalog/course-repository';

function tutor(id: string, data: Record<string, unknown>): TutorSnapshot {
  return { id, data };
}

const ANA = tutor('tutor-1', {
  username: 'ana',
  displayName: 'Ana',
  email: 'ana@x.com',
  roles: ['mentor'],
  subscription: { status: 'active', plan: 'pro' },
  profile: { publicProfile: { enabled: true } },
  stats: { totalCourses: 7 },
});

function stubTutors(overrides: Partial<Record<string, TutorSnapshot | null>> = {}) {
  const calls: string[] = [];
  const repo: TutorRepository = {
    findTutorByUsername: async (username: string) => {
      calls.push(`byUsername:${username}`);
      if (username in overrides) return overrides[username] ?? null;
      return username === 'ana' ? ANA : null;
    },
    findTutorById: async (id: string) => {
      calls.push(`byId:${id}`);
      return id === 'tutor-1' ? ANA : null;
    },
    listFeaturedTutors: async () => [ANA],
    findLandingStyleById: async () => null,
  };
  return { repo, calls };
}

function stubCourses(count = 3, fail = false) {
  const calls: string[] = [];
  const courses: Pick<CourseRepository, 'countPublicCoursesByMentor'> = {
    countPublicCoursesByMentor: async (mentorId: string) => {
      calls.push(mentorId);
      if (fail) throw new Error('índice faltante');
      return count;
    },
  };
  return { courses, calls };
}

describe('resolveTutorByUsername', () => {
  it('resuelve id + snapshot', async () => {
    const { repo } = stubTutors();
    const result = await resolveTutorByUsername(repo, { username: 'ana' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tutorId).toBe('tutor-1');
  });

  it('desconocido → NOT_FOUND Tutor not found', async () => {
    const { repo } = stubTutors();
    const result = await resolveTutorByUsername(repo, { username: 'nadie' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.message).toBe('Tutor not found');
  });

  it('input inválido → VALIDATION', async () => {
    const { repo } = stubTutors();
    const result = await resolveTutorByUsername(repo, { username: '' });
    expect(result.ok).toBe(false);
  });
});

describe('getTutorStatus', () => {
  it('tutor activo → ok con conteo de cursos', async () => {
    const { repo } = stubTutors();
    const { courses, calls } = stubCourses(5);
    const result = await getTutorStatus(repo, courses, { username: 'ana' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tutorId).toBe('tutor-1');
    expect(result.value.coursesCount).toBe(5);
    expect(calls).toEqual(['tutor-1']);
  });

  it('suscripción inactiva → FORBIDDEN subscription_inactive (no cuenta cursos)', async () => {
    const inactive = tutor('tutor-9', {
      username: 'off',
      roles: ['mentor'],
      subscription: { status: 'past_due' },
      profile: {},
    });
    const { repo } = stubTutors({ off: inactive });
    const { courses, calls } = stubCourses();
    const result = await getTutorStatus(repo, courses, { username: 'off' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('FORBIDDEN');
    expect((result.error.details as { reason: string }).reason).toBe('subscription_inactive');
    expect(calls).toEqual([]);
  });

  it('admin bypasea el check de suscripción', async () => {
    const admin = tutor('admin-1', {
      username: 'root',
      roles: ['admin'],
      subscription: { status: 'whatever' },
      profile: {},
    });
    const { repo } = stubTutors({ root: admin });
    const { courses } = stubCourses(1);
    const result = await getTutorStatus(repo, courses, { username: 'root' });
    expect(result.ok).toBe(true);
  });

  it('perfil privado → FORBIDDEN profile_private', async () => {
    const priv = tutor('tutor-8', {
      username: 'priv',
      roles: ['mentor'],
      subscription: { status: 'active' },
      profile: { publicProfile: { enabled: false } },
    });
    const { repo } = stubTutors({ priv });
    const { courses } = stubCourses();
    const result = await getTutorStatus(repo, courses, { username: 'priv' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.error.details as { reason: string }).reason).toBe('profile_private');
  });

  it('rama local (adminPath=false): omite suscripción y usa stats.totalCourses', async () => {
    const inactive = tutor('tutor-9', {
      username: 'off',
      roles: ['mentor'],
      subscription: { status: 'past_due' },
      profile: {},
      stats: { totalCourses: 7 },
    });
    const { repo } = stubTutors({ off: inactive });
    const { courses, calls } = stubCourses();
    const result = await getTutorStatus(repo, courses, { username: 'off', adminPath: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.coursesCount).toBe(7);
    expect(calls).toEqual([]);
  });

  it('fallo de conteo no es crítico → coursesCount 0', async () => {
    const { repo } = stubTutors();
    const { courses } = stubCourses(0, true);
    const result = await getTutorStatus(repo, courses, { username: 'ana' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.coursesCount).toBe(0);
  });

  it('desconocido → NOT_FOUND', async () => {
    const { repo } = stubTutors();
    const { courses } = stubCourses();
    const result = await getTutorStatus(repo, courses, { username: 'nadie' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });
});

describe('listFeaturedTutors', () => {
  it('mapea id + tutorName + subscription', async () => {
    const { repo } = stubTutors();
    const result = await listFeaturedTutors(repo, {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.subscriptions).toEqual([
      { id: 'tutor-1', tutorName: 'Ana', subscription: { status: 'active', plan: 'pro' } },
    ]);
  });
});

describe('getTutorById', () => {
  it('resuelve por id', async () => {
    const { repo } = stubTutors();
    const result = await getTutorById(repo, { id: 'tutor-1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tutorId).toBe('tutor-1');
  });

  it('desconocido → NOT_FOUND Tutor not found', async () => {
    const { repo } = stubTutors();
    const result = await getTutorById(repo, { id: 'nope' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Tutor not found');
  });
});
