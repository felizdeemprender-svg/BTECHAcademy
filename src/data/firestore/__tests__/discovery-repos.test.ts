/**
 * F1.3 (TDD rojo) — Repos de discovery + aditivos:
 * - marketplace-repo: `findSalesPageByMentorAndSlug` (`salesPages`
 *   mentorId== + slug==, igual que `api/v/resolve` con fallback solo-slug)
 *   y `findSalesPageBySlug` (`salesPages` slug==).
 * - course-repo: `countPublicCoursesByMentor` (`courses` mentorId== +
 *   isActive== + memoria status published/approved + publicListing!==false,
 *   igual que `tutors/[username]/status`).
 * - payment-method-repo: `listActiveTutorMethods` (subcolección
 *   `users/{id}/paymentMethods` con isActive==, igual que payment-options).
 * - track-repo: `recordPageClick` (`salesPages` set merge + increment(1) +
 *   serverTimestamp, igual que `api/track`), con fallback testeado.
 */
import { describe, expect, it } from 'vitest';

import type {
  DocSnapshotLike,
  FirestoreGateway,
  QueryFilterClause,
  QuerySnapshotLike,
} from '../gateway';
import type { RawDoc } from '../mappers';
import { FirestoreMarketplaceRepository } from '../marketplace-repo';
import { FirestoreCourseRepository } from '../course-repo';
import { FirestorePaymentMethodRepository } from '../payment-method-repo';
import { FirestoreTrackEventRepository } from '../track-repo';

function snap(id: string, raw: RawDoc): DocSnapshotLike {
  return { exists: true, id, data: () => raw };
}

function getField(raw: RawDoc, field: string): unknown {
  return field.split('.').reduce<unknown>((acc, part) => {
    if (typeof acc !== 'object' || acc === null) return undefined;
    return (acc as RawDoc)[part];
  }, raw);
}

interface Call {
  readonly kind: string;
  readonly path: string;
  readonly detail?: string;
}

type Store = Record<string, Record<string, RawDoc>>;

class FullFakeGateway implements FirestoreGateway {
  readonly calls: Call[] = [];
  merged: { collectionPath: string; id: string; data: Record<string, unknown> }[] = [];
  updated: { collectionPath: string; id: string; patch: Record<string, unknown> }[] = [];

  constructor(private readonly store: Store) {}

  private docsOf(collectionPath: string): [string, RawDoc][] {
    return Object.entries(this.store[collectionPath] ?? {});
  }

  async getDoc(collectionPath: string, id: string) {
    this.calls.push({ kind: 'getDoc', path: collectionPath, detail: id });
    const raw = this.store[collectionPath]?.[id];
    if (raw === undefined) return null;
    return snap(id, raw);
  }

  async listDocs(collectionPath: string): Promise<QuerySnapshotLike> {
    this.calls.push({ kind: 'listDocs', path: collectionPath });
    return { docs: this.docsOf(collectionPath).map(([id, raw]) => snap(id, raw)) };
  }

