/**
 * @fileOverview Repositorio Firestore para Avatares de Marca.
 * Persiste los avatares bajo la subcolección `users/{userId}/avatars/{avatarId}`.
 */

import { adminDb } from '@/firebase/admin';
import {
  Avatar,
  AvatarRepository,
  AvatarSchema,
  INITIAL_DEFAULT_AVATARS,
} from '@/domain/avatars';

export class FirestoreAvatarRepository implements AvatarRepository {
  constructor(private readonly db: any = adminDb) {}

  private getUserAvatarsCollection(userId: string) {
    return this.db.collection('users').doc(userId).collection('avatars');
  }

  private mapDoc(id: string, data: Record<string, unknown>): Avatar {
    return AvatarSchema.parse({
      ...data,
      id: (data.id as string) || id,
      createdAt: data.createdAt
        ? typeof (data.createdAt as any).toDate === 'function'
          ? (data.createdAt as any).toDate()
          : data.createdAt
        : undefined,
      updatedAt: data.updatedAt
        ? typeof (data.updatedAt as any).toDate === 'function'
          ? (data.updatedAt as any).toDate()
          : data.updatedAt
        : undefined,
    });
  }

  async listByUser(userId: string): Promise<Avatar[]> {
    const colRef = this.getUserAvatarsCollection(userId);
    const snapshot = await colRef.get();

    if (snapshot.empty) {
      return await this.seedDefaults(userId);
    }

    const list: Avatar[] = [];
    for (const doc of snapshot.docs) {
      try {
        list.push(this.mapDoc(doc.id, doc.data() || {}));
      } catch (err) {
        console.warn(`[FirestoreAvatarRepository] Doc de avatar inválido ignorado: ${doc.id}`, err);
      }
    }

    return list.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async getById(userId: string, avatarId: string): Promise<Avatar | null> {
    const colRef = this.getUserAvatarsCollection(userId);
    const doc = await colRef.doc(avatarId).get();
    if (!doc.exists) return null;
    return this.mapDoc(doc.id, doc.data() || {});
  }

  async getDefault(userId: string): Promise<Avatar | null> {
    const colRef = this.getUserAvatarsCollection(userId);
    const snap = await colRef.where('isDefault', '==', true).limit(1).get();
    if (!snap.empty) {
      return this.mapDoc(snap.docs[0].id, snap.docs[0].data() || {});
    }

    const all = await this.listByUser(userId);
    return all.find((a) => a.isDefault) || all[0] || null;
  }

  async save(userId: string, avatar: Avatar): Promise<Avatar> {
    const validated = AvatarSchema.parse({
      ...avatar,
      userId,
      updatedAt: new Date().toISOString(),
    });

    const colRef = this.getUserAvatarsCollection(userId);
    const batch = this.db.batch();

    // Si este avatar se marca como default, desmarcar los demás
    if (validated.isDefault) {
      const snap = await colRef.where('isDefault', '==', true).get();
      for (const d of snap.docs) {
        if (d.id !== validated.id) {
          batch.update(d.ref, { isDefault: false, updatedAt: new Date().toISOString() });
        }
      }
    }

    const docRef = colRef.doc(validated.id);
    const docSnap = await docRef.get();
    const dataToSave = {
      ...validated,
      createdAt: docSnap.exists
        ? (docSnap.data()?.createdAt || validated.createdAt || new Date().toISOString())
        : (validated.createdAt || new Date().toISOString()),
    };

    batch.set(docRef, dataToSave, { merge: true });
    await batch.commit();

    return this.mapDoc(validated.id, dataToSave);
  }

  async delete(userId: string, avatarId: string): Promise<{ deleted: boolean; newDefaultId?: string }> {
    const colRef = this.getUserAvatarsCollection(userId);
    const snapshot = await colRef.get();

    if (snapshot.size <= 1) {
      throw new Error('No es posible eliminar el único avatar de la cuenta. Debe existir al menos uno.');
    }

    const targetDoc = snapshot.docs.find((d: any) => d.id === avatarId);
    if (!targetDoc) {
      return { deleted: false };
    }

    const wasDefault = targetDoc.data()?.isDefault === true;
    const batch = this.db.batch();
    batch.delete(targetDoc.ref);

    let newDefaultId: string | undefined = undefined;
    if (wasDefault) {
      const remaining = snapshot.docs.filter((d: any) => d.id !== avatarId);
      if (remaining.length > 0) {
        const nextDefaultDoc = remaining[0];
        newDefaultId = nextDefaultDoc.id;
        batch.update(nextDefaultDoc.ref, { isDefault: true, updatedAt: new Date().toISOString() });
      }
    }

    await batch.commit();
    return { deleted: true, newDefaultId };
  }

  async seedDefaults(userId: string): Promise<Avatar[]> {
    const colRef = this.getUserAvatarsCollection(userId);
    const batch = this.db.batch();
    const now = new Date().toISOString();
    const seeded: Avatar[] = [];

    for (const item of INITIAL_DEFAULT_AVATARS) {
      const docRef = colRef.doc(item.id);
      const avatarData: Avatar = {
        ...item,
        userId,
        createdAt: now,
        updatedAt: now,
      };
      batch.set(docRef, avatarData);
      seeded.push(avatarData);
    }

    await batch.commit();
    return seeded;
  }
}
