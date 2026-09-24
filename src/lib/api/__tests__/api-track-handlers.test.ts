/**
 * F1.3 (TDD) - Handler de tracking: 400 sin pageId, redirect 307 con UTMs
 * y redirect de respaldo si la escritura falla (no bloquear la landing).
 */
import { describe, expect, it } from 'vitest';
import { NextResponse } from 'next/server';
import type { DocSnapshotLike, FirestoreGateway, QuerySnapshotLike } from '@/data/firestore/gateway';
import { handleRecordTrackEvent } from '@/lib/api/track-handlers';
class FakeTrackGateway implements FirestoreGateway {
  calls: Array<Record<string, unknown>> = [];
  fail = false;
  async getDoc(): Promise<DocSnapshotLike | null> { return null; }
  async listDocs(): Promise<QuerySnapshotLike> { return { docs: [] }; }
  async queryByField(): Promise<QuerySnapshotLike> { return { docs: [] }; }
  async listSubDocs(): Promise<QuerySnapshotLike> { return { docs: [] }; }
  async countSubDocs(): Promise<number> { return 0; }
  async createDoc(_collectionPath: string, _id: string, _data: Record<string, unknown>): Promise<void> {}
  async updateDoc(_collectionPath: string, _id: string, _data: Record<string, unknown>): Promise<void> {}
  async deleteDoc(_collectionPath: string, _id: string): Promise<void> {}
  async createSubDoc(_parent: string, _parentId: string, _sub: string, _id: string, _data: Record<string, unknown>): Promise<void> {}
  async updateSubDoc(_parent: string, _parentId: string, _sub: string, _id: string, _data: Record<string, unknown>): Promise<void> {}
  async deleteSubDoc(_parent: string, _parentId: string, _sub: string, _id: string): Promise<void> {}
  serverTimestamp(): unknown { return { __ts: true }; }
  arrayUnion(...elements: unknown[]): unknown { return { __union: elements }; }
  async mergeDoc(collectionPath: string, id: string, data: Record<string, unknown>): Promise<void> {
    if (this.fail) throw new Error('boom');
    this.calls.push({ collectionPath, id, data });
  }
  increment(n: number): unknown { return { __inc: n }; }
}
function req(url: string): Request {
  return new Request(url);
}
describe('handleRecordTrackEvent', () => {
  it('400 sin pageId', async () => {
    const res = await handleRecordTrackEvent(new FakeTrackGateway(), req('http://x/api/track'), {
      pageId: null, variant: null, source: null, channel: null,
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing pageId' });
  });
  it('redirect 307 con UTMs y escribe stats', async () => {
    const gw = new FakeTrackGateway();
    const res = await handleRecordTrackEvent(gw, req('http://x/api/track'), {
      pageId: 'p1', variant: '1', source: 'ig', channel: 'post',
    });
    expect(res.status).toBe(307);
    const loc = res.headers.get('location');
    expect(loc).toContain('/v/p1');
    expect(loc).toContain('v=1');
    expect(loc).toContain('s=ig');
    expect(loc).toContain('c=post');
    expect(gw.calls).toHaveLength(1);
    expect(gw.calls[0]?.collectionPath).toBe('salesPages');
    expect(gw.calls[0]?.id).toBe('p1');
  });
  it('defaults v/source/channel a 0/unknown', async () => {
    const gw = new FakeTrackGateway();
    const res = await handleRecordTrackEvent(gw, req('http://x/api/track'), {
      pageId: 'p2', variant: null, source: null, channel: null,
    });
    expect(res.status).toBe(307);
    const loc = res.headers.get('location');
    expect(loc).toContain('v=0');
    expect(loc).toContain('s=unknown');
    expect(loc).toContain('c=unknown');
  });
  it('redirect de respaldo si la escritura falla (no bloquear)', async () => {
    const gw = new FakeTrackGateway();
    gw.fail = true;
    const res = await handleRecordTrackEvent(gw, req('http://x/api/track'), {
      pageId: 'p3', variant: '2', source: 'x', channel: 'y',
    });
    expect(res.status).toBe(307);
    const loc = res.headers.get('location');
    expect(loc).toContain('/v/p3');
  });
});





