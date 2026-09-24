/**
 * Catálogo — Caso de uso: marketplace paginado (`api/courses/marketplace`).
 * Réplica 1:1 del route legacy (~186 líneas): base de cursos con limit
 * aplicado ANTES del enriquecimiento, salesPages activas con ventana
 * promocional (semántica toDate-only), tutores `in [...30]` +
 * `subscription.status==active` excluyendo `isEnterprise`, filtros en
 * memoria (category/level/search), sorts y paginación legacy.
 */
import { z } from 'zod';

import { err, ok, type Result } from '@/domain/shared/result';
import { unavailable, type DomainError } from '@/domain/shared/errors';
import { toDomainDate } from '@/domain/shared/firestore-mapping';

import type { MarketplaceRepository } from '../marketplace-repository';
import { isSalesPageDateValid } from '../promo-window';

const finiteOr = (def: number) =>
  z.preprocess(
    (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : def),
    z.number(),
  );

const GetMarketplaceInputSchema = z.object({
  category: z.string().default('Todos'),
  level: z.string().default('Todos'),
  price: z.string().default('all'),
  sortBy: z.string().default('relevance'),
  search: z.string().default(''),
  page: finiteOr(1),
  limit: finiteOr(12),
  now: z.date().optional(),
});

export type GetMarketplaceInput = z.infer<typeof GetMarketplaceInputSchema>;

export interface MarketplaceTutor {
  readonly id: string;
  readonly username: string | undefined;
  readonly displayName: string;
  readonly photo: string;
  readonly subscription: unknown;
  readonly publicProfile: unknown;
}

export interface MarketplaceEntry {
  readonly id: string;
  readonly slug: string | undefined;
  readonly title: string;
  readonly description: string;
  readonly price: number;
  readonly currency: string;
  readonly duration: number;
  readonly level: string;
  readonly tags: string[];
  readonly thumbnail: string;
  readonly rating: number;
  readonly students: number;
  readonly tutor: MarketplaceTutor | null;
  readonly createdAt: Date;
  readonly pricing: { readonly type: string; readonly amount: number; readonly currency: string };
}

