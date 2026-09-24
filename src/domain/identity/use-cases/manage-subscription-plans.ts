/**
 * Identidad — Casos de uso: directorio de planes de suscripción (F0.3).
 * Lógica 1:1 con `api/admin/subscription-plans` legacy (GET sin auth en
 * el borde, POST/PUT/DELETE con `verifyAdmin` en el borde; validaciones
 * y mensajes exactos, 201 al crear, `{message, id}` al actualizar y
 * eliminar) y con `GET api/plans` (dual-read `subscriptionPlans` +
 * `subscription-plans` encapsulado en el repo + normalización +
 * `debug` con tamaños). El repo inyecta los `serverTimestamp`.
 * Dominio puro.
 */
import { err, ok, type Result } from '@/domain/shared/result';
import { unavailable, validationError, type DomainError } from '@/domain/shared/errors';
import { toDomainDate } from '@/domain/shared/firestore-mapping';

/** Fila cruda de planes (el repo encapsula ambas colecciones). */
export interface PlanDirectoryRow {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

/** Directorio de planes (lo implementa `subscription-repo`). */
export interface PlanDirectory {
  /** `subscriptionPlans` (igual que el GET admin legacy). */
  listPlans(): Promise<PlanDirectoryRow[]>;
  /** Dual-read `subscriptionPlans` + `subscription-plans` (igual que `api/plans`). */
  listPlansDual(): Promise<{ camelCase: PlanDirectoryRow[]; kebabCase: PlanDirectoryRow[] }>;
  /** Ids con `name ==` (chequeo de duplicados legacy). */
  findPlanIdsByName(name: string): Promise<string[]>;
  /** Crea en `subscriptionPlans` (el repo agrega createdAt/updatedAt). Retorna id. */
  createPlan(data: Record<string, unknown>): Promise<string>;
  /** Patch en `subscriptionPlans/{id}` (el repo agrega updatedAt). */
  updatePlan(id: string, patch: Record<string, unknown>): Promise<void>;
  deletePlan(id: string): Promise<void>;
}

export interface SubscriptionPlanView {
  readonly id: string;
  readonly [key: string]: unknown;
}

function orderByCreatedDesc(rows: PlanDirectoryRow[]): PlanDirectoryRow[] {
  return [...rows].sort((a, b) => {
    const ta = toDomainDate(a.data.createdAt as never)?.getTime() ?? Number.NEGATIVE_INFINITY;
    const tb = toDomainDate(b.data.createdAt as never)?.getTime() ?? Number.NEGATIVE_INFINITY;
    return tb - ta;
  });
}

export async function listSubscriptionPlans(
  dir: PlanDirectory,
): Promise<Result<{ plans: SubscriptionPlanView[] }, DomainError>> {
  const rows = await dir.listPlans();
  return ok({
    plans: orderByCreatedDesc(rows).map((row) => ({
      id: row.id,
      ...row.data,
      createdAt: toDomainDate(row.data.createdAt as never),
      updatedAt: toDomainDate(row.data.updatedAt as never),
    })),
  });
}

function asRecord(body: unknown): Record<string, unknown> | null {
  if (typeof body !== 'object' || body === null) return null;
  return body as Record<string, unknown>;
}

function checkCreateValidations(planData: Record<string, unknown>): string | null {
  if (!planData.name || (typeof planData.name === 'string' && planData.name.trim() === '')) {
    return 'El nombre del plan es requerido';
  }
  const features = planData.features as unknown[] | undefined;
  if (!features || features.length === 0) {
    return 'Las características del plan son requeridas';
  }
  if (planData.type !== 'free' && (planData.price === undefined || (planData.price as number) <= 0)) {
    return 'El precio es requerido para planes de pago';
  }
  if (
    planData.type === 'percentage' &&
    (planData.percentageRate === undefined || (planData.percentageRate as number) <= 0)
  ) {
    return 'El porcentaje es requerido para planes porcentuales';
  }
  if (!planData.durationMonths || (planData.durationMonths as number) <= 0) {
    return 'La duración en meses es requerida';
  }
  const limits = planData.limits as { maxCourses?: unknown; maxStudents?: unknown } | undefined;
  if (!limits || limits.maxCourses === undefined || limits.maxStudents === undefined) {
    return 'Los límites de cursos y estudiantes son requeridos';
  }
  const permissions = planData.permissions as Record<string, boolean> | undefined;
  if (!permissions || Object.values(permissions).every((p) => p === false)) {
    return 'Al menos un permiso debe estar activo';
  }
  return null;
}

export async function createSubscriptionPlan(
  dir: PlanDirectory,
  rawBody: unknown,
): Promise<Result<{ id: string }, DomainError>> {
  const planData = asRecord(rawBody);
  if (!planData) {
    return err(unavailable('Failed to create subscription plan'));
  }
  // Orden legacy: duplicado primero (incluso antes del nombre requerido).
  const duplicates = await dir.findPlanIdsByName(planData.name as string);
  if (duplicates.length > 0) {
    return err(validationError('Ya existe un plan con ese nombre'));
  }
  const failed = checkCreateValidations(planData);
  if (failed) {
    return err(validationError(failed));
  }
  const id = await dir.createPlan(planData);
  return ok({ id });
}

function checkUpdateValidations(updateData: Record<string, unknown>): string | null {
  if (updateData.type === 'free' && (updateData.price as number) && (updateData.price as number) > 0) {
    return 'Los planes gratuitos no pueden tener precio';
  }
  if (updateData.type === 'fixed' && updateData.percentageRate) {
    return 'Los planes fijos no pueden tener porcentaje';
  }
  if (updateData.type === 'percentage' && updateData.price) {
    return 'Los planes porcentuales no pueden tener precio fijo';
  }
  return null;
}

export async function updateSubscriptionPlan(
  dir: PlanDirectory,
  id: string | null,
  rawBody: unknown,
): Promise<Result<{ id: string }, DomainError>> {
  if (!id) {
    return err(validationError('ID is required'));
  }
  const updateData = asRecord(rawBody);
  if (!updateData) {
    return err(unavailable('Failed to update subscription plan'));
  }
  if (updateData.name) {
    const duplicates = await dir.findPlanIdsByName(updateData.name as string);
    if (duplicates.some((docId) => docId !== id)) {
      return err(validationError('Ya existe otro plan con ese nombre'));
    }
  }
  const failed = checkUpdateValidations(updateData);
  if (failed) {
    return err(validationError(failed));
  }
  await dir.updatePlan(id, updateData);
  return ok({ id });
}

export async function deleteSubscriptionPlan(
  dir: PlanDirectory,
  id: string | null,
): Promise<Result<{ id: string }, DomainError>> {
  if (!id) {
    return err(validationError('ID is required'));
  }
  await dir.deletePlan(id);
  return ok({ id });
}

export interface PublicPlanView {
  readonly id: string;
  readonly _source: 'camelCase' | 'kebab-case';
  readonly [key: string]: unknown;
}

export interface PublicPlansResult {
  readonly plans: PublicPlanView[];
  readonly debug: { readonly camelCaseSize: number; readonly kebabCaseSize: number };
}

function normalizePublicPlan(
  plan: PlanDirectoryRow,
  source: 'camelCase' | 'kebab-case',
): PublicPlanView {
  const data = plan.data;
  return {
    ...data,
    id: plan.id,
    _source: source,
    name: (data.name as string) || 'Plan sin nombre',
    price: Number((data.price as number) || 0),
    isActive: (data.isActive as boolean) ?? true,
    aiQuotas: data.aiQuotas || { totalCredits: 0 },
    limits: data.limits || { maxCourses: 5, maxStudents: 100 },
  };
}

export async function listPublicPlans(
  dir: PlanDirectory,
): Promise<Result<PublicPlansResult, DomainError>> {
  const { camelCase, kebabCase } = await dir.listPlansDual();
  const plans: PublicPlanView[] = [
    ...camelCase.map((p) => normalizePublicPlan(p, 'camelCase')),
    ...kebabCase.map((p) => normalizePublicPlan(p, 'kebab-case')),
  ];
  return ok({
    plans,
    debug: { camelCaseSize: camelCase.length, kebabCaseSize: kebabCase.length },
  });
}
