/**
 * Catálogo — Caso de uso: catálogo comercial (`api/marketplace`).
 * Réplica exacta del route legacy (rama Admin/producción): lee courses
 * activos, salesPages activas, mentores (`roles array-contains`), categorías
 * y niveles ordenados; filtra publicados/aprobados, excluye referidoId,
 * ventana promocional con soporte `.toDate()` O `{ seconds }`, y enriquece
 * cada landing válida (TODAS, no una por curso) con overrides de la
 * salesPage. Incluye el fallback local legacy: si la lectura de mentores
 * falla (permisos en dev), fabrica perfiles `Tutor BTECH` en memoria.
 */
import { err, ok, type Result } from '@/domain/shared/result';
import { unavailable, type DomainError } from '@/domain/shared/errors';

import type { CatalogDoc, MarketplaceRepository } from '../marketplace-repository';
import { isSalesPageDateValid } from '../promo-window';

export interface MarketplaceCatalogItem {
  readonly [key: string]: unknown;
}

export interface GetMarketplaceCatalogInput {
  readonly now?: Date;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function mockMentors(courseMentorIds: string[]): Map<string, CatalogDoc> {
  const map = new Map<string, CatalogDoc>();
  for (const mId of courseMentorIds) {
    map.set(mId, {
      id: mId,
      data: {
        id: mId,
        displayName: 'Tutor BTECH',
        email: 'tutor@FastoriaAcademy.ai',
        photoURL: '',
        roles: ['mentor'],
        subscription: { status: 'active' },
      },
    });
  }
  return map;
}

export async function getMarketplaceCatalog(
  repo: MarketplaceRepository,
  input?: GetMarketplaceCatalogInput,
): Promise<
  Result<
    {
      marketplace: MarketplaceCatalogItem[];
      categories: Record<string, unknown>[];
      levels: Record<string, unknown>[];
      timestamp: string;
    },
    DomainError
  >
> {
  const now = input?.now ?? new Date();
  try {
    const coursesData = await repo.listActiveCourses();
    const salesPagesData = await repo.listActiveSalesPages();

    let mentorsMap: Map<string, CatalogDoc>;
    try {
      const mentorsData = await repo.listMentors();
      mentorsMap = new Map(mentorsData.map((m) => [m.id, m]));
    } catch {
      // Fallback local legacy: perfiles simulados desde los mentorIds.
      const uniqueMentorIds = Array.from(
        new Set(
          coursesData.map((c) => str(c.data.mentorId)).filter((v): v is string => Boolean(v)),
        ),
      );
      mentorsMap = mockMentors(uniqueMentorIds);
    }

    const categoriesData = await repo.listCategoriesRaw();
    const levelsData = await repo.listLevelsRaw();

    const coursesMap = new Map<string, CatalogDoc>();
    for (const course of coursesData) {
      if (course.data.status === 'published' || course.data.status === 'approved') {
        coursesMap.set(course.id, course);
      }
    }

    // General primero para que promocion válida la sobreescriba en orden.
    const sortedSalesPages = [...salesPagesData].sort((a, b) => {
      const aType = a.data.landingType;
      const bType = b.data.landingType;
      if (aType === 'promocion' && bType !== 'promocion') return 1;
      if (bType === 'promocion' && aType !== 'promocion') return -1;
      return 0;
    });

    const validSalesPages = sortedSalesPages.filter((sp) => {
      const data = sp.data;
      if (!isSalesPageDateValid(data.landingType, data.activeFrom, data.activeUntil, now, true)) {
        return false;
      }
      if (data.referidoId) {
        return false;
      }
      return Boolean(data.courseId);
    });

    const marketplace = validSalesPages
      .map((salesPage): MarketplaceCatalogItem | null => {
        const sp = salesPage.data;
        const courseId = str(sp.courseId) ?? '';
        const course = coursesMap.get(courseId);
        if (!course) return null;
        const courseData = course.data;
        const mentorId = str(sp.mentorId) ?? str(courseData.mentorId) ?? '';
        const mentor =
          mentorsMap.get(mentorId) ??
          ({
            id: mentorId,
            data: {
              id: mentorId,
              displayName: 'Tutor BTECH',
              photoURL: '',
              subscription: { status: 'active' },
            },
          } satisfies CatalogDoc);
        const mentorData = mentor.data;
        const mentorDisplayName = str(mentorData.displayName);
        const mentorEmail = str(mentorData.email);
        const price = (sp.price as number | undefined) ?? (courseData.price as number | undefined) ?? 0;
        return {
          ...courseData,
          id: course.id,
          title: str(sp.title) ?? str(courseData.title) ?? 'Sin título',
          price,
          salesPageId: salesPage.id,
          salesPageSlug: sp.slug,
          tutor: {
            id: mentor.id,
            displayName: mentorDisplayName ?? mentorEmail?.split('@')[0] ?? 'Mentor',
            photo: str(mentorData.photoURL) ?? '',
            subscription: mentorData.subscription ?? { status: 'active' },
          },
          pricing: {
            // Quirk legacy: `(sp.price ?? course.price) === 0`.
            type: ((sp.price as number | undefined) ?? courseData.price) === 0 ? 'free' : 'paid',
            amount: price,
            currency: str(courseData.currency) ?? 'USD',
          },
        };
      })
      .filter((item): item is MarketplaceCatalogItem => item !== null);

    return ok({
      marketplace,
      categories: categoriesData.map((c) => ({ ...c.data, id: c.id })),
      levels: levelsData.map((l) => ({ ...l.data, id: l.id })),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(unavailable(message));
  }
}
