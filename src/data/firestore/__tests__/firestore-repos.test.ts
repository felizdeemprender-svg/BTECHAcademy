/**
 * Tests de repositorios de lectura con gateway falso en memoria.
 * Sin Firebase real: el falso implementa FirestoreGateway.
 */
import { describe, expect, it, vi } from 'vitest';

import type {
  DocSnapshotLike,
  FirestoreGateway,
  QuerySnapshotLike,
} from '../gateway';
import { mapCampaignDoc, mapProgramDoc, type RawDoc } from '../mappers';
import { FirestoreCampaignRepository } from '../campaign-repo';
import { FirestoreMentoringProgramRepository } from '../program-repo';

function docSnap(id: string, raw: RawDoc | undefined): DocSnapshotLike | null {
  if (raw === undefined) return null;
  return { exists: true, id, data: () => raw };
}

class FakeGateway implements FirestoreGateway {
  calls: { collectionPath: string; field?: string; value?: unknown; limit?: number }[] = [];
  constructor(private readonly store: Record<string, Record<string, RawDoc>>) {}

  async getDoc(collectionPath: string, id: string): Promise<DocSnapshotLike | null> {
    this.calls.push({ collectionPath });
    return docSnap(id, this.store[collectionPath]?.[id]);
  }

  async queryByField(
    collectionPath: string,
    field: string,
    value: unknown,
    limit?: number,
  ): Promise<QuerySnapshotLike> {
    this.calls.push({ collectionPath, field, value, limit });
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => (raw as RawDoc)[field] === value)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => ({ exists: true, id, data: () => raw }) as DocSnapshotLike);
    return { docs };
  }

  async updateDoc(): Promise<void> {
    throw new Error('no implementado en este falso');
  }

  async deleteDoc(): Promise<void> {
    throw new Error('no implementado en este falso');
  }

  serverTimestamp(): unknown {
    return { __fakeTimestamp: true };
  }

  arrayUnion(...elements: unknown[]): unknown {
    return { __fakeArrayUnion: elements };
  }

  async createDoc(): Promise<void> {
    throw new Error('no implementado en este falso');
  }

  async listSubDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }

  async countSubDocs(): Promise<number> {
    return 0;
  }

  async createSubDoc(): Promise<void> {
    throw new Error('no implementado en este falso');
  }

  async deleteSubDoc(): Promise<void> {
    throw new Error('no implementado en este falso');
  }

  async updateSubDoc(): Promise<void> {
    throw new Error('no implementado en este falso');
  }

  async listDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }
}

const campaignRaw: RawDoc = {
  mentorId: 'm1',
  title: 'Lanzamiento X',
  salesPageId: 'p1',
  strategy: {
    strategyName: 'Clásico',
    logic: 'Calentar y vender',
    timeline: [
      { day: 1, phase: 'Expectativa', variantIndex: 0, action: 'Teaser', channels: ['Social'] },
    ],
  },
  startDate: '2026-01-01',
  autoPilot: true,
  status: 'active',
  isActive: true,
  executionLogs: [],
  createdAt: { seconds: Date.parse('2026-01-01T00:00:00.000Z') / 1000 },
};

const programRaw: RawDoc = {
  mentorId: 'm1',
  title: 'Mentoría X',
  type: 'individual',
  studentId: 's1',
  totalSessions: 8,
  status: 'active',
  createdAt: { toDate: () => new Date('2026-01-01T00:00:00.000Z') },
};

describe('mappers', () => {
  it('mapCampaignDoc normaliza Timestamp-like a Date', () => {
    const c = mapCampaignDoc('camp1', campaignRaw);
    expect(c.id).toBe('camp1');
    expect(c.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('mapProgramDoc normaliza toDate() a Date', () => {
    const p = mapProgramDoc('f1', programRaw);
    expect(p.id).toBe('f1');
    expect(p.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('mappers hacen throw con documentos inválidos', () => {
    expect(() => mapCampaignDoc('x', { title: '' })).toThrow();
    expect(() => mapProgramDoc('x', { title: '' })).toThrow();
  });
});

describe('FirestoreCampaignRepository', () => {
  function setup() {
    const gateway = new FakeGateway({
      campaigns: {
        camp1: campaignRaw,
        campOther: { ...campaignRaw, mentorId: 'm2' },
        campBad: { mentorId: 'm1', title: '' },
      },
    });
    return { gateway, repo: new FirestoreCampaignRepository(gateway) };
  }

  it('findById devuelve la campaña y null si no existe', async () => {
    const { repo } = setup();
    const found = await repo.findById('camp1');
    expect(found?.title).toBe('Lanzamiento X');
    expect(await repo.findById('missing')).toBeNull();
  });

  it('listByMentor filtra por mentor y usa la colección campaigns', async () => {
    const { gateway, repo } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const list = await repo.listByMentor('m1');
      expect(list.map((c) => c.id).sort()).toEqual(['camp1']);
      expect(gateway.calls[0]).toMatchObject({ collectionPath: 'campaigns', field: 'mentorId', value: 'm1' });
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
    }
  });

  it('listByMentor respeta limit', async () => {
    const { gateway, repo } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await repo.listByMentor('m1', 10);
      expect(gateway.calls[0].limit).toBe(10);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('FirestoreMentoringProgramRepository', () => {
  function setup() {
    const gateway = new FakeGateway({
      followups: {
        f1: programRaw,
        fOther: { ...programRaw, mentorId: 'm9' },
        fBad: { mentorId: 'm1', title: '' },
      },
    });
    return { gateway, repo: new FirestoreMentoringProgramRepository(gateway) };
  }

  it('findById devuelve el programa y null si no existe', async () => {
    const { repo } = setup();
    expect((await repo.findById('f1'))?.title).toBe('Mentoría X');
    expect(await repo.findById('missing')).toBeNull();
  });

  it('listByMentor filtra por mentor en followups y omite corruptos', async () => {
    const { gateway, repo } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const list = await repo.listByMentor('m1');
      expect(list.map((p) => p.id)).toEqual(['f1']);
      expect(gateway.calls[0]).toMatchObject({ collectionPath: 'followups', field: 'mentorId', value: 'm1' });
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
    }
  });
});

