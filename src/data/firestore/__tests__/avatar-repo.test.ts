import { describe, expect, it } from 'vitest';
import { FirestoreAvatarRepository } from '../avatar-repo';
import { Avatar, INITIAL_DEFAULT_AVATARS } from '@/domain/avatars';

class MockFirestoreDb {
  public store = new Map<string, Map<string, any>>();

  collection(name: string) {
    return {
      doc: (docId: string) => {
        return {
          collection: (subName: string) => {
            const path = `${name}/${docId}/${subName}`;
            if (!this.store.has(path)) {
              this.store.set(path, new Map());
            }
            const subMap = this.store.get(path)!;

            return {
              doc: (subDocId: string) => {
                return {
                  id: subDocId,
                  get: async () => {
                    const data = subMap.get(subDocId);
                    return {
                      id: subDocId,
                      exists: !!data,
                      data: () => data,
                    };
                  },
                  ref: { id: subDocId, path: `${path}/${subDocId}` },
                };
              },
              get: async () => {
                const docs = Array.from(subMap.entries()).map(([id, data]) => ({
                  id,
                  exists: true,
                  data: () => data,
                  ref: { id, path: `${path}/${id}` },
                }));
                return {
                  empty: docs.length === 0,
                  size: docs.length,
                  docs,
                };
              },
              where: (field: string, op: string, value: any) => {
                return {
                  limit: (n: number) => ({
                    get: async () => {
                      const docs = Array.from(subMap.entries())
                        .filter(([_, data]) => data[field] === value)
                        .slice(0, n)
                        .map(([id, data]) => ({
                          id,
                          exists: true,
                          data: () => data,
                          ref: { id, path: `${path}/${id}` },
                        }));
                      return { empty: docs.length === 0, size: docs.length, docs };
                    },
                  }),
                  get: async () => {
                    const docs = Array.from(subMap.entries())
                      .filter(([_, data]) => data[field] === value)
                      .map(([id, data]) => ({
                        id,
                        exists: true,
                        data: () => data,
                        ref: { id, path: `${path}/${id}` },
                      }));
                    return { empty: docs.length === 0, size: docs.length, docs };
                  },
                };
              },
            };
          },
        };
      },
    };
  }

  batch() {
    const ops: Array<() => void> = [];
    return {
      set: (docRef: any, data: any, options?: any) => {
        ops.push(() => {
          const parts = docRef.ref ? docRef.ref.path.split('/') : [];
          // e.g. users / userId / avatars / avatarId
          const path = `${parts[0]}/${parts[1]}/${parts[2]}`;
          const id = parts[3] || docRef.id;
          if (!this.store.has(path)) this.store.set(path, new Map());
          const prev = options?.merge ? this.store.get(path)!.get(id) || {} : {};
          this.store.get(path)!.set(id, { ...prev, ...data });
        });
      },
      update: (docRef: any, data: any) => {
        ops.push(() => {
          const parts = docRef.path ? docRef.path.split('/') : [];
          const path = `${parts[0]}/${parts[1]}/${parts[2]}`;
          const id = parts[3] || docRef.id;
          const prev = this.store.get(path)?.get(id) || {};
          this.store.get(path)?.set(id, { ...prev, ...data });
        });
      },
      delete: (docRef: any) => {
        ops.push(() => {
          const parts = docRef.path ? docRef.path.split('/') : [];
          const path = `${parts[0]}/${parts[1]}/${parts[2]}`;
          const id = parts[3] || docRef.id;
          this.store.get(path)?.delete(id);
        });
      },
      commit: async () => {
        for (const op of ops) op();
      },
    };
  }
}

describe('FirestoreAvatarRepository', () => {
  const userId = 'tutor-xyz';

  it('si no existen avatares para el usuario, ejecuta seedDefaults automáticamente', async () => {
    const mockDb = new MockFirestoreDb();
    const repo = new FirestoreAvatarRepository(mockDb);

    const list = await repo.listByUser(userId);
    expect(list.length).toBe(INITIAL_DEFAULT_AVATARS.length);
    expect(list.some((a) => a.id === 'avatar-tomas-ar')).toBe(true);
    expect(list.find((a) => a.id === 'avatar-tomas-ar')?.isDefault).toBe(true);
  });

  it('permite guardar un nuevo avatar y si es default desmarca los existentes', async () => {
    const mockDb = new MockFirestoreDb();
    const repo = new FirestoreAvatarRepository(mockDb);

    // Seed inicial
    await repo.listByUser(userId);

    const newAvatar: Avatar = {
      id: 'avatar-custom-1',
      userId,
      name: 'Sofia — Growth',
      role: 'Especialista en Funnels',
      gender: 'female',
      language: 'es',
      accent: 'MX',
      voiceProvider: 'edge-tts',
      voiceId: 'es-MX-DaliaNeural',
      imageUrl: 'https://images.unsplash.com/custom.jpg',
      imageSource: 'upload',
      isDefault: true,
    };

    const saved = await repo.save(userId, newAvatar);
    expect(saved.id).toBe('avatar-custom-1');
    expect(saved.isDefault).toBe(true);

    const all = await repo.listByUser(userId);
    const tomas = all.find((a) => a.id === 'avatar-tomas-ar');
    expect(tomas?.isDefault).toBe(false);
  });

  it('permite buscar por ID y obtener el default', async () => {
    const mockDb = new MockFirestoreDb();
    const repo = new FirestoreAvatarRepository(mockDb);

    await repo.seedDefaults(userId);
    const avatar = await repo.getById(userId, 'avatar-tomas-ar');
    expect(avatar).not.toBeNull();
    expect(avatar?.name).toContain('Tomás');

    const defaultAvatar = await repo.getDefault(userId);
    expect(defaultAvatar?.id).toBe('avatar-tomas-ar');
  });

  it('impide eliminar el único avatar de la cuenta', async () => {
    const mockDb = new MockFirestoreDb();
    const repo = new FirestoreAvatarRepository(mockDb);

    // Solo creamos 1
    const single: Avatar = {
      id: 'avatar-alone',
      userId,
      name: 'Único Avatar',
      role: 'Mentor / Presentador',
      gender: 'male',
      language: 'es',
      accent: 'AR',
      voiceProvider: 'edge-tts',
      voiceId: 'es-AR-TomasNeural',
      imageUrl: '/avatars/test.jpg',
      imageSource: 'preset',
      isDefault: true,
    };
    await repo.save(userId, single);

    await expect(repo.delete(userId, 'avatar-alone')).rejects.toThrow(
      'No es posible eliminar el único avatar de la cuenta'
    );
  });

  it('al eliminar el avatar predeterminado, promueve automáticamente al siguiente como default', async () => {
    const mockDb = new MockFirestoreDb();
    const repo = new FirestoreAvatarRepository(mockDb);

    await repo.seedDefaults(userId);

    // avatar-tomas-ar es default
    const res = await repo.delete(userId, 'avatar-tomas-ar');
    expect(res.deleted).toBe(true);
    expect(res.newDefaultId).toBeDefined();

    const remaining = await repo.listByUser(userId);
    expect(remaining.length).toBe(INITIAL_DEFAULT_AVATARS.length - 1);
    expect(remaining.some((a) => a.isDefault)).toBe(true);
  });
});
