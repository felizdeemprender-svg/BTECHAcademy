/**
 * @fileOverview Repositorio Firestore para Empresas (Multi-Tenant B2B).
 * Persiste las organizaciones en `/companies/{companyId}`
 * y los bindings docentes en `/companies/{companyId}/tutors/{tutorId}`.
 */

import { adminDb } from '@/firebase/admin';
import {
  Company,
  CompanyRepository,
  CompanySchema,
  CompanyTutorBinding,
  CompanyTutorBindingSchema,
} from '@/domain/company';

export class FirestoreCompanyRepository implements CompanyRepository {
  constructor(private readonly db: any = adminDb) {}

  private getCompaniesCollection() {
    return this.db.collection('companies');
  }

  private getTutorsCollection(companyId: string) {
    return this.getCompaniesCollection().doc(companyId).collection('tutors');
  }

  private toDate(val: any): Date | undefined {
    if (!val) return undefined;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private mapCompanyDoc(id: string, data: Record<string, unknown>): Company {
    return CompanySchema.parse({
      ...data,
      id: (data.id as string) || id,
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    });
  }

  private mapTutorBindingDoc(tutorId: string, companyId: string, data: Record<string, unknown>): CompanyTutorBinding {
    return CompanyTutorBindingSchema.parse({
      ...data,
      companyId: (data.companyId as string) || companyId,
      tutorId: (data.tutorId as string) || tutorId,
      joinedAt: this.toDate(data.joinedAt),
    });
  }

  async findById(id: string): Promise<Company | null> {
    if (!id) return null;
    const doc = await this.getCompaniesCollection().doc(id).get();
    if (!doc.exists) return null;
    return this.mapCompanyDoc(doc.id, doc.data() || {});
  }

  async findBySlug(slug: string): Promise<Company | null> {
    if (!slug) return null;
    const snapshot = await this.getCompaniesCollection().where('slug', '==', slug).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return this.mapCompanyDoc(doc.id, doc.data() || {});
  }

  async findByOwnerId(ownerId: string): Promise<Company | null> {
    if (!ownerId) return null;
    const snapshot = await this.getCompaniesCollection().where('ownerId', '==', ownerId).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return this.mapCompanyDoc(doc.id, doc.data() || {});
  }

  async save(company: Company): Promise<Company> {
    const validated = CompanySchema.parse(company);
    const docRef = this.getCompaniesCollection().doc(validated.id);

    const dataToSave = {
      ...validated,
      updatedAt: new Date(),
    };

    await docRef.set(dataToSave, { merge: true });
    return validated;
  }

  async listTutors(companyId: string): Promise<CompanyTutorBinding[]> {
    if (!companyId) return [];
    const snapshot = await this.getTutorsCollection(companyId).get();
    if (snapshot.empty) return [];

    const list: CompanyTutorBinding[] = [];
    for (const doc of snapshot.docs) {
      try {
        list.push(this.mapTutorBindingDoc(doc.id, companyId, doc.data() || {}));
      } catch (err) {
        console.warn(`[FirestoreCompanyRepository] Doc de tutor inválido ignorado: ${doc.id}`, err);
      }
    }
    return list;
  }

  async getTutorBinding(companyId: string, tutorId: string): Promise<CompanyTutorBinding | null> {
    if (!companyId || !tutorId) return null;
    const doc = await this.getTutorsCollection(companyId).doc(tutorId).get();
    if (!doc.exists) return null;
    return this.mapTutorBindingDoc(doc.id, companyId, doc.data() || {});
  }

  async saveTutorBinding(companyId: string, binding: CompanyTutorBinding): Promise<CompanyTutorBinding> {
    const validated = CompanyTutorBindingSchema.parse(binding);
    const docRef = this.getTutorsCollection(companyId).doc(validated.tutorId);

    await docRef.set(
      {
        ...validated,
        companyId,
      },
      { merge: true },
    );

    return validated;
  }

  async removeTutorBinding(companyId: string, tutorId: string): Promise<void> {
    if (!companyId || !tutorId) return;
    await this.getTutorsCollection(companyId).doc(tutorId).delete();
  }

  async updateUsage(
    companyId: string,
    usage: { tutorsCount?: number; studentsCount?: number },
  ): Promise<void> {
    if (!companyId) return;
    const docRef = this.getCompaniesCollection().doc(companyId);

    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (usage.tutorsCount !== undefined) {
      updatePayload['subscription.currentUsage.tutorsCount'] = usage.tutorsCount;
    }
    if (usage.studentsCount !== undefined) {
      updatePayload['subscription.currentUsage.studentsCount'] = usage.studentsCount;
    }

    await docRef.update(updatePayload);
  }
}
