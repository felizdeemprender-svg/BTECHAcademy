import { describe, expect, it, beforeEach } from 'vitest';
import { FirestoreCompanyRepository } from '../company-repo';
import { Company, CompanyTutorBinding } from '@/domain/company';

class MockFirestoreDb {
  public store = new Map<string, Map<string, any>>();

  collection(name: string) {
    if (!this.store.has(name)) {
      this.store.set(name, new Map());
    }
    const colMap = this.store.get(name)!;

    return {
      doc: (docId: string) => {
        return {
          id: docId,
          collection: (subName: string) => {
            const path = `${name}/${docId}/${subName}`;
            if (!this.store.has(path)) {
              this.store.set(path, new Map());
            }
            const subMap = this.store.get(path)!;

            return {
              doc: (subDocId: string) => ({
                id: subDocId,
                get: async () => {
                  const data = subMap.get(subDocId);
                  return { id: subDocId, exists: !!data, data: () => data };
                },
                set: async (val: any) => {
                  subMap.set(subDocId, { ...val });
                },
                delete: async () => {
                  subMap.delete(subDocId);
                },
              }),
              get: async () => {
                const docs = Array.from(subMap.entries()).map(([id, data]) => ({
                  id,
                  exists: true,
                  data: () => data,
                }));
                return { empty: docs.length === 0, size: docs.length, docs };
              },
            };
          },
          get: async () => {
            const data = colMap.get(docId);
            return { id: docId, exists: !!data, data: () => data };
          },
          set: async (val: any) => {
            colMap.set(docId, { ...val });
          },
          update: async (patch: any) => {
            const current = colMap.get(docId) || {};
            // handle nested paths
            const next = { ...current };
            for (const [key, v] of Object.entries(patch)) {
              if (key.includes('.')) {
                const parts = key.split('.');
                let target = next;
                for (let i = 0; i < parts.length - 1; i++) {
                  target[parts[i]] = target[parts[i]] || {};
                  target = target[parts[i]];
                }
                target[parts[parts.length - 1]] = v;
              } else {
                next[key] = v;
              }
            }
            colMap.set(docId, next);
          },
          delete: async () => {
            colMap.delete(docId);
          },
        };
      },
      where: (field: string, _op: string, value: any) => ({
        limit: (n: number) => ({
          get: async () => {
            const docs = Array.from(colMap.entries())
              .filter(([_, data]) => data[field] === value)
              .slice(0, n)
              .map(([id, data]) => ({
                id,
                exists: true,
                data: () => data,
              }));
            return { empty: docs.length === 0, size: docs.length, docs };
          },
        }),
      }),
    };
  }
}

describe('FirestoreCompanyRepository', () => {
  let mockDb: MockFirestoreDb;
  let repo: FirestoreCompanyRepository;

  beforeEach(() => {
    mockDb = new MockFirestoreDb();
    repo = new FirestoreCompanyRepository(mockDb as any);
  });

  const baseCompany: Company = {
    id: 'company_btech',
    name: 'BTECH Academy',
    slug: 'btech-academy',
    ownerId: 'usr_owner_42',
    branding: {
      primaryColor: '#00FF00',
    },
    subscription: {
      planId: 'plan_enterprise_pro',
      status: 'active',
      limits: { maxTutors: 5, maxStudents: 200 },
      currentUsage: { tutorsCount: 1, studentsCount: 40 },
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  it('guarda y recupera una empresa por ID', async () => {
    await repo.save(baseCompany);

    const fetched = await repo.findById('company_btech');
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('BTECH Academy');
    expect(fetched?.slug).toBe('btech-academy');
    expect(fetched?.subscription.limits.maxTutors).toBe(5);
  });

  it('recupera una empresa por slug', async () => {
    await repo.save(baseCompany);

    const fetched = await repo.findBySlug('btech-academy');
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe('company_btech');

    const notFound = await repo.findBySlug('no-existe');
    expect(notFound).toBeNull();
  });

  it('recupera una empresa por ownerId', async () => {
    await repo.save(baseCompany);

    const fetched = await repo.findByOwnerId('usr_owner_42');
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('BTECH Academy');

    const notFound = await repo.findByOwnerId('otro_owner');
    expect(notFound).toBeNull();
  });

  it('guarda, lista y elimina tutores de la subcolección', async () => {
    await repo.save(baseCompany);

    const binding: CompanyTutorBinding = {
      companyId: 'company_btech',
      tutorId: 'tutor_101',
      email: 'tutor101@btech.com',
      displayName: 'Marcos Docente',
      roles: ['mentor'],
      status: 'active',
      permissions: {
        canCreateCourses: true,
        canCreatePrograms: false,
        canManageStudents: true,
        canAccessMarketing: false,
        canCreateCampaigns: false,
        canCreateVideos: false,
      },
      assignedStudentsCount: 12,
      joinedAt: new Date('2026-02-01'),
    };

    await repo.saveTutorBinding('company_btech', binding);

    const single = await repo.getTutorBinding('company_btech', 'tutor_101');
    expect(single).not.toBeNull();
    expect(single?.displayName).toBe('Marcos Docente');
    expect(single?.permissions.canCreateCourses).toBe(true);

    const list = await repo.listTutors('company_btech');
    expect(list.length).toBe(1);
    expect(list[0].tutorId).toBe('tutor_101');

    await repo.removeTutorBinding('company_btech', 'tutor_101');
    const afterDelete = await repo.getTutorBinding('company_btech', 'tutor_101');
    expect(afterDelete).toBeNull();
  });

  it('actualiza los contadores de cuota de la suscripción', async () => {
    await repo.save(baseCompany);

    await repo.updateUsage('company_btech', { tutorsCount: 3, studentsCount: 85 });

    const updated = await repo.findById('company_btech');
    expect(updated?.subscription.currentUsage.tutorsCount).toBe(3);
    expect(updated?.subscription.currentUsage.studentsCount).toBe(85);
  });
});