export interface MarketplacePagination {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly hasMore: boolean;
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

export async function getMarketplace(
  repo: MarketplaceRepository,
  input: unknown,
): Promise<Result<{ courses: MarketplaceEntry[]; pagination: MarketplacePagination }, DomainError>> {
  const parsed = GetMarketplaceInputSchema.safeParse(input ?? {});
  const args = parsed.success
    ? parsed.data
    : { category: 'Todos', level: 'Todos', price: 'all', sortBy: 'relevance', search: '', page: 1, limit: 12 as number, now: undefined };
  const priceFilter = args.price === 'free' || args.price === 'paid' ? args.price : 'all';
  const now = args.now ?? new Date();
  try {
    const coursesSnapshot = await repo.listMarketplaceCourses(priceFilter, args.limit);

    const salesPagesSnapshot = await repo.listActiveSalesPages();
    const validSalesPages = salesPagesSnapshot.filter((d) => {
      const data = d.data;
      if (data.referidoId) return false;
      return isSalesPageDateValid(data.landingType, data.activeFrom, data.activeUntil, now, true);
    });
    const activeCourseIds = new Set(
      validSalesPages.map((d) => str(d.data.courseId)).filter((v): v is string => Boolean(v)),
    );

    const initialTutorIds = coursesSnapshot
      .map((d) => str(d.data.mentorId))
      .filter((v): v is string => Boolean(v));
    const uniqueTutorIds = Array.from(new Set(initialTutorIds));

    let allowedTutorIds: string[] = [];
    if (uniqueTutorIds.length > 0) {
      // Igual que el legacy: `documentId in [...30]` + status==active en
      // servidor; el repo devuelve por ids y aquí se aplican ambos filtros
      // (mismo conjunto resultado).
      const tutors = await repo.listTutorsByIds(uniqueTutorIds.slice(0, 30));
      allowedTutorIds = tutors
        .filter((t) => {
          const sub = t.data.subscription as { status?: unknown; isEnterprise?: unknown } | undefined;
          return sub?.status === 'active';
        })
        .filter((t) => {
          const sub = t.data.subscription as { isEnterprise?: unknown } | undefined;
          return sub?.isEnterprise !== true;
        })
        .map((t) => t.id);
    }

    const enriched: MarketplaceEntry[] = [];
    for (const courseDoc of coursesSnapshot) {
      const course = courseDoc.data;
      const hasActiveSalesPage = activeCourseIds.has(courseDoc.id);
      const mentorId = str(course.mentorId);
      const isAllowedTutor = !mentorId || allowedTutorIds.includes(mentorId);
      if (!hasActiveSalesPage || !isAllowedTutor) continue;

      let tutorData: MarketplaceTutor | null = null;
      if (mentorId) {
        const tutorDoc = await repo.findTutorById(mentorId);
        if (tutorDoc) {
          const tutor = tutorDoc.data;
          const displayName = str(tutor.displayName);
          tutorData = {
            id: mentorId,
            username: str(tutor.username) ?? (displayName ? slugify(displayName) : undefined),
            displayName: displayName ?? (str(tutor.email)?.split('@')[0] as string),
            photo: str(tutor.photoURL) ?? `https://loremflickr.com/60/60/person,professional?lock=${mentorId}`,
            subscription: tutor.subscription ?? { status: 'inactive', plan: 'free' },
            publicProfile:
              tutor.publicProfile ?? { enabled: true, showStats: true, showContact: false },
          };
        }
      }

      let tags: string[] = [];
      const tagIds = Array.isArray(course.tagIds) ? (course.tagIds as unknown[]) : [];
      // Igual que el legacy: `documentId in tagIds` sin corte (el `in`
      // nativo fallaría con >10; aquí se resuelve sin ese límite técnico).
      if (tagIds.length > 0) {
        const stringIds = tagIds.filter((t): t is string => typeof t === 'string');
        const tagsSnapshot = await repo.listTagsByIds(stringIds);
        tags = tagsSnapshot.map((tagDoc) => tagDoc.data.name as string);
      }

      const title = str(course.title);
      const rawPrice = course.price as number | undefined;
      enriched.push({
        id: courseDoc.id,
        slug: str(course.slug) ?? (title ? slugify(title) : undefined),
        title: title ?? 'Sin título',
        description: str(course.description) ?? 'Sin descripción',
        price: num(course.price, 0),
        currency: str(course.currency) ?? 'USD',
        duration: num(course.duration, 0),
        level: str(course.level) ?? 'beginner',
        tags,
        thumbnail:
          str(course.thumbnail) ??
          `https://loremflickr.com/600/400/education,course?lock=${courseDoc.id}`,
        rating: num(course.rating, 4.5),
        students: num(course.studentsCount, 0),
        tutor: tutorData,
        createdAt: toDomainDate(course.createdAt as never) ?? new Date(),
        pricing: {
          // Quirk legacy preservado: el tipo mira el crudo (`undefined`
          // → 'paid'), el monto usa `|| 0`.
          type: rawPrice === 0 ? 'free' : 'paid',
          amount: (course.price as number) || 0,
          currency: str(course.currency) ?? 'USD',
        },
      });
    }

    let finalCourses = enriched;
    if (args.category !== 'Todos') {
      finalCourses = finalCourses.filter((course) =>
        course.tags.some((tag) => tag.toLowerCase().includes(args.category.toLowerCase())),
      );
    }
    if (args.level !== 'Todos') {
      finalCourses = finalCourses.filter((course) => course.level === args.level.toLowerCase());
    }
    if (args.search) {
      finalCourses = finalCourses.filter(
        (course) =>
          course.title.toLowerCase().includes(args.search.toLowerCase()) ||
          course.description.toLowerCase().includes(args.search.toLowerCase()) ||
          course.tutor?.displayName?.toLowerCase().includes(args.search.toLowerCase()),
      );
    }

    switch (args.sortBy) {
      case 'newest':
        finalCourses.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        break;
      case 'rating':
        finalCourses.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'price_low':
        finalCourses.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_high':
        finalCourses.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'students':
        finalCourses.sort((a, b) => (b.students || 0) - (a.students || 0));
        break;
      default:
        finalCourses.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        break;
    }

    return ok({
      courses: finalCourses,
      pagination: {
        page: args.page,
        limit: args.limit,
        total: finalCourses.length,
        hasMore: finalCourses.length === args.limit,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(unavailable(message));
  }
}
