/**
 * Tests del handler POST execute con gateway falso.
 * Las credenciales se leen del doc del llamante (users/{uid}).
 */
import { describe, expect, it } from 'vitest';

import type { FirestoreGateway, QuerySnapshotLike } from '@/data/firestore/gateway';
import type { RawDoc } from '@/data/firestore/mappers';
import type { Caller } from '../mentor-auth';
import { handleExecuteCampaign } from '../campaign-handlers';

const strategy = {
  strategyName: 'S',
  logic: 'L',
  timeline: [
    { day: 1, phase: 'P', variantIndex: 0, action: 'A1', channels: ['Email'] },
  ],
};

class FakeGateway implements FirestoreGateway {
  appended: unknown[] = [];
  constructor(private readonly store: Record<string, Record<string, RawDoc>>) {}

  async getDoc(collectionPath: string, id: string) {
    const raw = this.store[collectionPath]?.[id];
    if (!raw) return null;
    return { exists: true as const, id, data: () => raw };
  }

  async queryByField() {
    return { docs: [] };
  }

  async updateDoc(_collectionPath: string, _id: string, patch: Record<string, unknown>) {
    this.appended.push(patch);
  }

  async deleteDoc(): Promise<void> {}

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

function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function setup(credentials?: Record<string, unknown>) {
  return new FakeGateway({
    campaigns: {
      c1: {
        mentorId: 'm1',
        title: 'C',
        strategy,
        startDate: todayLocal(),
        autoPilot: true,
        status: 'active',
        isActive: true,
        executionLogs: [],
      },
    },
    users: {
      m1: credentials ? { marketingCredentials: credentials } : {},
    },
  });
}

const mentor: Caller = { uid: 'm1', isAdmin: false };
const other: Caller = { uid: 'm2', isAdmin: false };

describe('handleExecuteCampaign', () => {
  it('401 sin llamante, 403 ajeno, 404 inexistente', async () => {
    const gateway = setup();
    expect((await handleExecuteCampaign(gateway, null, 'c1')).status).toBe(401);
    expect((await handleExecuteCampaign(gateway, other, 'c1')).status).toBe(403);
    expect((await handleExecuteCampaign(gateway, mentor, 'missing')).status).toBe(404);
  });

  it('200 en sandbox sin credenciales y agrega logs', async () => {
    const gateway = setup();
    const res = await handleExecuteCampaign(gateway, mentor, 'c1');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { logsAppended: number } };
    expect(body.data.logsAppended).toBe(1);
    expect(gateway.appended).toHaveLength(1);
  });

  it('400 si falta API key de producción', async () => {
    const gateway = setup({ sendgrid: { mode: 'production' } });
    const res = await handleExecuteCampaign(gateway, mentor, 'c1');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Email');
    expect(gateway.appended).toHaveLength(0);
  });
});