  async queryByField(collectionPath: string, field: string, value: unknown, limit?: number) {
    this.calls.push({ kind: 'queryByField', path: collectionPath, detail: `${field}==${String(value)}` });
    const docs = this.docsOf(collectionPath)
      .filter(([, raw]) => getField(raw, field) === value)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => snap(id, raw));
    return { docs };
  }

  async queryByTwoFields(
    collectionPath: string,
    field1: string,
    value1: unknown,
    field2: string,
    value2: unknown,
    limit?: number,
  ) {
    this.calls.push({ kind: 'queryByTwoFields', path: collectionPath, detail: `${field1}+${field2}` });
    const docs = this.docsOf(collectionPath)
      .filter(([, raw]) => getField(raw, field1) === value1 && getField(raw, field2) === value2)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => snap(id, raw));
    return { docs };
  }

  async queryByFilters(collectionPath: string, filters: readonly QueryFilterClause[], limit?: number) {
    this.calls.push({ kind: 'queryByFilters', path: collectionPath });
    const docs = this.docsOf(collectionPath)
      .filter(([, raw]) =>
        filters.every((f) => {
          const actual = getField(raw, f.field);
          if (f.op === '==') return actual === f.value;
          if (f.op === 'in') return Array.isArray(f.value) && (f.value as unknown[]).includes(actual);
          return false;
        }),
      )
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => snap(id, raw));
    return { docs };
  }

  async createDoc(): Promise<void> {}

  async updateDoc(collectionPath: string, id: string, patch: Record<string, unknown>): Promise<void> {
    this.calls.push({ kind: 'updateDoc', path: collectionPath, detail: id });
    this.updated.push({ collectionPath, id, patch });
  }

  async deleteDoc(): Promise<void> {}

  async mergeDoc(collectionPath: string, id: string, data: Record<string, unknown>): Promise<void> {
    this.calls.push({ kind: 'mergeDoc', path: collectionPath, detail: id });
    this.merged.push({ collectionPath, id, data });
  }

  increment(n: number): unknown {
    return { __inc: n };
  }

  serverTimestamp(): unknown {
    return { __ts: true };
  }

  arrayUnion(...elements: unknown[]): unknown {
    return { __union: elements };
  }

  async listSubDocs(parentCollection: string, parentId: string, subCollection: string) {
    const path = `${parentCollection}/${parentId}/${subCollection}`;
    this.calls.push({ kind: 'listSubDocs', path });
    return { docs: this.docsOf(path).map(([id, raw]) => snap(id, raw)) };
  }

  async countSubDocs(): Promise<number> {
    return 0;
  }

  async createSubDoc(): Promise<void> {}
  async updateSubDoc(): Promise<void> {}
  async deleteSubDoc(): Promise<void> {}
}

class MinimalFakeGateway extends FullFakeGateway {
  override queryByTwoFields = undefined as any;
  override mergeDoc = undefined as any;
  override increment = undefined as any;
}

function discoveryStore(): Store {
  return {
    users: {
      'tutor-1': { username: 'ana' },
    },
    salesPages: {
      'page-1': { mentorId: 'tutor-1', slug: 'curso', title: 'Curso' },
      'page-2': { mentorId: 'tutor-1', slug: 'otro', title: 'Otro' },
      'page-3': { mentorId: 'tutor-9', slug: 'curso', title: 'Mismo slug otro mentor' },
    },
    courses: {
      'c1': { mentorId: 'tutor-1', isActive: true, status: 'published', publicListing: true },
      'c2': { mentorId: 'tutor-1', isActive: true, status: 'approved', publicListing: undefined },
      'c3': { mentorId: 'tutor-1', isActive: true, status: 'draft', publicListing: true },
      'c4': { mentorId: 'tutor-1', isActive: false, status: 'published', publicListing: true },
      'c5': { mentorId: 'tutor-1', isActive: true, status: 'published', publicListing: false },
      'c6': { mentorId: 'otro', isActive: true, status: 'published', publicListing: true },
    },
    'users/tutor-1/paymentMethods': {
      'm1': { name: 'MP', type: 'mercadopago', isActive: true, config: { publicKey: 'pk', accessToken: 'SECRET' } },
      'm2': { name: 'Transf', type: 'transfer', isActive: true, config: { alias: 'A', cbu: 'C' } },
      'm3': { name: 'Viejo', type: 'transfer', isActive: false, config: {} },
    },
  };
}

