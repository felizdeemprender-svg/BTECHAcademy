/**
 * API — Handlers testeables de admin de suscripciones (F0.3): planes
 * (CRUD + públicos con dual-read) y tutores (lista + detalle +
 * actualización). Firma `(gateway, caller, ...args)`, sin deps externas.
 * Envelopes legacy exactos (NO `toApiResponse`). Auth igual que el
 * legacy: `GET subscription-plans` y `GET plans` SIN auth; el resto exige
 * admin (`verifyAdmin` en el borde + guarda `isAdmin` aquí).
 */
import { NextResponse } from 'next/server';

import { FirestoreSubscriptionRepository } from '@/data/firestore/subscription-repo';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import type { DomainError } from '@/domain/shared/errors';
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  getTutorSubscriptionDetail,
  listPublicPlans,
  listSubscriptionPlans,
  listTutorSubscriptions,
  updateSubscriptionPlan,
  updateTutorSubscription,
} from '@/domain/identity/use-cases';

import type { Caller } from './mentor-auth';

function requireAdmin(caller: Caller | null): NextResponse | null {
  if (!caller || !caller.isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return null;
}

/** 400 `{error[, field]}` / 404 `{error}` / 500 con el cuerpo de cada ruta. */
function domainErrorResponse(error: DomainError, fallback500: string): NextResponse {
  if (error.code === 'VALIDATION') {
    const details = (error.details ?? {}) as { field?: unknown };
    const body: Record<string, unknown> = { error: error.message };
    if (typeof details.field === 'string') body.field = details.field;
    return NextResponse.json(body, { status: 400 });
  }
  if (error.code === 'NOT_FOUND') {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error.code === 'UNAVAILABLE') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ error: fallback500 }, { status: 500 });
}

export async function handleListPlans(
  gateway: FirestoreGateway,
  _caller: Caller | null,
): Promise<NextResponse> {
  try {
    const result = await listSubscriptionPlans(new FirestoreSubscriptionRepository(gateway));
    if (!result.ok) {
      return NextResponse.json({ error: 'Failed to fetch subscription plans' }, { status: 500 });
    }
    return NextResponse.json({ plans: result.value.plans });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription plans' }, { status: 500 });
  }
}

export async function handleCreatePlan(
  gateway: FirestoreGateway,
  caller: Caller | null,
  body: unknown,
): Promise<NextResponse> {
  const denied = requireAdmin(caller);
  if (denied) return denied;
  try {
    const result = await createSubscriptionPlan(
      new FirestoreSubscriptionRepository(gateway),
      body,
    );
    if (!result.ok) return domainErrorResponse(result.error, 'Failed to create subscription plan');
    const input = (body ?? {}) as Record<string, unknown>;
    return NextResponse.json(
      {
        plan: {
          id: result.value.id,
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    return NextResponse.json({ error: 'Failed to create subscription plan' }, { status: 500 });
  }
}

export async function handleUpdatePlan(
  gateway: FirestoreGateway,
  caller: Caller | null,
  id: string | null,
  body: unknown,
): Promise<NextResponse> {
  const denied = requireAdmin(caller);
  if (denied) return denied;
  try {
    const result = await updateSubscriptionPlan(
      new FirestoreSubscriptionRepository(gateway),
      id,
      body,
    );
    if (!result.ok) return domainErrorResponse(result.error, 'Failed to update subscription plan');
    return NextResponse.json({ message: 'Plan actualizado exitosamente', id: result.value.id }, { status: 200 });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    return NextResponse.json({ error: 'Failed to update subscription plan' }, { status: 500 });
  }
}

export async function handleDeletePlan(
  gateway: FirestoreGateway,
  caller: Caller | null,
  id: string | null,
): Promise<NextResponse> {
  const denied = requireAdmin(caller);
  if (denied) return denied;
  try {
    const result = await deleteSubscriptionPlan(new FirestoreSubscriptionRepository(gateway), id);
    if (!result.ok) return domainErrorResponse(result.error, 'Failed to delete subscription plan');
    return NextResponse.json({ message: 'Plan eliminado exitosamente', id: result.value.id }, { status: 200 });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    return NextResponse.json({ error: 'Failed to delete subscription plan' }, { status: 500 });
  }
}

export async function handlePublicPlans(
  gateway: FirestoreGateway,
  _caller: Caller | null,
): Promise<NextResponse> {
  try {
    const result = await listPublicPlans(new FirestoreSubscriptionRepository(gateway));
    if (!result.ok) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    console.log(`[API_PLANS_DEBUG] Found in subscriptionPlans: ${result.value.debug.camelCaseSize}`);
    console.log(`[API_PLANS_DEBUG] Found in subscription-plans: ${result.value.debug.kebabCaseSize}`);
    return NextResponse.json({ plans: result.value.plans, debug: result.value.debug });
  } catch (error) {
    console.error('[API_PLANS_ERROR]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function handleListTutorSubscriptions(
  gateway: FirestoreGateway,
  caller: Caller | null,
): Promise<NextResponse> {
  const denied = requireAdmin(caller);
  if (denied) return denied;
  try {
    const result = await listTutorSubscriptions(
      new FirestoreSubscriptionRepository(gateway),
      {},
    );
    if (!result.ok) {
      return NextResponse.json({ error: 'Failed to fetch tutors subscriptions' }, { status: 500 });
    }
    return NextResponse.json(result.value);
  } catch (error) {
    console.error('Error fetching tutors subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch tutors subscriptions' }, { status: 500 });
  }
}

export async function handleGetTutorSubscription(
  gateway: FirestoreGateway,
  caller: Caller | null,
  tutorId: string,
): Promise<NextResponse> {
  const denied = requireAdmin(caller);
  if (denied) return denied;
  try {
    const result = await getTutorSubscriptionDetail(
      new FirestoreSubscriptionRepository(gateway),
      { tutorId },
    );
    if (!result.ok) return domainErrorResponse(result.error, 'Failed to fetch tutor subscription');
    return NextResponse.json(result.value);
  } catch (error) {
    console.error('Error fetching tutor subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch tutor subscription' }, { status: 500 });
  }
}

export async function handleUpdateTutorSubscription(
  gateway: FirestoreGateway,
  caller: Caller | null,
  tutorId: string,
  body: unknown,
): Promise<NextResponse> {
  const denied = requireAdmin(caller);
  if (denied) return denied;
  try {
    const result = await updateTutorSubscription(new FirestoreSubscriptionRepository(gateway), {
      tutorId,
      data: body,
    });
    if (!result.ok) return domainErrorResponse(result.error, 'Failed to update subscription');
    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: result.value.subscription,
    });
  } catch (error) {
    console.error('Error updating tutor subscription:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
