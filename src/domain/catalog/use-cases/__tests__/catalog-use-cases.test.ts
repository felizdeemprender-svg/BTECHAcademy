/**
 * F1.2 (TDD rojo) — Use-cases de catálogo con repos falsos.
 * Réplica 1:1 la lógica de los routes legacy; casos borde:
 * promo vencida/futura, referidoId excluido, tutor enterprise excluido,
 * suscripción inactiva excluida, curso sin salesPage, price==0 vs >0,
 * category/level/search, sorts y paginación.
 */
import { describe, expect, it } from 'vitest';

import type {
  CatalogDoc,
  MarketplacePriceFilter,
  MarketplaceRepository,
} from '../../marketplace-repository';
import { createCourse } from '../create-course';
import { listTutorCatalog } from '../list-tutor-catalog';
import { getMarketplace } from '../get-marketplace';
import { getMarketplaceCatalog } from '../get-marketplace-catalog';

type Store = Record<string, Record<string, Record<string, unknown>>>;

function doc(id: string, data: Record<string, unknown>): CatalogDoc {
  return { id, data };
}

/** Falso que replica la semántica servidor de Firestore para la base de cursos. */
class FakeMarketplaceRepo implements MarketplaceRepository {
  failMentors = false;

  constructor(private readonly store: Store) {}

  async listMarketplaceCourses(price: MarketplacePriceFilter, limit: number): Promise<CatalogDoc[]> {
    return Object.entries(this.store.courses ?? {})
      .filter(([, c]) => c.isActive === true && c.status === 'published' && c.publicListing === true)
      .filter(([, c]) => {
        if (price === 'free') return (c.price as number) === 0;
        if (price === 'paid') return ((c.price as number) ?? 0) > 0;
        return true;
      })
      .slice(0, limit)
      .map(([id, data]) => doc(id, data));
  }

  async listActiveSalesPages(): Promise<CatalogDoc[]> {
    return Object.entries(this.store.salesPages ?? {})
      .filter(([, s]) => s.isActive === true)
      .map(([id, data]) => doc(id, data));
  }

  async listSalesPagesByMentorActive(mentorId: string): Promise<CatalogDoc[]> {
    return Object.entries(this.store.salesPages ?? {})
      .filter(([, s]) => s.mentorId === mentorId && s.isActive === true)
      .map(([id, data]) => doc(id, data));
  }

  async getSalesPageById(id: string): Promise<CatalogDoc | null> {
    const raw = this.store.salesPages?.[id];
    return raw === undefined ? null : doc(id, raw);
  }

  async findSalesPageByMentorAndSlug(mentorId: string, slug: string): Promise<CatalogDoc | null> {
    const found = Object.entries(this.store.salesPages ?? {}).find(
      ([, s]) => s.mentorId === mentorId && s.slug === slug,
    );
    return found === undefined ? null : doc(found[0], found[1]);
  }

  async findSalesPageBySlug(slug: string): Promise<CatalogDoc | null> {
    const found = Object.entries(this.store.salesPages ?? {}).find(([, s]) => s.slug === slug);
    return found === undefined ? null : doc(found[0], found[1]);
  }

  async listCoursesByIds(ids: readonly string[]): Promise<CatalogDoc[]> {
    return ids
      .map((id) => {
        const raw = this.store.courses?.[id];
        return raw === undefined ? null : doc(id, raw);
      })
      .filter((d): d is CatalogDoc => d !== null);
  }

  async listTagsByIds(ids: readonly string[]): Promise<CatalogDoc[]> {
    return ids
      .map((id) => {
        const raw = this.store.tags?.[id];
        return raw === undefined ? null : doc(id, raw);
      })
      .filter((d): d is CatalogDoc => d !== null);
  }

  async findTutorById(id: string): Promise<CatalogDoc | null> {
    const raw = this.store.users?.[id];
    return raw === undefined ? null : doc(id, raw);
  }

  async listTutorsByIds(ids: readonly string[]): Promise<CatalogDoc[]> {
    return ids
      .map((id) => {
        const raw = this.store.users?.[id];
        return raw === undefined ? null : doc(id, raw);
      })
      .filter((d): d is CatalogDoc => d !== null);
  }

  async listActiveCourses(): Promise<CatalogDoc[]> {
    return Object.entries(this.store.courses ?? {})
      .filter(([, c]) => c.isActive === true)
      .map(([id, data]) => doc(id, data));
  }

  async listMentors(): Promise<CatalogDoc[]> {
    if (this.failMentors) throw new Error('permission-denied');
    return Object.entries(this.store.users ?? {})
      .filter(([, u]) => Array.isArray(u.roles) && (u.roles as unknown[]).includes('mentor'))
      .map(([id, data]) => doc(id, data));
  }