describe('MarketplaceRepository (F1.3 aditivo)', () => {
  it('findSalesPageByMentorAndSlug usa mentorId== + slug==', async () => {
    const gw = new FullFakeGateway(discoveryStore());
    const repo = new FirestoreMarketplaceRepository(gw);
    expect((await repo.findSalesPageByMentorAndSlug('tutor-1', 'curso'))?.id).toBe('page-1');
    expect(await repo.findSalesPageByMentorAndSlug('tutor-1', 'inexistente')).toBeNull();
    expect(gw.calls.some((c) => c.kind === 'queryByTwoFields' && c.path === 'salesPages')).toBe(true);
  });

  it('findSalesPageByMentorAndSlug fallback: queryByField + memoria', async () => {
    const gw = new MinimalFakeGateway(discoveryStore());
    const repo = new FirestoreMarketplaceRepository(gw);
    expect((await repo.findSalesPageByMentorAndSlug('tutor-1', 'curso'))?.id).toBe('page-1');
  });

  it('findSalesPageBySlug usa slug== limit 1 (fallback de v/resolve)', async () => {
    const gw = new FullFakeGateway(discoveryStore());
    const repo = new FirestoreMarketplaceRepository(gw);
    expect((await repo.findSalesPageBySlug('otro'))?.id).toBe('page-2');
    expect(await repo.findSalesPageBySlug('inexistente')).toBeNull();
  });
});

describe('CourseRepository.countPublicCoursesByMentor', () => {
  it('cuenta published/approved con publicListing!==false (2 de 6)', async () => {
    const gw = new FullFakeGateway(discoveryStore());
    const repo = new FirestoreCourseRepository(gw);
    expect(await repo.countPublicCoursesByMentor('tutor-1')).toBe(2);
    expect(gw.calls.some((c) => c.kind === 'queryByTwoFields' && c.path === 'courses')).toBe(true);
  });

  it('fallback sin queryByTwoFields da el mismo conteo', async () => {
    const gw = new MinimalFakeGateway(discoveryStore());
    const repo = new FirestoreCourseRepository(gw);
    expect(await repo.countPublicCoursesByMentor('tutor-1')).toBe(2);
  });
});

describe('PaymentMethodRepository.listActiveTutorMethods', () => {
  it('lista la subcolección con isActive==true (sin exponer nada aún)', async () => {
    const gw = new FullFakeGateway(discoveryStore());
    const repo = new FirestorePaymentMethodRepository(gw);
    const methods = await repo.listActiveTutorMethods('tutor-1');
    expect(methods.map((m) => m.id).sort()).toEqual(['m1', 'm2']);
    expect(gw.calls.some((c) => c.kind === 'listSubDocs' && c.path === 'users/tutor-1/paymentMethods')).toBe(true);
  });
});

describe('FirestoreTrackEventRepository', () => {
  it('recordPageClick hace merge en salesPages con increment + serverTimestamp', async () => {
    const gw = new FullFakeGateway(discoveryStore());
    const repo = new FirestoreTrackEventRepository(gw);
    await repo.recordPageClick({ pageId: 'page-1', channel: 'whatsapp', source: 'bio' });
    const w = gw.merged.find((x) => x.collectionPath === 'salesPages' && x.id === 'page-1');
    expect(w).toBeDefined();
    const stats = w?.data.stats as Record<string, unknown>;
    expect(stats.totalClicks).toEqual({ __inc: 1 });
    expect((stats.channelBreakdown as Record<string, unknown>).whatsapp).toEqual({ clicks: { __inc: 1 } });
    expect((stats.sourceBreakdown as Record<string, unknown>).bio).toEqual({ clicks: { __inc: 1 } });
    expect(stats.lastActivity).toEqual({ __ts: true });
  });

  it('fallback sin mergeDoc/increment: read + updateDoc con +1', async () => {
    const gw = new MinimalFakeGateway(discoveryStore());
    const repo = new FirestoreTrackEventRepository(gw);
    await repo.recordPageClick({ pageId: 'page-1', channel: 'whatsapp', source: 'bio' });
    const u = gw.updated.find((x) => x.collectionPath === 'salesPages' && x.id === 'page-1');
    expect(u).toBeDefined();
    expect(u?.patch['stats.totalClicks']).toBe(1);
  });
});
