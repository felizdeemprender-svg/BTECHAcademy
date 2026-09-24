/**
 * Capa de datos — Gateway mínimo de Firestore.
 * Interfaz pequeña para que los repositorios sean testeables
 * con un falso en memoria. La implementación real (`FirebaseGateway`)
 * usa el SDK modular; el resto del código solo ve la interfaz.
 */
import {
  arrayUnion as fsArrayUnion,
  collection,
  deleteDoc as fsDeleteDoc,
  doc,
  documentId as fsDocumentId,
  getCountFromServer,
  getDoc,
  getDocs,
  increment as fsIncrement,
  limit as fsLimit,
  query,
  serverTimestamp as fsServerTimestamp,
  setDoc as fsSetDoc,
  updateDoc as fsUpdateDoc,
  where,
  writeBatch as fsWriteBatch,
  type Firestore,
} from 'firebase/firestore';

export interface DocSnapshotLike {
  readonly exists: boolean;
  readonly id: string;
  data(): Record<string, unknown> | undefined;
}

export interface QuerySnapshotLike {
  readonly docs: DocSnapshotLike[];
}

/**
 * F1.2 — Cláusula de filtro compuesto. `field '__name__'` = id del
 * documento (`documentId()` en cliente / `FieldPath.documentId()` en admin).
 */
export interface QueryFilterClause {
  readonly field: string;
  readonly op: '==' | '>' | 'in' | 'array-contains';
  readonly value: unknown;
}

