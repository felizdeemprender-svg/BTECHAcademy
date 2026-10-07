/**
 * Tests de handlers de packs, plan y publicación.
 */
import { describe, expect, it } from 'vitest';

import type { FirestoreGateway, QuerySnapshotLike } from '@/data/firestore/gateway';
import type { RawDoc } from '@/data/firestore/mappers';
import type { CoordinationPlanner } from '@/domain/marketing';
import type { Caller } from '../mentor-auth';
import {
  handleCreateCampaign,
  handleGeneratePlan,
  handleListPacks,
} from '../sales-page-handlers';

const strategy = {
  strategyName: 'S',
  logic: 'L',
  timeline: [{ day: 1, phase: 'P', variantIndex: 0, action: 'A', channels: ['Email'] }],
};

class FakeGateway implements FirestoreGateway {
  created: { collectionPath: string; id: string; data: Record<string, unknown> }[] = [];
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
  async createDoc(collectionPath: string, id: string, data: Record<string, unknown>) {
    this.created.push({ collectionPath, id, data });
    this.store[collectionPath][id] = data;
  }

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

function setup() {
  return new FakeGateway({
    salesPages: {
      p1: {
        mentorId: 'm1',
        title: 'Pack',
        type: 'campaign_pack',
        courseId: 'course1',
        aiContent: { socials: [], emails: [], ads: [] },
      },
      pOther: { mentorId: 'm2', title: 'Otro', type: 'campaign_pack', aiContent: {} },
    },
    campaigns: {},
  });
}

const mentor: Caller = { uid: 'm1', isAdmin: false };
const other: Caller = { uid: 'm2', isAdmin: false };

describe('handleListPacks', () => {
  it('401/403 y 200 con packs del mentor', async () => {
    const gateway = setup();
    expect((await handleListPacks(gateway, null, 'm1')).status).toBe(401);
    expect((await handleListPacks(gateway, other, 'm1')).status).toBe(403);
    // Caso de regresión: string vacío (cuando el front no manda el parámetro)
    expect((await handleListPacks(gateway, mentor, '')).status).toBe(403);
    const res = await handleListPacks(gateway, mentor, 'm1');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string }[] };
    expect(body.data.map((p) => p.id)).toEqual(['p1']);
  });
});

describe('handleGeneratePlan', () => {
  const planner: CoordinationPlanner = {
    generate: async () => strategy as never,
  };

  it('401 sin llamante y 200 con plan', async () => {
    expect((await handleGeneratePlan(planner, null, {})).status).toBe(401);
    const res = await handleGeneratePlan(planner, mentor, {
      campaignTitle: 'C',
      strategyType: 'classic_launch',
      durationDays: 7,
    });
    expect(res.status).toBe(200);
  });

  it('400 con entrada inválida', async () => {
    const res = await handleGeneratePlan(planner, mentor, { campaignTitle: '' });
    expect(res.status).toBe(400);
  });
});

describe('handleCreateCampaign', () => {
  function body() {
    return {
      mentorId: 'm1',
      title: 'C',
      salesPageId: 'p1',
      courseId: 'course1',
      strategy,
      startDate: '2026-01-01',
    };
  }

  it('401/403 (mentor ajeno o página ajena) y 200 propio', async () => {
    const gateway = setup();
    expect((await handleCreateCampaign(gateway, null, body())).status).toBe(401);
    expect((await handleCreateCampaign(gateway, other, body())).status).toBe(403);
    expect(
      (await handleCreateCampaign(gateway, mentor, { ...body(), salesPageId: 'pOther' })).status,
    ).toBe(403);

    const res = await handleCreateCampaign(gateway, mentor, body());
    expect(res.status).toBe(200);
    const payload = (await res.json()) as { data: { id: string } };
    expect(typeof payload.data.id).toBe('string');
    expect(gateway.created).toHaveLength(1);
    expect(gateway.created[0].collectionPath).toBe('campaigns');
    expect(gateway.created[0].data).toMatchObject({
      mentorId: 'm1',
      title: 'C',
      autoPilot: true,
      status: 'draft',
      isActive: false,
    });
  });
});
