/**
 * F1.2 (TDD rojo) — Handler del scheduler de campañas con gateway falso.
 * El scheduler NO puede reusar execute-campaign (disparo manual) sin cambiar
 * respuestas: mantiene su lógica propia (día relativo, horarios por plataforma,
 * idempotencia alreadyRun, feedbacks sandbox/producción) movida fuera del route.
 * Se verifican los shapes legacy exactos.
 */
import { describe, expect, it } from 'vitest';

import type {
  DocSnapshotLike,
  FirestoreGateway,
  QuerySnapshotLike,
} from '@/data/firestore/gateway';
import { handleRunScheduler } from '../scheduler-handler';

type Store = Record<string, Record<string, Record<string, unknown>>>;

function snap(id: string, raw: Record<string, unknown>): DocSnapshotLike {
  return { exists: true, id, data: () => raw };
}

function getField(raw: Record<string, unknown>, field: string): unknown {
  return field.split('.').reduce<unknown>((acc, part) => {
    if (typeof acc !== 'object' || acc === null) return undefined;
    return (acc as Record<string, unknown>)[part];
  }, raw);
}

class FakeGateway implements FirestoreGateway {
  readonly updates: { collectionPath: string; id: string; patch: Record<string, unknown> }[] = [];

  constructor(private readonly store: Store) {}

  async getDoc(collectionPath: string, id: string) {
    const raw = this.store[collectionPath]?.[id];
    if (raw === undefined) return null;
    return snap(id, raw);
  }

  async listDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }

  async queryByField(collectionPath: string, field: string, value: unknown, limit?: number) {
    return {
      docs: Object.entries(this.store[collectionPath] ?? {})
        .filter(([, raw]) => getField(raw, field) === value)
        .slice(0, limit ?? Number.POSITIVE_INFINITY)
        .map(([id, raw]) => snap(id, raw)),
    };
  }

  async queryByTwoFields(
    collectionPath: string,
    field1: string,
    value1: unknown,
    field2: string,
    value2: unknown,
    limit?: number,
  ) {
    return {
      docs: Object.entries(this.store[collectionPath] ?? {})
        .filter(([, raw]) => getField(raw, field1) === value1 && getField(raw, field2) === value2)
        .slice(0, limit ?? Number.POSITIVE_INFINITY)
        .map(([id, raw]) => snap(id, raw)),
    };
  }

  async createDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async updateDoc(collectionPath: string, id: string, patch: Record<string, unknown>) {
    this.updates.push({ collectionPath, id, patch });
    const current = this.store[collectionPath]?.[id] ?? {};
    this.store[collectionPath][id] = { ...current, ...patch };
  }

  async deleteDoc(): Promise<void> {
    throw new Error('no usado');
  }

  serverTimestamp(): unknown {
    return { __fakeTimestamp: true };
  }

  arrayUnion(...elements: unknown[]): unknown {
    return { __fakeArrayUnion: elements };
  }

  async listSubDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }

  async countSubDocs(): Promise<number> {
    return 0;
  }

  async createSubDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async deleteSubDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async updateSubDoc(): Promise<void> {
    throw new Error('no usado');
  }

  async listDocs2(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }
}

function todayStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * startDate con hora local (no solo-día): `new Date('YYYY-MM-DD')` se
 * parsea como UTC y desplaza el día relativo según el TZ del servidor
 * (quirk que el legacy también tiene en prod). Con hora local el día
 * relativo es determinista en cualquier TZ.
 */
function todayLocalNoon(d: Date): string {
  return `${todayStr(d)}T12:00:00`;
}

function campaignDoc(overrides: Record<string, unknown> = {}) {
  return {
    mentorId: 'm1',
    title: 'Campaña 1',
    isActive: true,
    autoPilot: true,
    executionLogs: [],
    strategy: {
      timeline: [
        {
          day: 1,
          phase: 'Lanzamiento',
          variantIndex: 0,
          action: 'Publicar Reels',
          channels: ['Social'],
          socialSchedule: { instagram: { time: '00:01', videoName: 'Video 1' } },
        },
      ],
    },
    ...overrides,
  };
}

describe('handleRunScheduler', () => {
  it('mensaje legacy cuando no hay campañas en autopilot', async () => {
    const gateway = new FakeGateway({ campaigns: {}, users: {} });
    const res = await handleRunScheduler(gateway, new Date('2026-06-15T12:00:00.000Z'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'No active autopilot campaigns found.' });
  });

  it('ejecuta el evento de hoy y persiste executionLogs (sandbox)', async () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    const gateway = new FakeGateway({
      campaigns: { c1: campaignDoc({ startDate: todayLocalNoon(now) }) },
      users: { m1: { marketingCredentials: {} } },
    });
    const res = await handleRunScheduler(gateway, now);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      dispatchesExecuted: number;
      details: { channel: string; platform: string; status: string }[];
    };
    expect(body.status).toBe('completed');
    expect(body.dispatchesExecuted).toBe(1);
    expect(body.details[0]).toMatchObject({ channel: 'Social', platform: 'instagram', status: 'success' });
    expect(gateway.updates).toHaveLength(1);
    expect(gateway.updates[0]).toMatchObject({ collectionPath: 'campaigns', id: 'c1' });
    const logs = gateway.updates[0].patch.executionLogs as unknown[];
    expect(logs).toHaveLength(1);
  });

  it('omite campañas fuera de la ventana del timeline y eventos ya ejecutados', async () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    const old = new Date('2026-01-01T12:00:00.000Z');
    const already = {
      day: 1, channel: 'Social', platform: 'instagram', status: 'success', videoName: 'Video 1'
    };
    const gateway = new FakeGateway({
      campaigns: {
        outOfBounds: campaignDoc({ title: 'Vieja', startDate: todayLocalNoon(old) }),
        done: campaignDoc({ title: 'Hecha', startDate: todayLocalNoon(now), executionLogs: [already] }),
      },
      users: { m1: { marketingCredentials: {} } },
    });
    const res = await handleRunScheduler(gateway, now);
    const body = (await res.json()) as { dispatchesExecuted: number; details: unknown[] };
    expect(body.dispatchesExecuted).toBe(0);
    expect(body.details).toEqual([]);
  });

  it('producción sin apiKey marca failed con el feedback legacy', async () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    const gateway = new FakeGateway({
      campaigns: { c1: campaignDoc({ startDate: todayLocalNoon(now) }) },
      users: { m1: { marketingCredentials: { meta_social: { mode: 'production', apiKey: '' } } } },
    });
    const res = await handleRunScheduler(gateway, now);
    const body = (await res.json()) as {
      dispatchesExecuted: number;
      details: { status: string; feedback: string }[];
    };
    expect(body.dispatchesExecuted).toBe(1);
    expect(body.details[0].status).toBe('failed');
    expect(body.details[0].feedback).toContain('PRODUCCIÓN');
  });
});
