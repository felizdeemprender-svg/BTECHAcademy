import { describe, it, expect, beforeEach } from 'vitest';
import { CatalogApiKeyGuard, hashApiKey, generateRawApiKey } from '../catalog-api-key-guard';
import type { FirestoreGateway, DocSnapshotLike } from '@/data/firestore/gateway';

class InMemoryGateway {
  public store: Map<string, Map<string, Record<string, unknown>>> = new Map();

  async getDoc(col: string, id: string): Promise<DocSnapshotLike | null> {
    const colMap = this.store.get(col);
    const data = colMap?.get(id);
    if (!data) return { exists: false, id, data: () => undefined };
    return { exists: true, id, data: () => ({ ...data }) };
  }

  async createDoc(col: string, id: string, data: Record<string, unknown>): Promise<void> {
    let colMap = this.store.get(col);
    if (!colMap) {
      colMap = new Map();
      this.store.set(col, colMap);
    }
    colMap.set(id, { ...data });
  }

  async mergeDoc(col: string, id: string, data: Record<string, unknown>): Promise<void> {
    let colMap = this.store.get(col);
    if (!colMap) {
      colMap = new Map();
      this.store.set(col, colMap);
    }
    const current = colMap.get(id) || {};
    colMap.set(id, { ...current, ...data });
  }

  async updateDoc(col: string, id: string, data: Record<string, unknown>): Promise<void> {
    let colMap = this.store.get(col);
    if (!colMap) {
      colMap = new Map();
      this.store.set(col, colMap);
    }
    const current = colMap.get(id) || {};
    // Handle dot notation shallowly for nested keys like 'catalogApiKey.status'
    const updated = { ...current };
    for (const [key, val] of Object.entries(data)) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let target: any = updated;
        for (let i = 0; i < parts.length - 1; i++) {
          target[parts[i]] = target[parts[i]] || {};
          target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = val;
      } else {
        updated[key] = val;
      }
    }
    colMap.set(id, updated);
  }

  async queryByField(): Promise<any> {
    return { docs: [] };
  }

  async listDocs(): Promise<any> {
    return { docs: [] };
  }
}

