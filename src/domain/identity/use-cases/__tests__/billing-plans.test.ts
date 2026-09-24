/**
 * F0.3 (TDD rojo) — planes: `listSubscriptionPlans` / `createSubscriptionPlan` /
 * `updateSubscriptionPlan` / `deleteSubscriptionPlan` / `listPublicPlans`.
 * Misma semántica que `api/admin/subscription-plans` (validaciones y códigos
 * exactos) y `GET api/plans` (dual-read + normalización + debug).
 */
import { describe, expect, it } from 'vitest';

import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  listPublicPlans,
  listSubscriptionPlans,
  updateSubscriptionPlan,
  type PlanDirectory,
  type PlanDirectoryRow,
} from '../manage-subscription-plans';

function planRow(id: string, data: Record<string, unknown>): PlanDirectoryRow {
  return { id, data };
}

function stubDirectory(initial: PlanDirectoryRow[] = [], kebab: PlanDirectoryRow[] = []) {
  const store = new Map(initial.map((r) => [r.id, r]));
  const kebabStore = new Map(kebab.map((r) => [r.id, r]));
  const created: Record<string, unknown>[] = [];
  const updated: { id: string; patch: Record<string, unknown> }[] = [];
  const deleted: string[] = [];
  const dir: PlanDirectory = {
    listPlans: async () => [...store.values()],
    listPlansDual: async () => ({ camelCase: [...store.values()], kebabCase: [...kebabStore.values()] }),
    findPlanIdsByName: async (name) =>
      [...store.values()].filter((r) => r.data.name === name).map((r) => r.id),
    createPlan: async (data) => {
      created.push(data);
      const id = 'new-plan-id';
      store.set(id, { id, data });
      return id;
    },
    updatePlan: async (id, patch) => {
      updated.push({ id, patch });
    },
    deletePlan: async (id) => {
      deleted.push(id);
    },
  };
  return { dir, created, updated, deleted };
}

const validPlan = {
  name: 'Pro',
  type: 'fixed',
  price: 100,
  durationMonths: 12,
  maxSimultaneousCourses: 5,
  isActive: true,
  features: ['a'],
  permissions: { academic_management: true, mentor_challenges: false, students_view: false, followups_management: false, marketing_access: false },
  limits: { maxCourses: 10, maxStudents: 100, hasCustomBranding: false, hasAnalytics: false, hasPrioritySupport: false },
  hasCustomPage: false,
  requiresFreeCourses: false,
  freeCoursesCount: 0,
  invitationsPerCourse: 10,
};

describe('listSubscriptionPlans', () => {
  it('ordena por createdAt desc y mapea id + datos', async () => {
    const { dir } = stubDirectory([
      planRow('old', { name: 'Old', createdAt: new Date('2026-01-01T00:00:00Z') }),
      planRow('new', { name: 'New', createdAt: new Date('2026-09-01T00:00:00Z') }),
    ]);
    const result = await listSubscriptionPlans(dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.plans.map((p) => p.id)).toEqual(['new', 'old']);
  });
});

