import { adminDb } from '@/firebase/admin';

export interface Lead {
  id: string;
  email: string;
  name?: string;
  mentorId?: string;
  createdAt: string;
  [key: string]: any;
}

export class AdminLeadRepository {
  private collection = adminDb.collection('leads');

  async getLeads(): Promise<Lead[]> {
    const snap = await this.collection.get();
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lead[];
  }

  async getLeadsByMentor(mentorId: string): Promise<Lead[]> {
    const snap = await this.collection.where('mentorId', '==', mentorId).get();
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lead[];
  }

  async create(data: Partial<Lead>): Promise<string> {
    const docRef = this.collection.doc();
    await docRef.set({
      ...data,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  }
}