describe('CatalogApiKeyGuard', () => {
  let gateway: InMemoryGateway;
  let guard: CatalogApiKeyGuard;

  beforeEach(() => {
    gateway = new InMemoryGateway();
    guard = new CatalogApiKeyGuard(gateway as unknown as FirestoreGateway);
  });

  it('generates an API key with correct format and stores hashed document', async () => {
    const tutorId = 'tutor-123';
    // Create initial user doc
    await gateway.createDoc('users', tutorId, { name: 'Juan Perez' });

    const result = await guard.generateOrRegenerateKey(tutorId);

    expect(result.rawKey).toMatch(/^fde_live_[a-f0-9]{32}$/);
    expect(result.keyDoc.status).toBe('active');
    expect(result.keyDoc.tutorId).toBe(tutorId);
    expect(result.keyDoc.hashedKey).toBe(hashApiKey(result.rawKey));

    // Verify key in catalogApiKeys
    const storedKey = await gateway.getDoc('catalogApiKeys', result.keyDoc.hashedKey);
    expect(storedKey?.exists).toBe(true);
    expect(storedKey?.data()?.status).toBe('active');

    // Verify key in user document
    const userDoc = await gateway.getDoc('users', tutorId);
    expect((userDoc?.data() as any)?.catalogApiKey?.hashedKey).toBe(result.keyDoc.hashedKey);
  });

  it('revokes previous key upon regeneration', async () => {
    const tutorId = 'tutor-123';
    await gateway.createDoc('users', tutorId, { name: 'Juan Perez' });

    const key1 = await guard.generateOrRegenerateKey(tutorId);
    const key2 = await guard.generateOrRegenerateKey(tutorId);

    // key1 should now be revoked
    const oldKeyDoc = await gateway.getDoc('catalogApiKeys', key1.keyDoc.hashedKey);
    expect(oldKeyDoc?.data()?.status).toBe('revoked');

    // key2 should be active
    const newKeyDoc = await gateway.getDoc('catalogApiKeys', key2.keyDoc.hashedKey);
    expect(newKeyDoc?.data()?.status).toBe('active');

    // Validation with key1 must fail with 401 API_KEY_REVOKED
    const valResult1 = await guard.validateRequestKey(key1.rawKey);
    expect(valResult1.ok).toBe(false);
    expect(valResult1.code).toBe('API_KEY_REVOKED');
    expect(valResult1.status).toBe(401);

    // Validation with key2 must succeed
    const valResult2 = await guard.validateRequestKey(key2.rawKey);
    expect(valResult2.ok).toBe(true);
    expect(valResult2.tutorId).toBe(tutorId);
  });

  it('rejects null or empty key with 401 API_KEY_REQUIRED', async () => {
    const resNull = await guard.validateRequestKey(null);
    expect(resNull.ok).toBe(false);
    expect(resNull.code).toBe('API_KEY_REQUIRED');
    expect(resNull.status).toBe(401);

    const resEmpty = await guard.validateRequestKey('   ');
    expect(resEmpty.ok).toBe(false);
    expect(resEmpty.code).toBe('API_KEY_REQUIRED');
  });

  it('rejects non-existent key with 401 API_KEY_INVALID', async () => {
    const res = await guard.validateRequestKey('fde_live_fake1234567890abcdef');
    expect(res.ok).toBe(false);
    expect(res.code).toBe('API_KEY_INVALID');
    expect(res.status).toBe(401);
  });

  it('rejects already blocked key with 403 API_KEY_BLOCKED', async () => {
    const tutorId = 'tutor-999';
    const key = await guard.generateOrRegenerateKey(tutorId);

    // Manually block key
    await gateway.updateDoc('catalogApiKeys', key.keyDoc.hashedKey, {
      status: 'blocked',
      blockedReason: 'Manual block',
    });

    const res = await guard.validateRequestKey(key.rawKey);
    expect(res.ok).toBe(false);
    expect(res.code).toBe('API_KEY_BLOCKED');
    expect(res.status).toBe(403);
  });

  it('activates Circuit Breaker and blocks key when exceeding 180 requests in a minute', async () => {
    const tutorId = 'tutor-circuit-breaker';
    await gateway.createDoc('users', tutorId, { name: 'Target Tutor' });

    const { rawKey, keyDoc } = await guard.generateOrRegenerateKey(tutorId);

    // Simulate already having 180 requests in the current window
    await gateway.updateDoc('catalogApiKeys', keyDoc.hashedKey, {
      windowRequests: 180,
      windowStart: Date.now(),
    });

    // Request 181 should trigger circuit breaker
    const breakerResult = await guard.validateRequestKey(rawKey);
    expect(breakerResult.ok).toBe(false);
    expect(breakerResult.status).toBe(429);
    expect(breakerResult.code).toBe('API_KEY_BLOCKED');

    // Document in catalogApiKeys should be blocked
    const stored = await gateway.getDoc('catalogApiKeys', keyDoc.hashedKey);
    expect(stored?.data()?.status).toBe('blocked');
    expect(stored?.data()?.blockedReason).toContain('Circuit Breaker');

    // User document should reflect blocked status
    const userDoc = await gateway.getDoc('users', tutorId);
    expect((userDoc?.data() as any)?.catalogApiKey?.status).toBe('blocked');

    // Subsequent request should be blocked with 403
    const nextResult = await guard.validateRequestKey(rawKey);
    expect(nextResult.ok).toBe(false);
    expect(nextResult.status).toBe(403);
  });

  it('retrieves tutor key info correctly', async () => {
    const tutorId = 'tutor-info';
    await gateway.createDoc('users', tutorId, {
      name: 'Maria Tutor',
      catalogApiKey: {
        key: 'fde_live_xyz',
        keyPrefix: 'fde_live_xyz...',
        status: 'active',
      },
    });

    const info = await guard.getTutorKeyInfo(tutorId);
    expect(info?.key).toBe('fde_live_xyz');
    expect(info?.status).toBe('active');
  });
});