describe('createSubscriptionPlan', () => {
  it('duplicado → VALIDATION (antes que el resto, como el legacy)', async () => {
    const { dir } = stubDirectory([planRow('p1', { name: 'Pro' })]);
    const result = await createSubscriptionPlan(dir, { ...validPlan });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Ya existe un plan con ese nombre');
  });

  it('sin nombre → VALIDATION', async () => {
    const { dir } = stubDirectory();
    const result = await createSubscriptionPlan(dir, { ...validPlan, name: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('El nombre del plan es requerido');
  });

  it('sin features → VALIDATION', async () => {
    const { dir } = stubDirectory();
    const result = await createSubscriptionPlan(dir, { ...validPlan, features: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Las características del plan son requeridas');
  });

  it('pago sin precio → VALIDATION', async () => {
    const { dir } = stubDirectory();
    const result = await createSubscriptionPlan(dir, { ...validPlan, price: 0 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('El precio es requerido para planes de pago');
  });

  it('porcentual sin rate → VALIDATION', async () => {
    const { dir } = stubDirectory();
    const result = await createSubscriptionPlan(dir, {
      ...validPlan,
      type: 'percentage',
      price: 1,
      percentageRate: 0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('El porcentaje es requerido para planes porcentuales');
  });

  it('sin duración → VALIDATION', async () => {
    const { dir } = stubDirectory();
    const result = await createSubscriptionPlan(dir, { ...validPlan, durationMonths: 0 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('La duración en meses es requerida');
  });

  it('sin límites → VALIDATION', async () => {
    const { dir } = stubDirectory();
    const result = await createSubscriptionPlan(dir, { ...validPlan, limits: undefined });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Los límites de cursos y estudiantes son requeridos');
  });

  it('sin permisos activos → VALIDATION', async () => {
    const { dir } = stubDirectory();
    const result = await createSubscriptionPlan(dir, {
      ...validPlan,
      permissions: { academic_management: false, mentor_challenges: false, students_view: false, followups_management: false, marketing_access: false },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Al menos un permiso debe estar activo');
  });

  it('válido → crea y retorna id', async () => {
    const { dir, created } = stubDirectory();
    const result = await createSubscriptionPlan(dir, { ...validPlan });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ id: 'new-plan-id' });
    expect(created).toHaveLength(1);
  });
});

describe('updateSubscriptionPlan', () => {
  it('sin id → VALIDATION ID is required', async () => {
    const { dir } = stubDirectory();
    const result = await updateSubscriptionPlan(dir, null, { name: 'X' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('ID is required');
  });

  it('nombre de otro plan → VALIDATION', async () => {
    const { dir } = stubDirectory([
      planRow('p1', { name: 'Pro' }),
      planRow('p2', { name: 'Base' }),
    ]);
    const result = await updateSubscriptionPlan(dir, 'p1', { name: 'Base' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Ya existe otro plan con ese nombre');
  });

  it('mismo nombre propio → ok', async () => {
    const { dir, updated } = stubDirectory([planRow('p1', { name: 'Pro' })]);
    const result = await updateSubscriptionPlan(dir, 'p1', { name: 'Pro' });
    expect(result.ok).toBe(true);
    expect(updated).toHaveLength(1);
  });

  it('free con precio → VALIDATION', async () => {
    const { dir } = stubDirectory();
    const result = await updateSubscriptionPlan(dir, 'p1', { type: 'free', price: 10 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Los planes gratuitos no pueden tener precio');
  });

  it('fixed con porcentaje → VALIDATION', async () => {
    const { dir } = stubDirectory();
    const result = await updateSubscriptionPlan(dir, 'p1', { type: 'fixed', percentageRate: 5 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Los planes fijos no pueden tener porcentaje');
  });

  it('percentage con precio → VALIDATION', async () => {
    const { dir } = stubDirectory();
    const result = await updateSubscriptionPlan(dir, 'p1', { type: 'percentage', price: 10 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Los planes porcentuales no pueden tener precio fijo');
  });
});

describe('deleteSubscriptionPlan', () => {
  it('sin id → VALIDATION', async () => {
    const { dir } = stubDirectory();
    const result = await deleteSubscriptionPlan(dir, null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('ID is required');
  });

  it('con id → elimina y retorna id', async () => {
    const { dir, deleted } = stubDirectory();
    const result = await deleteSubscriptionPlan(dir, 'p1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ id: 'p1' });
    expect(deleted).toEqual(['p1']);
  });
});

describe('listPublicPlans', () => {
  it('dual-read: une camelCase + kebab-case con _source y normaliza', async () => {
    const { dir } = stubDirectory(
      [planRow('c1', { name: 'Camel', price: '50' })],
      [planRow('k1', {})],
    );
    const result = await listPublicPlans(dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.debug).toEqual({ camelCaseSize: 1, kebabCaseSize: 1 });
    expect(result.value.plans).toHaveLength(2);
    expect(result.value.plans[0]).toMatchObject({
      id: 'c1',
      _source: 'camelCase',
      name: 'Camel',
      price: 50,
      aiQuotas: { totalCredits: 0 },
      limits: { maxCourses: 5, maxStudents: 100 },
    });
    expect(result.value.plans[1]).toMatchObject({
      id: 'k1',
      _source: 'kebab-case',
      name: 'Plan sin nombre',
      price: 0,
      isActive: true,
    });
  });
});
