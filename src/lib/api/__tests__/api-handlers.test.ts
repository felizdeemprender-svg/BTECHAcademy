/**
 * Tests de handlers API con gateway falso.
 * Sin Firebase real: auth y gateway inyectados.
 */
import { describe, expect, it } from 'vitest';

import type { FirestoreGateway, QuerySnapshotLike } from '@/data/firestore/gateway';
import type { RawDoc } from '@/data/firestore/mappers';
import type { Caller } from '../mentor-auth';
import { canAccessMentorData } from '../mentor-auth';
import { handleGetCampaign, handleListCampaigns } from '../campaign-handlers';
import { handleListPrograms } from '../program-handlers';

const campaignRaw: RawDoc = {
  mentorId: 'm1',
  title: 'Lanzamiento X',
  strategy: {
    strategyName: 'S',
    logic: 'L',
    timeline: [
      { day: 1, phase: 'P', variantIndex: 0, action: 'A1', channels: ['Social'] },
    ],
  },
  startDate: '2026-01-01',
  autoPilot: true,
  status: 'active',
  isActive: true,
  executionLogs: [],
};

const programRaw: RawDoc = {
  mentorId: 'm1',
  title: 'Mentoría X',
  type: 'individual',
  studentId: 's1',
  totalSessions: 4,
  status: 'active',
};

class FakeGateway implements FirestoreGateway {
  constructor(private readonly store: Record<string, Record<string, RawDoc>>) {}
  async getDoc(collectionPath: string, id: string) {
    const raw = this.store[collectionPath]?.[id];
    if (!raw) return null;
    return { exists: true as const, id, data: () => raw };
  }
  async queryByField(collectionPath: string, field: string, value: unknown, limit?: number) {
    const docs = Object.entries(this.store[collectionPath] ?? {})
      .filter(([, raw]) => raw[field] === value)
      .slice(0, limit ?? Number.POSITIVE_INFINITY)
      .map(([id, raw]) => ({ exists: true as const, id, data: () => raw }));
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

const gateway = new FakeGateway({
  campaigns: { c1: campaignRaw, cOther: { ...campaignRaw, mentorId: 'm2' } },
  followups: { f1: programRaw },
});

const mentor: Caller = { uid: 'm1', isAdmin: false };
const admin: Caller = { uid: 'admin1', isAdmin: true };
const other: Caller = { uid: 'm2', isAdmin: false };

describe('authz', () => {
  it('canAccessMentorData: propio o admin', () => {
    expect(canAccessMentorData(mentor, 'm1')).toBe(true);
    expect(canAccessMentorData(other, 'm1')).toBe(false);
    expect(canAccessMentorData(admin, 'm1')).toBe(true);
  });
});

describe('handleListCampaigns', () => {
  it('401 sin llamante, 403 ajeno, 200 propio con data', async () => {
    expect((await handleListCampaigns(gateway, null, 'm1')).status).toBe(401);
    expect((await handleListCampaigns(gateway, other, 'm1')).status).toBe(403);
    expect((await handleListCampaigns(gateway, mentor, '')).status).toBe(403);

    const res = await handleListCampaigns(gateway, mentor, 'm1');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { campaign: { id: string } }[] };
    expect(body.data.map((s) => s.campaign.id)).toEqual(['c1']);
  });

  it('admin ve campañas de cualquier mentor', async () => {
    const res = await handleListCampaigns(gateway, admin, 'm2');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(1);
  });
});

describe('handleGetCampaign', () => {
  it('401 sin llamante, 403 ajeno, 404 inexistente, 200 propio', async () => {
    expect((await handleGetCampaign(gateway, null, 'c1')).status).toBe(401);
    expect((await handleGetCampaign(gateway, other, 'c1')).status).toBe(403);
    expect((await handleGetCampaign(gateway, mentor, 'missing')).status).toBe(404);

    const res = await handleGetCampaign(gateway, mentor, 'c1');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { campaign: { id: string } } };
    expect(body.data.campaign.id).toBe('c1');
  });
});

describe('handleListPrograms', () => {
  it('401 sin llamante, 403 ajeno, 200 propio con data', async () => {
    expect((await handleListPrograms(gateway, null, 'm1')).status).toBe(401);
    expect((await handleListPrograms(gateway, other, 'm1')).status).toBe(403);

    const res = await handleListPrograms(gateway, mentor, 'm1');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { program: { id: string } }[] };
    expect(body.data.map((s) => s.program.id)).toEqual(['f1']);
  });
});