export interface FirestoreGateway {
  getDoc(collectionPath: string, id: string): Promise<DocSnapshotLike | null>;
  /** Lista colección completa (solo admin). */
  listDocs(collectionPath: string, limit?: number): Promise<QuerySnapshotLike>;
  queryByField(
    collectionPath: string,
    field: string,
    value: unknown,
    limit?: number,
  ): Promise<QuerySnapshotLike>;
  /**
   * F0.1 — Doble filtro `field1 ==` + `field2 ==` (igual que
   * `salesPages.where('mentorId','==').where('status','==')` del engine).
   * OPCIONAL: los gateways viejos/fakes que no lo tengan usan
   * `queryByField` + filtro en memoria en el repositorio.
   */
  queryByTwoFields?(
    collectionPath: string,
    field1: string,
    value1: unknown,
    field2: string,
    value2: unknown,
    limit?: number,
  ): Promise<QuerySnapshotLike>;
  /**
   * F0.3 — Filtro `field array-contains value` (igual que
   * `users.where('roles','array-contains','mentor')` de admin/billing).
   * OPCIONAL: sin él, el repositorio usa `listDocs` + filtro en memoria
   * con el mismo resultado.
   */
  queryArrayContains?(
    collectionPath: string,
    field: string,
    value: unknown,
    limit?: number,
  ): Promise<QuerySnapshotLike>;
  /**
   * F0.3 — Crea con id autogenerado (igual que `addDoc` del SDK).
   * OPCIONAL: sin él, el repositorio genera un id y usa `createDoc`.
   */
  createDocAutoId?(collectionPath: string, data: Record<string, unknown>): Promise<string>;
  /**
   * F0.1 — Batch de updates atómico (igual que `db.batch()` del engine).
   * OPCIONAL: sin él, el repositorio hace N `updateDoc` secuenciales
   * con los mismos patches.
   */
  batchWrite?(ops: BatchUpdateOp[]): Promise<void>;
  /**
   * F1.2 — Filtros compuestos (`courses`: isActive== + status== +
   * publicListing== + price==/> + limit; `users`: __name__ in + status==).
   * OPCIONAL: sin él, el repositorio compone `queryByField`/`queryByTwoFields`
   * + filtro en memoria con idéntico resultado (cubierto con tests).
   */
  queryByFilters?(
    collectionPath: string,
    filters: readonly QueryFilterClause[],
    limit?: number,
  ): Promise<QuerySnapshotLike>;
  /**
   * F1.2 — Lee documentos por ids (`documentId() in [...30]` de
   * tutores/tags/cursos del marketplace). OPCIONAL: sin él, el
   * repositorio hace N `getDoc` con el mismo conjunto resultado.
   */
  getDocsByIds?(collectionPath: string, ids: readonly string[]): Promise<QuerySnapshotLike>;
  /**
   * F1.3 — Set con merge (`setDoc(..., { merge: true })`, igual que
   * `api/track` y `influencers/promote` legacy). OPCIONAL: sin él, el
   * repositorio usa `updateDoc` (mismo efecto sobre docs existentes).
   */
  mergeDoc?(collectionPath: string, id: string, data: Record<string, unknown>): Promise<void>;
  /**
   * F1.3 — Set con merge en subcolección (igual que el `set(...,{merge:true})`
   * de `mentorInfluencers/{m}/referidos/{t}`). OPCIONAL: sin él, el
   * repositorio usa `createSubDoc` (mismo efecto salvo merge parcial).
   */
  mergeSubDoc?(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void>;
  /**
   * F1.3 — Centinela `increment(n)` del SDK correspondiente (igual que
   * `api/track`). OPCIONAL: sin él, el repositorio hace read-modify-write
   * con el mismo valor final.
   */
  increment?(n: number): unknown;
  /** Crea el documento (falla si existe, igual que setDoc actual). */
  createDoc(
    collectionPath: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void>;
  /** Patch parcial (mismos shapes que las escrituras actuales). */
  updateDoc(
    collectionPath: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<void>;
  deleteDoc(collectionPath: string, id: string): Promise<void>;
  /** Centinela de timestamp del SDK correspondiente. */
  serverTimestamp(): unknown;
  /** Centinela arrayUnion del SDK correspondiente. */
  arrayUnion(...elements: unknown[]): unknown;
  /** Lista documentos de una subcolección (sin filtros). */
  listSubDocs(parentCollection: string, parentId: string, subCollection: string): Promise<QuerySnapshotLike>;
  /** Cuenta documentos de una subcolección. */
  countSubDocs(parentCollection: string, parentId: string, subCollection: string): Promise<number>;
  /** Crea en subcolección con ID propio. */
  createSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void>;
  /** Patch parcial en subcolección. */
  updateSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<void>;
  /** Borra un documento de subcolección. */
  deleteSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
  ): Promise<void>;
}

/** Operación de batch: solo `update` (lo único que usa el engine legacy). */
export interface BatchUpdateOp {
  readonly type: 'update';
  readonly collectionPath: string;
  readonly id: string;
  readonly patch: Record<string, unknown>;
}

export class FirebaseGateway implements FirestoreGateway {
  constructor(private readonly db: Firestore) {}

  async getDoc(collectionPath: string, id: string): Promise<DocSnapshotLike | null> {
    const snap = await getDoc(doc(this.db, collectionPath, id));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    return { exists: true, id: snap.id, data: () => data };
  }

  async listDocs(collectionPath: string, limit?: number): Promise<QuerySnapshotLike> {
    const ref = collection(this.db, collectionPath);
    const snap = await getDocs(limit === undefined ? ref : query(ref, fsLimit(limit)));
    return {
      docs: snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return { exists: true, id: d.id, data: () => data };
      }),
    };
  }

