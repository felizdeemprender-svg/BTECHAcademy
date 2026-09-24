/**
 * Tests del kernel de identidad: roles, perfil, suscripción y usuario.
 * Dominio puro, sin Firebase.
 */
import { describe, expect, it } from 'vitest';

import {
  RoleTypeSchema,
  hasRole,
  isAdminRole,
  isAlumnoRole,
  isMentorRole,
} from '../roles';
import { UserProfileSchema } from '../profile';
import {
  UserSubscriptionSchema,
  hasCourseCapacity,
  isSubscriptionInGoodStanding,
} from '../subscription';
import { UserSchema, canActAsMentor, getPrimaryRole, hasMentorRole } from '../user';

const baseLimits = {
  maxCourses: 5,
  maxStudents: 100,
  hasCustomBranding: true,
  hasAnalytics: true,
  hasPrioritySupport: false,
};

const basePublicProfile = {
  enabled: true,
  showStats: true,
  showContact: false,
  allowPublicCourses: true,
};

function baseSubscription(overrides: Record<string, unknown> = {}) {
  return {
    status: 'active',
    type: 'free',
    limits: baseLimits,
    publicProfile: basePublicProfile,
    ...overrides,
  };
}

function baseUser(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'u1',
    email: 'mentor@test.com',
    displayName: 'Mentor Test',
    roles: ['mentor'],
    isMentor: true,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('roles', () => {
  it('acepta los 4 roles válidos', () => {
    for (const role of ['alumno', 'mentor', 'marketing', 'admin'] as const) {
      expect(RoleTypeSchema.parse(role)).toBe(role);
    }
  });

  it('rechaza roles desconocidos y arrays vacíos', () => {
    expect(() => RoleTypeSchema.parse('superadmin')).toThrow();
  });

  it('helpers detectan cada rol', () => {
    expect(hasRole(['mentor', 'admin'], 'admin')).toBe(true);
    expect(hasRole(['mentor'], 'admin')).toBe(false);
    expect(isMentorRole(['mentor'])).toBe(true);
    expect(isAdminRole(['mentor'])).toBe(false);
    expect(isAlumnoRole(['alumno'])).toBe(true);
  });
});

describe('profile', () => {
  it('acepta perfil vacío y perfil con redes', () => {
    expect(UserProfileSchema.parse({})).toEqual({});
    const parsed = UserProfileSchema.parse({
      bio: 'Hola',
      socials: { instagram: '@x', website: 'https://x.com' },
    });
    expect(parsed.bio).toBe('Hola');
    expect(parsed.socials?.instagram).toBe('@x');
  });

  it('rechaza bio no-string', () => {
    expect(() => UserProfileSchema.parse({ bio: 123 })).toThrow();
  });
});

describe('subscription', () => {
  it('parsea suscripción mínima válida', () => {
    const sub = UserSubscriptionSchema.parse(baseSubscription());
    expect(sub.status).toBe('active');
    expect(sub.payment?.paymentHistory ?? []).toEqual([]);
  });

  it('acepta trialing (convive con dashboard)', () => {
    const sub = UserSubscriptionSchema.parse(baseSubscription({ status: 'trialing' }));
    expect(sub.status).toBe('trialing');
  });

  it('rechaza estado y límites inválidos', () => {
    expect(() => UserSubscriptionSchema.parse(baseSubscription({ status: 'gold' }))).toThrow();
    expect(() =>
      UserSubscriptionSchema.parse(baseSubscription({ limits: { ...baseLimits, maxCourses: -1 } })),
    ).toThrow();
  });

  it('good standing solo active/trialing', () => {
    expect(isSubscriptionInGoodStanding('active')).toBe(true);
    expect(isSubscriptionInGoodStanding('trialing')).toBe(true);
    expect(isSubscriptionInGoodStanding('expired')).toBe(false);
    expect(isSubscriptionInGoodStanding('suspended')).toBe(false);
  });

  it('capacidad de cursos respeta el límite', () => {
    expect(hasCourseCapacity(baseLimits, 4)).toBe(true);
    expect(hasCourseCapacity(baseLimits, 5)).toBe(false);
  });
});

describe('user', () => {
  it('parsea usuario mentor válido con defaults', () => {
    const user = UserSchema.parse(baseUser());
    expect(user.uid).toBe('u1');
    expect(user.mentorPermissions).toEqual([]);
    expect(user.associatedMentors).toEqual([]);
  });

  it('rechaza email inválido, displayName vacío y roles vacíos', () => {
    expect(() => UserSchema.parse(baseUser({ email: 'no-email' }))).toThrow();
    expect(() => UserSchema.parse(baseUser({ displayName: '' }))).toThrow();
    expect(() => UserSchema.parse(baseUser({ roles: [] }))).toThrow();
    expect(() => UserSchema.parse(baseUser({ roles: ['jedi'] }))).toThrow();
  });

  it('helpers de rol mentor', () => {
    const mentor = UserSchema.parse(baseUser());
    expect(hasMentorRole(mentor)).toBe(true);
    expect(canActAsMentor(mentor)).toBe(true);
    expect(getPrimaryRole(mentor)).toBe('mentor');

    const inactivo = UserSchema.parse(baseUser({ isActive: false }));
    expect(canActAsMentor(inactivo)).toBe(false);

    const alumno = UserSchema.parse(
      baseUser({ roles: ['alumno'], isMentor: false }),
    );
    expect(hasMentorRole(alumno)).toBe(false);
    expect(canActAsMentor(alumno)).toBe(false);
    expect(getPrimaryRole(alumno)).toBe('alumno');
  });
});
