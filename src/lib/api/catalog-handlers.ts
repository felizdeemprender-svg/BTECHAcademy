/**
 * API — Handlers testeables de catálogo (F1.2).
 * Rutas PÚBLICAS por contrato legacy: SIN `authenticateCaller` (igual que
 * se hizo en F0.2 con payments): `courses/marketplace`, `marketplace`,
 * `courses/tutor/[tutorId]`, `courses/create` y `courses/free-enrollment`
 * nunca exigieron token. Firma `(gateway, ...args)` como el resto de
 * handlers. Shapes y status codes legacy exactos (sin envelope `{ data }`).
 */
import { NextResponse } from 'next/server';

import { FirestoreCourseRepository } from '@/data/firestore/course-repo';
import { FirestoreMarketplaceRepository } from '@/data/firestore/marketplace-repo';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import { createCourse } from '@/domain/catalog/use-cases/create-course';
import { updateCourse } from '@/domain/catalog/use-cases/update-course';
import { publishCourse } from '@/domain/catalog/use-cases/publish-course';
import { deleteCourse } from '@/domain/catalog/use-cases/delete-course';
import { listTutorCatalog } from '@/domain/catalog/use-cases/list-tutor-catalog';
import { getMarketplace } from '@/domain/catalog/use-cases/get-marketplace';
import { getMarketplaceCatalog } from '@/domain/catalog/use-cases/get-marketplace-catalog';
import { processSuccessfulEnrollment } from '@/lib/payments/enrollment';

