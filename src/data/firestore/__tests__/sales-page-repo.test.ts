/**
 * Tests del repo de sales pages: normalización de alias viejos
 * (social/email/ad en singular) y lectura por mentor.
 */
import { describe, expect, it } from 'vitest';

import type { FirestoreGateway, QuerySnapshotLike } from '../gateway';
import { mapSalesPageDoc, normalizeAiContent, type RawDoc } from '../mappers';
import { FirestoreSalesPageRepository } from '../sales-page-repo';

class FakeGateway implements FirestoreGateway {
  constructor(private readonly store: Record<string, Record<string, RawDoc>>) {}
  async getDoc(collectionPath: string, id: string) {
    const raw = this.store[collectionPath]?.[id];
    if (!raw) return null;
    return { exists: true as const, id, data: () => raw };
  }
  async queryByField(collectionPath: string, field: string, value: unknown) {
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => raw[field] === value)
      .map(([id, raw]) => ({ exists: true as const, id, data: () => raw }));
    return { docs };
  }
  async updateDoc(): Promise<void> {}
  async deleteDoc(): Promise<void> {}
  serverTimestamp(): unknown {
    return { __fakeTimestamp: true };
  }
  arrayUnion(...elements: unknown[]): unknown {
    return { __fakeArrayUnion: elements };
  }
  async createDoc(): Promise<void> {}

  async listSubDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }

  async countSubDocs(): Promise<number> {
    return 0;
  }

  async createSubDoc(): Promise<void> {}

  async deleteSubDoc(): Promise<void> {}

  async updateSubDoc(): Promise<void> {}

  async listDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }
}

describe('normalizeAiContent', () => {
  it('acepta claves canónicas y alias viejos', () => {
    expect(normalizeAiContent({ socials: [1], emails: [2], ads: [3], landings: [4] })).toEqual({
      landings: [4],
      socials: [1],
      emails: [2],
      ads: [3],
    });
    expect(normalizeAiContent({ social: [1], email: [2], ad: [3] })).toEqual({
      landings: [],
      socials: [1],
      emails: [2],
      ads: [3],
    });
    expect(normalizeAiContent(null)).toEqual({ landings: [], socials: [], emails: [], ads: [] });
  });
});

describe('FirestoreSalesPageRepository', () => {
  function setup() {
    const gateway = new FakeGateway({
      salesPages: {
        p1: {
          mentorId: 'm1',
          title: 'Pack',
          type: 'campaign_pack',
          aiContent: { social: [{ platform: 'instagram' }], email: [], ad: [] },
        },
        p2: { mentorId: 'm2', title: 'Otro', type: 'campaign_pack', aiContent: {} },
      },
    });
    return new FirestoreSalesPageRepository(gateway);
  }

  it('findById normaliza y devuelve null si falta', async () => {
    const repo = setup();
    const found = await repo.findById('p1');
    expect(found?.aiContent.socials).toHaveLength(1);
    expect(found?.aiContent.emails).toEqual([]);
    expect(await repo.findById('missing')).toBeNull();
  });

  it('listByMentor filtra por mentor', async () => {
    const repo = setup();
    expect((await repo.listByMentor('m1')).map((p) => p.id)).toEqual(['p1']);
  });
});

describe('mapSalesPageDoc', () => {
  it('throw con type desconocido o sin título', () => {
    expect(() =>
      mapSalesPageDoc('x', { mentorId: 'm', title: 'T', type: 'funnel' }),
    ).toThrow();
    expect(() => mapSalesPageDoc('x', { mentorId: 'm', title: '', type: 'campaign_pack' })).toThrow();
  });
});
