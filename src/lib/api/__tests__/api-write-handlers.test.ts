/**
 * Tests de handlers PATCH/DELETE con gateway falso mutable.
 */
import { describe, expect, it } from 'vitest';

import type { FirestoreGateway, QuerySnapshotLike } from '@/data/firestore/gateway';
import type { RawDoc } from '@/data/firestore/mappers';
import type { Caller } from '../mentor-auth';
import { handleDeleteCampaign, handlePatchCampaign } from '../campaign-handlers';

const strategy = {
  strategyName: 'S',
  logic: 'L',
  timeline: [
    { day: 1, phase: 'P', variantIndex: 0, action: 'A1', channels: ['Social'] },
  ],
};

class MutableFakeGateway implements FirestoreGateway {
  writes: Record<string, unknown>[] = [];
  deletes: string[] = [];
  constructor(private readonly store: Record<string, Record<string, RawDoc>>) {}

  async getDoc(collectionPath: string, id: string) {
    const raw = this.store[collectionPath]?.[id];
    if (!raw) return null;
    return { exists: true as const, id, data: () => raw };
  }

  async queryByField() {
    return { docs: [] };
  }

  async updateDoc(_collectionPath: string, id: string, patch: Record<string, unknown>) {
    this.writes.push({ id, patch });
    this.store.campaigns[id] = { ...this.store.campaigns[id], ...patch };
  }

  async deleteDoc(_collectionPath: string, id: string) {
    this.deletes.push(id);
    delete this.store.campaigns[id];
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

function setup() {
  const gateway = new MutableFakeGateway({
    campaigns: {
      c1: {
        mentorId: 'm1',
        title: 'C',
        strategy,
        startDate: '2026-01-01',
        autoPilot: true,
        status: 'active',
        isActive: true,
        executionLogs: [],
      },
    },
  });
  return gateway;
}

const mentor: Caller = { uid: 'm1', isAdmin: false };
const other: Caller = { uid: 'm2', isAdmin: false };

describe('handlePatchCampaign', () => {
  it('401 sin llamante, 403 ajeno, 400 sin campos, 404 inexistente', async () => {
    const gateway = setup();
    expect((await handlePatchCampaign(gateway, null, 'c1', { autoPilot: false })).status).toBe(401);
    expect((await handlePatchCampaign(gateway, other, 'c1', { autoPilot: false })).status).toBe(403);
    expect((await handlePatchCampaign(gateway, mentor, 'c1', {})).status).toBe(400);
    expect((await handlePatchCampaign(gateway, mentor, 'missing', { autoPilot: false })).status).toBe(404);
  });

  it('actualiza autoPilot y strategy del propio mentor', async () => {
    const gateway = setup();
    const r1 = await handlePatchCampaign(gateway, mentor, 'c1', { autoPilot: false });
    expect(r1.status).toBe(200);
    expect(gateway.writes[0]).toMatchObject({ id: 'c1', patch: { autoPilot: false } });

    const r2 = await handlePatchCampaign(gateway, mentor, 'c1', { strategy });
    expect(r2.status).toBe(200);
  });

  it('strategy inválida → 400', async () => {
    const gateway = setup();
    const res = await handlePatchCampaign(gateway, mentor, 'c1', { strategy: { nope: true } });
    expect(res.status).toBe(400);
    expect(gateway.writes).toHaveLength(0);
  });
});

describe('handleDeleteCampaign', () => {
  it('401 sin llamante, 403 ajeno, 404 inexistente, 200 propio y borra', async () => {
    const gateway = setup();
    expect((await handleDeleteCampaign(gateway, null, 'c1')).status).toBe(401);
    expect((await handleDeleteCampaign(gateway, other, 'c1')).status).toBe(403);
    expect((await handleDeleteCampaign(gateway, mentor, 'missing')).status).toBe(404);

    const res = await handleDeleteCampaign(gateway, mentor, 'c1');
    expect(res.status).toBe(200);
    expect(gateway.deletes).toEqual(['c1']);
  });
});