  async queryByField(
    collectionPath: string,
    field: string,
    value: unknown,
    limit?: number,
  ): Promise<QuerySnapshotLike> {
    const ref = collection(this.db, collectionPath);
    const q =
      limit === undefined
        ? query(ref, where(field, '==', value))
        : query(ref, where(field, '==', value), fsLimit(limit));
    const snap = await getDocs(q);
    return {
      docs: snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return { exists: true, id: d.id, data: () => data };
      }),
    };
  }

  async createDoc(
    collectionPath: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await fsSetDoc(doc(this.db, collectionPath, id), data);
  }

  async createDocAutoId(
    collectionPath: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    const ref = doc(collection(this.db, collectionPath));
    await fsSetDoc(ref, data);
    return ref.id;
  }

  async updateDoc(
    collectionPath: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    await fsUpdateDoc(doc(this.db, collectionPath, id), patch);
  }

  async deleteDoc(collectionPath: string, id: string): Promise<void> {
    await fsDeleteDoc(doc(this.db, collectionPath, id));
  }

  async queryByTwoFields(
    collectionPath: string,
    field1: string,
    value1: unknown,
    field2: string,
    value2: unknown,
    limit?: number,
  ): Promise<QuerySnapshotLike> {
    const ref = collection(this.db, collectionPath);
    const constraints =
      limit === undefined
        ? [where(field1, '==', value1), where(field2, '==', value2)]
        : [where(field1, '==', value1), where(field2, '==', value2), fsLimit(limit)];
    const snap = await getDocs(query(ref, ...constraints));
    return {
      docs: snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return { exists: true, id: d.id, data: () => data };
      }),
    };
  }

  async batchWrite(ops: BatchUpdateOp[]): Promise<void> {
    const batch = fsWriteBatch(this.db);
    for (const op of ops) {
      batch.update(doc(this.db, op.collectionPath, op.id), op.patch);
    }
    await batch.commit();
  }

  async queryArrayContains(
    collectionPath: string,
    field: string,
    value: unknown,
    limit?: number,
  ): Promise<QuerySnapshotLike> {
    const ref = collection(this.db, collectionPath);
    const constraints =
      limit === undefined
        ? [where(field, 'array-contains', value)]
        : [where(field, 'array-contains', value), fsLimit(limit)];
    const snap = await getDocs(query(ref, ...constraints));
    return {
      docs: snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return { exists: true, id: d.id, data: () => data };
      }),
    };
  }

  private static toWhereClause(f: QueryFilterClause) {
    const field = f.field === '__name__' ? fsDocumentId() : f.field;
    return where(field, f.op, f.value);
  }

  async queryByFilters(
    collectionPath: string,
    filters: readonly QueryFilterClause[],
    limit?: number,
  ): Promise<QuerySnapshotLike> {
    const ref = collection(this.db, collectionPath);
    const snap = await getDocs(
      query(
        ref,
        ...filters.map(FirebaseGateway.toWhereClause),
        ...(limit !== undefined ? [fsLimit(limit)] : []),
      ),
    );
    return {
      docs: snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return { exists: true, id: d.id, data: () => data };
      }),
    };
  }

  async getDocsByIds(collectionPath: string, ids: readonly string[]): Promise<QuerySnapshotLike> {
    const snaps = await Promise.all(ids.map((id) => getDoc(doc(this.db, collectionPath, id))));
    return {
      docs: snaps
        .filter((s) => s.exists())
        .map((s) => {
          const data = s.data() as Record<string, unknown>;
          return { exists: true, id: s.id, data: () => data };
        }),
    };
  }

  async mergeDoc(
    collectionPath: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await fsSetDoc(doc(this.db, collectionPath, id), data, { merge: true });
  }

  async mergeSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await fsSetDoc(doc(this.db, parentCollection, parentId, subCollection, id), data, { merge: true });
  }

  increment(n: number): unknown {
    return fsIncrement(n);
  }

  serverTimestamp(): unknown {
    return fsServerTimestamp();
  }

  arrayUnion(...elements: unknown[]): unknown {
    return fsArrayUnion(...elements);
  }

  async listSubDocs(
    parentCollection: string,
    parentId: string,
    subCollection: string,
  ): Promise<QuerySnapshotLike> {
    const snap = await getDocs(collection(this.db, parentCollection, parentId, subCollection));
    return {
      docs: snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return { exists: true, id: d.id, data: () => data };
      }),
    };
  }

  async countSubDocs(
    parentCollection: string,
    parentId: string,
    subCollection: string,
  ): Promise<number> {
    const snap = await getCountFromServer(
      collection(this.db, parentCollection, parentId, subCollection),
    );
    return snap.data().count;
  }

  async createSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await fsSetDoc(doc(this.db, parentCollection, parentId, subCollection, id), data);
  }

  async updateSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    await fsUpdateDoc(doc(this.db, parentCollection, parentId, subCollection, id), patch);
  }

  async deleteSubDoc(
    parentCollection: string,
    parentId: string,
    subCollection: string,
    id: string,
  ): Promise<void> {
    await fsDeleteDoc(doc(this.db, parentCollection, parentId, subCollection, id));
  }
}