/** POST /api/courses/create. Body legacy: { mentorId, id, ...courseData }. */
export async function handleCreateCourse(
  gateway: FirestoreGateway,
  body: unknown,
): Promise<NextResponse> {
  const payload = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const { mentorId, id, ...courseData } = payload;
  const repo = new FirestoreCourseRepository(gateway);
  const result = await createCourse(
    { authorSource: repo, counter: repo, writer: repo },
    { mentorId, id, courseData },
  );
  if (result.ok) {
    return NextResponse.json({ success: true, id: result.value.id });
  }
  const { code, message, details } = result.error;
  if (code === 'VALIDATION') {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (code === 'NOT_FOUND') {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  if (code === 'FORBIDDEN') {
    const extra = (details as { message?: string } | undefined)?.message;
    return NextResponse.json(
      extra === undefined ? { error: message } : { error: message, message: extra },
      { status: 403 },
    );
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

/** PUT /api/courses/[id]. Body legacy: { mentorId, ...courseData }. */
export async function handleUpdateCourse(
  gateway: FirestoreGateway,
  id: string,
  body: unknown,
): Promise<NextResponse> {
  const payload = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const { mentorId, ...courseData } = payload;
  const repo = new FirestoreCourseRepository(gateway);
  const result = await updateCourse(
    { reader: repo, updater: repo },
    { mentorId: mentorId as string, id, courseData },
  );
  if (result.ok) {
    return NextResponse.json({ success: true, id: result.value.id });
  }
  const { code, message } = result.error;
  if (code === 'VALIDATION') return NextResponse.json({ error: message }, { status: 400 });
  if (code === 'NOT_FOUND') return NextResponse.json({ error: message }, { status: 404 });
  if (code === 'FORBIDDEN') return NextResponse.json({ error: message }, { status: 403 });
  return NextResponse.json({ error: message }, { status: 500 });
}

/** POST /api/courses/[id]/publish. Body legacy: { mentorId, status }. */
export async function handlePublishCourse(
  gateway: FirestoreGateway,
  id: string,
  body: unknown,
): Promise<NextResponse> {
  const payload = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const { mentorId, status } = payload;
  const repo = new FirestoreCourseRepository(gateway);
  const result = await publishCourse(
    { reader: repo, updater: repo },
    { mentorId: mentorId as string, id, status: status as 'public' | 'draft' },
  );
  if (result.ok) {
    return NextResponse.json({ success: true, id: result.value.id });
  }
  const { code, message } = result.error;
  if (code === 'VALIDATION') return NextResponse.json({ error: message }, { status: 400 });
  if (code === 'NOT_FOUND') return NextResponse.json({ error: message }, { status: 404 });
  if (code === 'FORBIDDEN') return NextResponse.json({ error: message }, { status: 403 });
  return NextResponse.json({ error: message }, { status: 500 });
}

/** DELETE /api/courses/[id]. Body legacy: { mentorId }. */
export async function handleDeleteCourse(
  gateway: FirestoreGateway,
  id: string,
  body: unknown,
): Promise<NextResponse> {
  const payload = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const { mentorId } = payload;
  const repo = new FirestoreCourseRepository(gateway);
  const result = await deleteCourse(
    { reader: repo, deleter: repo },
    { mentorId: mentorId as string, id },
  );
  if (result.ok) {
    return NextResponse.json({ success: true, id: result.value.id });
  }
  const { code, message } = result.error;
  if (code === 'VALIDATION') return NextResponse.json({ error: message }, { status: 400 });
  if (code === 'NOT_FOUND') return NextResponse.json({ error: message }, { status: 404 });
  if (code === 'FORBIDDEN') return NextResponse.json({ error: message }, { status: 403 });
  return NextResponse.json({ error: message }, { status: 500 });
}

/** GET /api/courses/tutor/[tutorId]. Respuesta legacy: { courses, total }. */
export async function handleListTutorCatalog(
  gateway: FirestoreGateway,
  tutorId: string,
): Promise<NextResponse> {
  const repo = new FirestoreMarketplaceRepository(gateway);
  const result = await listTutorCatalog(repo, { tutorId });
  if (result.ok) {
    return NextResponse.json({ courses: result.value.courses, total: result.value.total });
  }
  return NextResponse.json(
    { error: 'Failed to fetch tutor landings', details: result.error.message },
    { status: 500 },
  );
}

export interface CoursesMarketplaceParams {
  readonly category: string;
  readonly level: string;
  readonly price: string;
  readonly sortBy: string;
  readonly search: string;
  readonly page: number;
  readonly limit: number;
}

/** GET /api/courses/marketplace. Respuesta legacy: { courses, pagination }. */
export async function handleGetMarketplace(
  gateway: FirestoreGateway,
  params: CoursesMarketplaceParams,
  now?: Date,
): Promise<NextResponse> {
  const repo = new FirestoreMarketplaceRepository(gateway);
  const result = await getMarketplace(repo, { ...params, now });
  if (result.ok) {
    return NextResponse.json({ courses: result.value.courses, pagination: result.value.pagination });
  }
  return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
}

/** GET /api/marketplace. Respuesta legacy: { marketplace, categories, levels, timestamp }. */
export async function handleGetMarketplaceCatalog(
  gateway: FirestoreGateway,
  now?: Date,
): Promise<NextResponse> {
  const repo = new FirestoreMarketplaceRepository(gateway);
  const result = await getMarketplaceCatalog(repo, { now });
  if (result.ok) {
    return NextResponse.json({
      marketplace: result.value.marketplace,
      categories: result.value.categories,
      levels: result.value.levels,
      timestamp: result.value.timestamp,
    });
  }
  return NextResponse.json({ error: 'Error al cargar el catálogo' }, { status: 500 });
}

export type FreeEnrollmentFn = (args: {
  paymentId: string;
  externalReference: string;
  status: string;
}) => Promise<{ success: boolean }>;

/** POST /api/courses/free-enrollment. Inscripción gratuita delegada (inyectable en tests). */
export async function handleFreeEnrollment(
  gateway: FirestoreGateway,
  body: unknown,
  enroll: FreeEnrollmentFn = processSuccessfulEnrollment,
): Promise<NextResponse> {
  try {
    const payload = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
    const { pageId, studentEmail } = payload;
    if (!pageId || !studentEmail) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }
    const repo = new FirestoreMarketplaceRepository(gateway);
    const page = await repo.getSalesPageById(String(pageId));
    if (!page) {
      return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 });
    }
    const pageData = page.data;
    // Igual que el legacy: `price !== 0` (incluso undefined) rechaza.
    if (pageData.price !== 0) {
      return NextResponse.json({ error: 'Este curso no es gratuito' }, { status: 403 });
    }
    const externalReference = JSON.stringify({
      pageId,
      studentEmail,
      mentorId: pageData.mentorId,
    });
    const result = await enroll({
      paymentId: `free_${Date.now()}`,
      externalReference,
      status: 'approved',
    });
    if (result.success) {
      return NextResponse.json({ success: true, redirectUrl: '/my-courses' });
    }
    throw new Error('No se pudo procesar la inscripción gratuita');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: message },
      { status: 500 },
    );
  }
}
