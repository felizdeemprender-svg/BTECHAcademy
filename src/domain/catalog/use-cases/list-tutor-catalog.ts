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
import { getEffectiveLandingStatus } from '@/domain/sales-pages/landing-lifecycle';

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
    const rawSalesPages = await repo.listSalesPagesByMentorActive(input.tutorId);
    // Filtrar landings de embajadores / afiliados y landings no activas (expiradas o pendientes)
    const nonAffiliateSalesPages = rawSalesPages.filter((sp) => {
      const data = sp.data;
      if (data.referidoId || data.referidoName || data.landingType === 'referral') {
        return false;
      }
      return getEffectiveLandingStatus(data as any) === 'activa';
    });

    // Regla: Exactamente 1 landing vigente por curso/mentoría en el catálogo oficial del tutor
    const authoritativeByProduct = new Map<string, CatalogDoc>();
    for (const sp of nonAffiliateSalesPages) {
      const targetId = str(sp.data.courseId) ?? str(sp.data.productId) ?? sp.id;
      if (!authoritativeByProduct.has(targetId)) {
        authoritativeByProduct.set(targetId, sp);
      } else {
        // Si hay más de una, dar precedencia a la promoción vigente sobre la general
        const current = authoritativeByProduct.get(targetId)!;
        const spIsPromo = sp.data.landingType === 'promocion';
        const currentIsPromo = current.data.landingType === 'promocion';
        if (spIsPromo && !currentIsPromo) {
          authoritativeByProduct.set(targetId, sp);
        }
      }
    }
    const salesPages = Array.from(authoritativeByProduct.values());
    if (salesPages.length === 0) {
      return ok({ courses: [], total: 0 });
    }
    const courseIds = Array.from(
      new Set(
        salesPages
          .map((sp) => str(sp.data.courseId) ?? str(sp.data.productId))
          .filter((v): v is string => Boolean(v)),
      ),
    );
    const coursesMap = new Map<string, CatalogDoc>();
    if (courseIds.length > 0) {
      for (const c of await repo.listCoursesByIds(courseIds.slice(0, 30))) {
        coursesMap.set(c.id, c);
      }
    }

    const missingIds = courseIds.filter((id) => !coursesMap.has(id));
    const followupsMap = new Map<string, CatalogDoc>();
    if (missingIds.length > 0 && repo.listFollowupsByIds) {
      for (const f of await repo.listFollowupsByIds(missingIds.slice(0, 30))) {
        followupsMap.set(f.id, f);
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
        const targetId = str(sp.data.courseId) ?? str(sp.data.productId) ?? '';
        const course = coursesMap.get(targetId);
        const followup = followupsMap.get(targetId);

        if (course) {
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
              str(sp.data.imageUrl) ??
              str(sp.data.thumbnail) ??
              str(data.thumbnail) ??
              `https://loremflickr.com/600/400/education,course?lock=${sp.id}`,
            tags,
            createdAt:
              toDomainDate(sp.data.createdAt as never) ??
              toDomainDate(data.createdAt as never) ??
              new Date(),
          } satisfies TutorCatalogEntry;
        }

        // Si es una mentoría (followup) o landing de producto followup
        const isFollowup = Boolean(followup) || sp.data.productType === 'followup';
        if (isFollowup) {
          const fData = followup?.data ?? {};
          const isPublished = sp.data.status === 'published' || sp.data.isActive === true || fData.status === 'active';
          if (!isPublished) return null;

          const content = sp.data.content as Record<string, unknown> | undefined;
          const sections = Array.isArray(content?.sections) ? (content?.sections as any[]) : [];
          const heroSection = sections.find((s: any) => s.id?.includes('hero') || s.type?.includes('hero'));
          const anyImgSection = sections.find((s: any) => s.imageUrl);

          const title = str(sp.data.title) ?? str(content?.marketingName) ?? str(fData.title) ?? 'Mentoría';
          const description = str(sp.data.description) ?? str(heroSection?.subtitle) ?? str(fData.goal) ?? 'Mentoría personalizada';
          const thumbnail =
            str(sp.data.imageUrl) ??
            str(heroSection?.imageUrl) ??
            str(anyImgSection?.imageUrl) ??
            str(sp.data.thumbnail) ??
            '/assets/presets/02-glass-premium.png';

          return {
            id: followup ? followup.id : sp.id,
            salesPageId: sp.id,
            slug: str(sp.data.slug) ?? slugify(title),
            title,
            description,
            price: num(sp.data.price, 0),
            duration: num(sp.data.duration, num(fData.totalSessions, 1)),
            level: 'Mentoría',
            students: 0,
            rating: 5.0,
            thumbnail,
            tags: ['Mentoría'],
            createdAt: toDomainDate(sp.data.createdAt as never) ?? new Date(),
          } satisfies TutorCatalogEntry;
        }

        return null;
      })
      .filter((e): e is TutorCatalogEntry => e !== null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return ok({ courses: enriched, total: enriched.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(unavailable(message));
  }
}
