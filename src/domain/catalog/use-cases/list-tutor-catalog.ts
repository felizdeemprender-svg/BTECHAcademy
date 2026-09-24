/**
 * Catálogo — Caso de uso: catálogo de un tutor
 * (`api/courses/tutor/[tutorId]`). Réplica exacta del route legacy (rama
 * Admin/producción): landings activas del mentor + cursos por ids (corte
 * 30) + tags por ids (corte 30), filtro publicado/aprobado y
 * `publicListing !== false`, orden descendente por creación.
 * NOTA legacy preservada: NO filtra ventana promocional en esta ruta.
 */
import { err, ok, type Result } from '@/domain/shared/result';
import { unavailable, validationError, type DomainError } from '@/domain/shared/errors';
import { toDomainDate } from '@/domain/shared/firestore-mapping';

import type { CatalogDoc, MarketplaceRepository } from '../marketplace-repository';

export interface TutorCatalogEntry {
  readonly id: string;
  readonly salesPageId: string;
  readonly slug: string | undefined;
  readonly title: string;
  readonly description: string;
  readonly price: number;
  readonly duration: number;
  readonly level: string;
  readonly students: number;
  readonly rating: number;
  readonly thumbnail: string;
  readonly tags: string[];
  readonly createdAt: Date;
}

export interface ListTutorCatalogInput {
  readonly tutorId: string;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}

export async function listTutorCatalog(
  repo: MarketplaceRepository,
  input: ListTutorCatalogInput,
): Promise<Result<{ courses: TutorCatalogEntry[]; total: number }, DomainError>> {
  if (input.tutorId.trim() === '') {
    return err(validationError('tutorId vacío'));
  }
  try {
    const salesPages = await repo.listSalesPagesByMentorActive(input.tutorId);
    if (salesPages.length === 0) {
      return ok({ courses: [], total: 0 });
    }
    const courseIds = Array.from(
      new Set(salesPages.map((sp) => str(sp.data.courseId)).filter((v): v is string => Boolean(v))),
    );
    const coursesMap = new Map<string, CatalogDoc>();
    if (courseIds.length > 0) {
      for (const c of await repo.listCoursesByIds(courseIds.slice(0, 30))) {
        coursesMap.set(c.id, c);
      }
    }
    const allTagIds = Array.from(
      new Set(
        [...coursesMap.values()].flatMap((c) =>
          Array.isArray(c.data.tagIds) ? (c.data.tagIds as unknown[]).filter((t): t is string => typeof t === 'string') : [],
        ),
      ),
    );
    const tagsMap = new Map<string, string>();
    if (allTagIds.length > 0) {
      for (const t of await repo.listTagsByIds(allTagIds.slice(0, 30))) {
        const name = str(t.data.name);
        if (name) tagsMap.set(t.id, name);
      }
    }
    const enriched = salesPages
      .map((sp) => {
        const course = coursesMap.get(str(sp.data.courseId) ?? '');
        if (!course) return null;
        const data = course.data;
        const isPublished = data.status === 'published' || data.status === 'approved';
        const isPublic = data.publicListing !== false;
        if (!isPublished || !isPublic) return null;
        const tagIds = Array.isArray(data.tagIds) ? (data.tagIds as unknown[]) : [];
        const tags = tagIds
          .map((id) => (typeof id === 'string' ? tagsMap.get(id) : undefined))
          .filter((t): t is string => Boolean(t));
        const title = str(sp.data.title) ?? str(data.title) ?? 'Sin título';
        return {
          id: str(data.id) ?? course.id,
          salesPageId: sp.id,
          slug: str(sp.data.slug) ?? str(data.slug) ?? (str(data.title) ? slugify(str(data.title) as string) : undefined),
          title,
          description: str(sp.data.description) ?? str(data.description) ?? 'Sin descripción',
          price: sp.data.price !== undefined ? (sp.data.price as number) : num(data.price, 0),
          duration: num(data.duration, 0),
          level: str(data.level) ?? 'beginner',
          students: num(data.studentsCount, 0),
          rating: num(data.rating, 4.5),
          thumbnail:
            str(sp.data.thumbnail) ??
            str(data.thumbnail) ??
            `https://loremflickr.com/600/400/education,course?lock=${sp.id}`,
          tags,
          createdAt:
            toDomainDate(sp.data.createdAt as never) ??
            toDomainDate(data.createdAt as never) ??
            new Date(),
        } satisfies TutorCatalogEntry;
      })
      .filter((e): e is TutorCatalogEntry => e !== null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return ok({ courses: enriched, total: enriched.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(unavailable(message));
  }
}
