import { adminDb } from '@/firebase/admin';
import type { SalesPage } from '@/domain/catalog';
import { mapSalesPageDoc } from './mappers';

export class AdminSalesPageRepository {
  private collection = adminDb.collection('salesPages');

  async getById(id: string): Promise<SalesPage | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data();
    if (!data) return null;
    return mapSalesPageDoc(doc.id, data);
  }

  async update(id: string, data: Partial<SalesPage>): Promise<void> {
    await this.collection.doc(id).update({
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  async create(id: string, data: Partial<SalesPage>): Promise<void> {
    await this.collection.doc(id).set({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  async listByMentor(mentorId: string): Promise<SalesPage[]> {
    const snapshot = await this.collection.where('mentorId', '==', mentorId).get();
    const out: SalesPage[] = [];
    for (const doc of snapshot.docs) {
      try {
        out.push(mapSalesPageDoc(doc.id, doc.data() || {}));
      } catch (e) {
        console.warn(`[admin-sales-page-repo] Corrupt doc skipped in listByMentor: ${doc.id}`, e);
      }
    }
    return out;
  }

  async listAll(): Promise<SalesPage[]> {
    const snapshot = await this.collection.get();
    const out: SalesPage[] = [];
    for (const doc of snapshot.docs) {
      try {
        out.push(mapSalesPageDoc(doc.id, doc.data() || {}));
      } catch (e) {
        console.warn(`[admin-sales-page-repo] Corrupt doc skipped in listAll: ${doc.id}`, e);
      }
    }
    return out;
  }
}