  async listCategoriesRaw(): Promise<CatalogDoc[]> {
    return Object.entries(this.store.categories ?? {})
      .map(([id, data]) => doc(id, data))
      .sort((a, b) => String(a.data.name ?? '').localeCompare(String(b.data.name ?? '')));
  }

  async listLevelsRaw(): Promise<CatalogDoc[]> {
    return Object.entries(this.store.levels ?? {})
      .map(([id, data]) => doc(id, data))
      .sort((a, b) => Number(a.data.order ?? 0) - Number(b.data.order ?? 0));
  }
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-15T12:00:00.000Z');
const ts = (d: Date) => ({ toDate: () => d });

function marketplaceStore(): Store {
  return {
    courses: {
      cFree: {
        mentorId: 'm1', title: 'Yoga Gratis', description: 'Respira y estira', price: 0,
        currency: 'USD', duration: 60, level: 'beginner', tagIds: ['t1'], slug: 'yoga-gratis',
        thumbnail: 'https://img/1.png', rating: 4.8, studentsCount: 120,
        status: 'published', isActive: true, publicListing: true,
        createdAt: ts(new Date('2026-06-10T00:00:00.000Z')),
      },
      cPaid: {
        mentorId: 'm2', title: 'Negocios Pro', description: 'Vende más', price: 99,
        currency: 'USD', duration: 120, level: 'advanced', tagIds: ['t2'],
        status: 'published', isActive: true, publicListing: true, rating: 4.9, studentsCount: 300,
        createdAt: ts(new Date('2026-06-12T00:00:00.000Z')),
      },
      cEnterprise: {
        mentorId: 'm3', title: 'Corp Elite', description: 'Solo empresas', price: 500,
        level: 'advanced', tagIds: ['t2'], status: 'published', isActive: true,
        publicListing: true, createdAt: ts(new Date('2026-06-11T00:00:00.000Z')),
      },
      cInactiveSub: {
        mentorId: 'm4', title: 'Abandonado', description: 'Sin sub', price: 20,
        level: 'beginner', tagIds: [], status: 'published', isActive: true,
        publicListing: true, createdAt: ts(new Date('2026-06-09T00:00:00.000Z')),
      },
      cOrphan: {
        mentorId: 'm1', title: 'Sin Landing', description: 'Nadie lo ve', price: 10,
        level: 'beginner', tagIds: [], status: 'published', isActive: true,
        publicListing: true, createdAt: ts(new Date('2026-06-08T00:00:00.000Z')),
      },
      cExpired: {
        mentorId: 'm1', title: 'Promo Vencida', description: 'Ya pasó', price: 30,
        level: 'beginner', tagIds: [], status: 'published', isActive: true,
        publicListing: true, createdAt: ts(new Date('2026-06-07T00:00:00.000Z')),
      },
      cFuture: {
        mentorId: 'm1', title: 'Promo Futura', description: 'Todavía no', price: 40,
        level: 'beginner', tagIds: [], status: 'published', isActive: true,
        publicListing: true, createdAt: ts(new Date('2026-06-06T00:00:00.000Z')),
      },
      cReferral: {
        mentorId: 'm1', title: 'De Influencer', description: 'Referido', price: 25,
        level: 'beginner', tagIds: [], status: 'published', isActive: true,
        publicListing: true, createdAt: ts(new Date('2026-06-05T00:00:00.000Z')),
      },
    },
    salesPages: {
      spFree: { mentorId: 'm1', courseId: 'cFree', isActive: true, landingType: 'general' },
      spPaid: { mentorId: 'm2', courseId: 'cPaid', isActive: true, landingType: 'general' },
      spEnterprise: { mentorId: 'm3', courseId: 'cEnterprise', isActive: true, landingType: 'general' },
      spInactiveSub: { mentorId: 'm4', courseId: 'cInactiveSub', isActive: true, landingType: 'general' },
      spExpired: {
        mentorId: 'm1', courseId: 'cExpired', isActive: true, landingType: 'promocion',
        activeFrom: ts(new Date(NOW.getTime() - 10 * DAY)),
        activeUntil: ts(new Date(NOW.getTime() - 1 * DAY)),
      },
      spFuture: {
        mentorId: 'm1', courseId: 'cFuture', isActive: true, landingType: 'promocion',
        activeFrom: ts(new Date(NOW.getTime() + 1 * DAY)),
        activeUntil: ts(new Date(NOW.getTime() + 10 * DAY)),
      },
      spReferral: { mentorId: 'm1', courseId: 'cReferral', isActive: true, referidoId: 'inf1' },
    },
    users: {
      m1: {
        username: 'ana', displayName: 'Ana López', email: 'ana@x.com', photoURL: 'https://img/ana.png',
        subscription: { status: 'active', plan: 'pro' },
        publicProfile: { enabled: true, showStats: true, showContact: false },
      },
      m2: {
        displayName: 'Beto Ruiz', email: 'beto@x.com',
        subscription: { status: 'active', plan: 'pro' },
      },
      m3: {
        displayName: 'Corp', email: 'corp@x.com',
        subscription: { status: 'active', plan: 'empresa', isEnterprise: true },
      },
      m4: {
        displayName: 'Caído', email: 'caido@x.com',
        subscription: { status: 'past_due', plan: 'pro' },
      },
    },
    tags: {
      t1: { name: 'Yoga' },
      t2: { name: 'Negocios' },
    },
    categories: {},
    levels: {},
  };
}

describe('createCourse', () => {
  function deps(overrides: {
    author?: { isAdmin: boolean; subscription?: { endDate?: unknown; maxSimultaneousCourses?: number } } | null;
    activeCount?: number;
  } = {}) {
    const written: { id: string; doc: Record<string, unknown> }[] = [];
    return {
      written,
      authorSource: { findAuthor: async () => overrides.author ?? null },
      counter: { countActiveCoursesByMentor: async () => overrides.activeCount ?? 0 },
      writer: {
        createCourse: async (doc: { id: string; mentorId: string; data: Record<string, unknown> }) => {
          written.push({ id: doc.id, doc: { ...doc.data, id: doc.id, mentorId: doc.mentorId } });
        },
      },
    };
  }

  it('400 si faltan mentorId o id', async () => {
    const d = deps({ author: { isAdmin: true } });
    const r1 = await createCourse(d, { id: 'c1', courseData: {} });
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error.code).toBe('VALIDATION');
    const r2 = await createCourse(d, { mentorId: 'm1', courseData: {} });
    expect(r2.ok).toBe(false);
    expect(d.written).toHaveLength(0);
  });

  it('404 si el usuario no existe', async () => {
    const d = deps({ author: null });
    const r = await createCourse(d, { mentorId: 'ghost', id: 'c1', courseData: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('NOT_FOUND');
      expect(r.error.message).toBe('User not found');
    }
  });

  it('403 si la suscripción falta o está vencida', async () => {
    const expired = deps({ author: { isAdmin: false, subscription: { endDate: '2020-01-01' } } });
    const r1 = await createCourse(expired, { mentorId: 'm1', id: 'c1', courseData: {} });
    expect(r1.ok).toBe(false);
    if (!r1.ok) {
      expect(r1.error.code).toBe('FORBIDDEN');
      expect(r1.error.message).toBe('Valid subscription required');
    }
    const missing = deps({ author: { isAdmin: false } });
    const r2 = await createCourse(missing, { mentorId: 'm1', id: 'c1', courseData: {} });
    expect(r2.ok).toBe(false);
  });

  it('403 con mensaje de límite al alcanzar maxSimultaneousCourses', async () => {
    const d = deps({
      author: { isAdmin: false, subscription: { endDate: '2030-01-01', maxSimultaneousCourses: 2 } },
      activeCount: 2,
    });
    const r = await createCourse(d, { mentorId: 'm1', id: 'c1', courseData: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('FORBIDDEN');
      expect(r.error.message).toBe('Course limit reached');
      expect(r.error.details).toEqual({ message: 'Limit of 2 active courses reached.' });
    }
    expect(d.written).toHaveLength(0);
  });

  it('admin omite suscripción y límite; escribe el doc y devuelve el id', async () => {
    const d = deps({ author: { isAdmin: true }, activeCount: 99 });
    const r = await createCourse(d, { mentorId: 'm1', id: 'c1', courseData: { title: 'T' } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ id: 'c1' });
    expect(d.written).toHaveLength(1);
    expect(d.written[0]).toMatchObject({ id: 'c1', doc: { title: 'T', id: 'c1', mentorId: 'm1' } });
  });

  it('mentor con cupo escribe el doc', async () => {
    const d = deps({
      author: { isAdmin: false, subscription: { endDate: '2030-01-01', maxSimultaneousCourses: 5 } },
      activeCount: 1,
    });
    const r = await createCourse(d, { mentorId: 'm1', id: 'c1', courseData: {} });
    expect(r.ok).toBe(true);
    expect(d.written).toHaveLength(1);
  });
});

describe('listTutorCatalog', () => {
  it('vacío cuando el tutor no tiene salesPages activas', async () => {
    const repo = new FakeMarketplaceRepo(marketplaceStore());
    const r = await listTutorCatalog(repo, { tutorId: 'ghost' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ courses: [], total: 0 });
  });

  it('enriquece landings con curso, tags y orden desc', async () => {
    const repo = new FakeMarketplaceRepo(marketplaceStore());
    const r = await listTutorCatalog(repo, { tutorId: 'm1' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // m1: spFree(cFree), spExpired(cExpired), spFuture(cFuture), spReferral(cReferral)
    // Nota: esta ruta NO filtra ventana promocional (igual que el legacy).
    expect(r.value.total).toBe(4);
    expect(r.value.courses[0].id).toBe('cFree');
    expect(r.value.courses[0]).toMatchObject({
      salesPageId: 'spFree',
      slug: 'yoga-gratis',
      title: 'Yoga Gratis',
      price: 0,
      tags: ['Yoga'],
    });
  });

  it('filtra no publicados y publicListing===false', async () => {
    const store = marketplaceStore();
    store.courses.cFree.status = 'draft';
    store.courses.cExpired.publicListing = false;
    const repo = new FakeMarketplaceRepo(store);
    const r = await listTutorCatalog(repo, { tutorId: 'm1' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.value.courses.map((c) => c.id);
    expect(ids).not.toContain('cFree');
    expect(ids).not.toContain('cExpired');
  });

  it('acepta approved como publicado y prefiere precio de la salesPage', async () => {
    const store = marketplaceStore();
    store.courses.cFree.status = 'approved';
    store.salesPages.spFree.price = 7;
    const repo = new FakeMarketplaceRepo(store);
    const r = await listTutorCatalog(repo, { tutorId: 'm1' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const free = r.value.courses.find((c) => c.id === 'cFree');
    expect(free?.price).toBe(7);
  });

  it('VALIDATION con tutorId vacío', async () => {
    const repo = new FakeMarketplaceRepo(marketplaceStore());
    const r = await listTutorCatalog(repo, { tutorId: '  ' });
    expect(r.ok).toBe(false);
  });
});

describe('getMarketplace (courses/marketplace)', () => {
  it('excluye promo vencida/futura, referido, enterprise, sub inactiva y sin salesPage', async () => {
    const repo = new FakeMarketplaceRepo(marketplaceStore());
    const r = await getMarketplace(repo, { limit: 12, now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.value.courses.map((c) => c.id).sort();
    expect(ids).toEqual(['cFree', 'cPaid']);
    expect(r.value.pagination).toMatchObject({ page: 1, limit: 12, total: 2, hasMore: false });
  });

  it('price free vs paid', async () => {
    const repo = new FakeMarketplaceRepo(marketplaceStore());
    const free = await getMarketplace(repo, { price: 'free', limit: 12, now: NOW });
    if (!free.ok) return;
    expect(free.value.courses.map((c) => c.id)).toEqual(['cFree']);
    const paid = await getMarketplace(repo, { price: 'paid', limit: 12, now: NOW });
    if (!paid.ok) return;
    expect(paid.value.courses.map((c) => c.id)).toEqual(['cPaid']);
  });

  it('filtros category/level/search en memoria', async () => {
    const repo = new FakeMarketplaceRepo(marketplaceStore());
    const byCat = await getMarketplace(repo, { category: 'yoga', limit: 12, now: NOW });
    if (!byCat.ok) return;
    expect(byCat.value.courses.map((c) => c.id)).toEqual(['cFree']);
    const byLevel = await getMarketplace(repo, { level: 'Advanced', limit: 12, now: NOW });
    if (!byLevel.ok) return;
    expect(byLevel.value.courses.map((c) => c.id)).toEqual(['cPaid']);
    const bySearch = await getMarketplace(repo, { search: 'vende', limit: 12, now: NOW });
    if (!bySearch.ok) return;
    expect(bySearch.value.courses.map((c) => c.id)).toEqual(['cPaid']);
    const byTutor = await getMarketplace(repo, { search: 'ana lópez', limit: 12, now: NOW });
    if (!byTutor.ok) return;
    expect(byTutor.value.courses.map((c) => c.id)).toEqual(['cFree']);
  });

  it('sorts y paginación hasMore', async () => {
    const repo = new FakeMarketplaceRepo(marketplaceStore());
    const rating = await getMarketplace(repo, { sortBy: 'rating', limit: 12, now: NOW });
    if (!rating.ok) return;
    expect(rating.value.courses.map((c) => c.id)).toEqual(['cPaid', 'cFree']);
    const priceLow = await getMarketplace(repo, { sortBy: 'price_low', limit: 12, now: NOW });
    if (!priceLow.ok) return;
    expect(priceLow.value.courses.map((c) => c.id)).toEqual(['cFree', 'cPaid']);
    const newest = await getMarketplace(repo, { sortBy: 'newest', limit: 12, now: NOW });
    if (!newest.ok) return;
    expect(newest.value.courses.map((c) => c.id)).toEqual(['cPaid', 'cFree']);
    const one = await getMarketplace(repo, { limit: 1, now: NOW });
    if (!one.ok) return;
    // El limit recorta la base ANTES del enriquecimiento (igual que el legacy).
    expect(one.value.courses).toHaveLength(1);
    expect(one.value.pagination).toMatchObject({ total: 1, hasMore: true });
  });

  it('enriquecimiento del tutor con defaults legacy', async () => {
    const repo = new FakeMarketplaceRepo(marketplaceStore());
    const r = await getMarketplace(repo, { limit: 12, now: NOW });
    if (!r.ok) return;
    const paid = r.value.courses.find((c) => c.id === 'cPaid');
    // m2 no tiene username ni photoURL: defaults legacy.
    expect(paid?.tutor).toMatchObject({
      id: 'm2',
      username: 'beto-ruiz',
      displayName: 'Beto Ruiz',
      photo: 'https://loremflickr.com/60/60/person,professional?lock=m2',
    });
    expect(paid?.pricing).toEqual({ type: 'paid', amount: 99, currency: 'USD' });
    const free = r.value.courses.find((c) => c.id === 'cFree');
    expect(free?.pricing).toEqual({ type: 'free', amount: 0, currency: 'USD' });
    expect(free?.tags).toEqual(['Yoga']);
  });
});

describe('getMarketplaceCatalog (api/marketplace)', () => {
  function catalogStore(): Store {
    return {
      courses: {
        c1: { title: 'Uno', status: 'published', isActive: true, price: 10, currency: 'USD' },
        cDraft: { title: 'Borrador', status: 'draft', isActive: true, price: 5 },
      },
      salesPages: {
        spGeneral: { mentorId: 'm1', courseId: 'c1', title: 'General', price: 10, isActive: true, landingType: 'general', slug: 'uno' },
        spPromo: { mentorId: 'm1', courseId: 'c1', title: 'Promo', price: 5, isActive: true, landingType: 'promocion', slug: 'uno-promo',
          activeFrom: ts(new Date(NOW.getTime() - DAY)), activeUntil: ts(new Date(NOW.getTime() + DAY)) },
        spOld: { mentorId: 'm1', courseId: 'c1', title: 'Vieja', price: 1, isActive: true, landingType: 'promocion',
          activeUntil: ts(new Date(NOW.getTime() - DAY)) },
        spRef: { mentorId: 'm1', courseId: 'c1', title: 'Ref', price: 1, isActive: true, referidoId: 'inf1' },
      },
      users: {
        m1: { displayName: 'Ana', email: 'ana@x.com', photoURL: 'https://img/a.png', roles: ['mentor'], subscription: { status: 'active' } },
      },
      tags: {},
      categories: { cat1: { name: 'Arte' } },
      levels: { l1: { name: 'Inicial', order: 0 } },
    };
  }

  it('devuelve marketplace + categories + levels + timestamp', async () => {
    const repo = new FakeMarketplaceRepo(catalogStore());
    const r = await getMarketplaceCatalog(repo, { now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // general + promo válida (la vencida y la de referido se excluyen).
    expect(r.value.marketplace).toHaveLength(2);
    expect(r.value.categories).toEqual([{ id: 'cat1', name: 'Arte' }]);
    expect(r.value.levels).toEqual([{ id: 'l1', name: 'Inicial', order: 0 }]);
    expect(typeof r.value.timestamp).toBe('string');
    const promo = (r.value.marketplace as { title: string; price: number }[]).find((m) => m.title === 'Promo');
    expect(promo?.price).toBe(5);
  });

  it('mentor fallback Tutor BTECH si falta el doc', async () => {
    const store = catalogStore();
    delete store.users.m1;
    const repo = new FakeMarketplaceRepo(store);
    const r = await getMarketplaceCatalog(repo, { now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const first = (r.value.marketplace as { tutor: { displayName: string } }[])[0];
    expect(first.tutor.displayName).toBe('Tutor BTECH');
  });

  it('fabrica mentores mock si listMentors falla (fallback local legacy)', async () => {
    const store = catalogStore();
    const repo = new FakeMarketplaceRepo(store);
    repo.failMentors = true;
    const r = await getMarketplaceCatalog(repo, { now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.marketplace.length).toBeGreaterThan(0);
  });
});
