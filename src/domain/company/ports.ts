/**
 * Dominio Empresa — Puertos e Interfaces de Repositorio.
 */
import type { Company } from './company';
import type { CompanyTutorBinding } from './permissions';

export interface CompanyRepository {
  findById(id: string): Promise<Company | null>;
  findBySlug(slug: string): Promise<Company | null>;
  findByOwnerId(ownerId: string): Promise<Company | null>;
  save(company: Company): Promise<Company>;
  listTutors(companyId: string): Promise<CompanyTutorBinding[]>;
  getTutorBinding(companyId: string, tutorId: string): Promise<CompanyTutorBinding | null>;
  saveTutorBinding(companyId: string, binding: CompanyTutorBinding): Promise<CompanyTutorBinding>;
  removeTutorBinding(companyId: string, tutorId: string): Promise<void>;
  updateUsage(companyId: string, usage: { tutorsCount?: number; studentsCount?: number }): Promise<void>;
}
