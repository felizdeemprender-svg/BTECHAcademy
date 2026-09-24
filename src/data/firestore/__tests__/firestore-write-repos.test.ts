/**
 * Tests de escrituras del repo de campañas con gateway falso mutable.
 * Verifica que el patch y `updatedAt` viajen igual que en la página actual.
 */
import { describe, expect, it } from 'vitest';

import type { FirestoreGateway, QuerySnapshotLike } from '../gateway';
import type { RawDoc } from '../mappers';
import { FirestoreCampaignRepository } from '../campaign-repo';

const strategy = {
  strategyName: 'S',
  logic: 'L',
  timeline: [
    { day: 1, phase: 'P', variantIndex: 0, action: 'A1', channels: ['Social'] },
  ],
};

class MutableFakeGateway implements FirestoreGateway {
  writes: { collectionPath: string; id: string; patch: Record<string, unknown> }[] = [];
  deletes: { collectionPath: string; id: string }[] = [];
  constructor(private readonly store: Record<string, Record<string, RawDoc>>) {}

  async getDoc(collectionPath: string, id: string) {
    const raw = this.store[collectionPath]?.[id];
    if (!raw) return null;
    return { exists: true as const, id, data: () => raw };
  }

  async queryByField() {
    return { docs: [] };
  }

  async updateDoc(
    collectionPath: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    this.writes.push({ collectionPath, id, patch });
    this.store[collectionPath][id] = { ...this.store[collectionPath][id], ...patch };
  }

  async deleteDoc(collectionPath: string, id: string): Promise<void> {
    this.deletes.push({ collectionPath, id });
    delete this.store[collectionPath][id];
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
  return { gateway, repo: new FirestoreCampaignRepository(gateway) };
}

describe('FirestoreCampaignRepository writes', () => {
  it('update envía patch + updatedAt a campaigns', async () => {
    const { gateway, repo } = setup();
    await repo.update('c1', { autoPilot: false });
    expect(gateway.writes).toHaveLength(1);
    expect(gateway.writes[0]).toMatchObject({
      collectionPath: 'campaigns',
      id: 'c1',
      patch: { autoPilot: false },
    });
    expect(gateway.writes[0].patch.updatedAt).toEqual({ __fakeTimestamp: true });
  });

  it('remove borra el documento', async () => {
    const { gateway, repo } = setup();
    await repo.remove('c1');
    expect(gateway.deletes).toEqual([{ collectionPath: 'campaigns', id: 'c1' }]);
    expect(await repo.findById('c1')).toBeNull();
  });

  it('appendExecutionLogs usa arrayUnion + updatedAt', async () => {
    const { gateway, repo } = setup();
    const logs = [
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        day: 1,
        channel: 'Email',
        action: 'A',
        status: 'success',
        mode: 'sandbox',
        provider: 'SendGrid',
        feedback: 'ok',
      },
    ];
    await repo.appendExecutionLogs('c1', logs as never);
    expect(gateway.writes).toHaveLength(1);
    expect(gateway.writes[0].collectionPath).toBe('campaigns');
    expect(gateway.writes[0].patch.updatedAt).toEqual({ __fakeTimestamp: true });
    expect(gateway.writes[0].patch.executionLogs).toEqual({
      __fakeArrayUnion: logs,
    });
  });
});

