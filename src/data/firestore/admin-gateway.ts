/**
 * Capa de datos — Gateway con Firebase Admin SDK.
 * Misma interfaz que el gateway cliente: las rutas eligen
 * Admin primero (producción) o cliente (fallback local),
 * igual que las rutas existentes.
 */
import type { Firestore as AdminFirestore, Query as AdminQuery } from 'firebase-admin/firestore';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';

import type { BatchUpdateOp, FirestoreGateway, QueryFilterClause } from './gateway';

export class AdminFirestoreGateway implements FirestoreGateway {
  constructor(private readonly db: AdminFirestore) {}

  async getDoc(collectionPath: string, id: string) {
    const snap = await this.db.collection(collectionPath).doc(id).get();
    if (!snap.exists) return null;
    const data = (snap.data() ?? {}) as Record<string, unknown>;
    return { exists: true as const, id: snap.id, data: () => data };
  }

  async listDocs(collectionPath: string, limit?: number) {
    const ref = this.db.collection(collectionPath);
    const snap = limit === undefined ? await ref.get() : await ref.limit(limit).get();
    return {
      docs: snap.docs.map((d) => {
        const data = (d.data() ?? {}) as Record<string, unknown>;
        return { exists: true as const, id: d.id, data: () => data };
      }),
    };
  }

  async queryByField(
    collectionPath: string,
    field: string,
    value: unknown,
    limit?: number,
  ) {
    const q = this.db.collection(collectionPath).where(field, '==', value);
    const snap = limit === undefined ? await q.get() : await q.limit(limit).get();
    return {
      docs: snap.docs.map((d) => {
        const data = (d.data() ?? {}) as Record<string, unknown>;
        return { exists: true as const, id: d.id, data: () => data };
      }),
    };
  }

  async createDoc(
    collectionPath: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.db.collection(collectionPath).doc(id).set(data);
  }

  async createDocAutoId(collectionPath: string, data: Record<string, unknown>): Promise<string> {
    const ref = this.db.collection(collectionPath).doc();
    await ref.set(data);
    return ref.id;
  }

  async updateDoc(
    collectionPath: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    await this.db.collection(collectionPath).doc(id).update(patch);
  }

  async deleteDoc(collectionPath: string, id: string): Promise<void> {
    await this.db.collection(collectionPath).doc(id).delete();
  }

  async queryByTwoFields(
    collectionPath: string,
    field1: string,
    value1: unknown,
    field2: string,
    value2: unknown,
    limit?: number,
  ) {
    const q = this.db.collection(collectionPath).where(field1, '==', value1).where(field2, '==', value2);
    const snap = limit === undefined ? await q.get() : await q.limit(limit).get();
    return {
      docs: snap.docs.map((d) => {
        const data = (d.data() ?? {}) as Record<string, unknown>;
        return { exists: true as const, id: d.id, data: () => data };
      }),
    };
  }

  async batchWrite(ops: BatchUpdateOp[]): Promise<void> {
    const batch = this.db.batch();
    for (const op of ops) {
      batch.update(this.db.collection(op.collectionPath).doc(op.id), op.patch);
    }
    await batch.commit();
  }

  async queryArrayContains(
    collectionPath: string,
    field: string,
    value: unknown,
    limit?: number,
  ) {
    const q = this.db.collection(collectionPath).where(field, 'array-contains', value);
    const snap = limit === undefined ? await q.get() : await q.limit(limit).get();
    return {
      docs: snap.docs.map((d) => {
        const data = (d.data() ?? {}) as Record<string, unknown>;
        return { exists: true as const, id: d.id, data: () => data };
      }),
    };
  }

  async queryByFilters(
    collectionPath: string,
    filters: readonly QueryFilterClause[],
    limit?: number,
  ) {
    let q: AdminQuery = this.db.collection(collectionPath);
    for (const f of filters) {
      const field = f.field === '__name__' ? FieldPath.documentId() : f.field;
      q = q.where(field, f.op, f.value);
    }
    const snap = limit === undefined ? await q.get() : await q.limit(limit).get();
    return {
      docs: snap.docs.map((d) => {
        const data = (d.data() ?? {}) as Record<string, unknown>;
        return { exists: true as const, id: d.id, data: () => data };
      }),
    };
  }

  async getDocsByIds(collectionPath: string, ids: readonly string[]) {
    const snaps = await Promise.all(ids.map((id) => this.db.collection(collectionPath).doc(id).get()));
    return {
      docs: snaps
        .filter((s) => s.exists)
        .map((s) => {
          const data = (s.data() ?? {}) as Record<string, unknown>;
          return { exists: true as const, id: s.id, data: () => data };
        }),
    };
  }

  async mergeDoc(
    collectionPath: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.db.collection(collectionPath).doc(id).set(data, { merge: true });
  }

  async mergeSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.db
      .collection(parentCollection)
      .doc(parentId)
      .collection(subCollection)
      .doc(id)
      .set(data, { merge: true });
  }

  increment(n: number): unknown {
    return FieldValue.increment(n);
  }

  serverTimestamp(): unknown {
    return FieldValue.serverTimestamp();
  }

  arrayUnion(...elements: unknown[]): unknown {
    return FieldValue.arrayUnion(...elements);
  }

  async listSubDocs(parentCollection: string, parentId: string, subCollection: string) {
    const snap = await this.db.collection(parentCollection).doc(parentId).collection(subCollection).get();
    return {
      docs: snap.docs.map((d) => {
        const data = (d.data() ?? {}) as Record<string, unknown>;
        return { exists: true as const, id: d.id, data: () => data };
      }),
    };
  }

  async countSubDocs(
    parentCollection: string,
    parentId: string,
    subCollection: string,
  ): Promise<number> {
    const snap = await this.db
      .collection(parentCollection)
      .doc(parentId)
      .collection(subCollection)
      .count()
      .get();
    return snap.data().count;
  }

  async createSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.db.collection(parentCollection).doc(parentId).collection(subCollection).doc(id).set(data);
  }

  async updateSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    await this.db.collection(parentCollection).doc(parentId).collection(subCollection).doc(id).update(patch);
  }

  async deleteSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
  ): Promise<void> {
    await this.db.collection(parentCollection).doc(parentId).collection(subCollection).doc(id).delete();
  }
}
