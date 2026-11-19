/**
 * Tests Unitarios Puros: Dominio Empresa (Multi-Tenant B2B).
 * Sin dependencias de Firebase ni servicios externos.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  Company,
  CompanySchema,
  hasTutorCapacity,
  hasStudentCapacity,
  CompanyTutorBinding,
  CompanyRepository,
  createCompany,
  inviteTutorToCompany,
  updateTutorPermissions,
  assignStudentToCompanyTutor,
} from '../index';

class InMemoryCompanyRepository implements CompanyRepository {
  private companies = new Map<string, Company>();
  private tutors = new Map<string, CompanyTutorBinding>(); // key: `${companyId}_${tutorId}`

  async findById(id: string): Promise<Company | null> {
    return this.companies.get(id) || null;
  }

  async findBySlug(slug: string): Promise<Company | null> {
    for (const c of this.companies.values()) {
      if (c.slug === slug) return c;
    }
    return null;
  }

  async findByOwnerId(ownerId: string): Promise<Company | null> {
    for (const c of this.companies.values()) {
      if (c.ownerId === ownerId) return c;
    }
    return null;
  }

  async save(company: Company): Promise<Company> {
    this.companies.set(company.id, company);
    return company;
  }

  async listTutors(companyId: string): Promise<CompanyTutorBinding[]> {
    const list: CompanyTutorBinding[] = [];
    for (const binding of this.tutors.values()) {
      if (binding.companyId === companyId) list.push(binding);
    }
    return list;
  }

  async getTutorBinding(companyId: string, tutorId: string): Promise<CompanyTutorBinding | null> {
    return this.tutors.get(`${companyId}_${tutorId}`) || null;
  }

  async saveTutorBinding(companyId: string, binding: CompanyTutorBinding): Promise<CompanyTutorBinding> {
    this.tutors.set(`${companyId}_${binding.tutorId}`, binding);
    return binding;
  }

  async removeTutorBinding(companyId: string, tutorId: string): Promise<void> {
    this.tutors.delete(`${companyId}_${tutorId}`);
  }

  async updateUsage(companyId: string, usage: { tutorsCount?: number; studentsCount?: number }): Promise<void> {
    const company = this.companies.get(companyId);
    if (!company) return;
    this.companies.set(companyId, {
      ...company,
      subscription: {
        ...company.subscription,
        currentUsage: {
          tutorsCount: usage.tutorsCount ?? company.subscription.currentUsage.tutorsCount,
          studentsCount: usage.studentsCount ?? company.subscription.currentUsage.studentsCount,
        },
      },
    });
  }
}

describe('Dominio Empresa — Entidades y Schemas', () => {
  it('valida una empresa correcta con valores por defecto', () => {
    const valid = CompanySchema.parse({
      id: 'comp_1',
      name: 'Academia Digital Pro',
      slug: 'academia-digital',
      ownerId: 'usr_owner_1',
      subscription: {
        planId: 'plan_tier1',
        limits: { maxTutors: 5, maxStudents: 100 },
      },
    });

    expect(valid.name).toBe('Academia Digital Pro');
    expect(valid.subscription.limits.maxTutors).toBe(5);
    expect(valid.subscription.currentUsage.tutorsCount).toBe(0);
  });

  it('rechaza slugs con mayúsculas, espacios o caracteres especiales', () => {
    expect(() =>
      CompanySchema.parse({
        id: 'comp_1',
        name: 'Academia',
        slug: 'Academia Digital!',
        ownerId: 'usr_1',
        subscription: { planId: 'p1', limits: { maxTutors: 2, maxStudents: 20 } },
      }),
    ).toThrow();
  });

  it('verifica límites y capacidad de tutores y alumnos correctamente', () => {
    const company = CompanySchema.parse({
      id: 'comp_1',
      name: 'Academia',
      slug: 'academia',
      ownerId: 'usr_1',
      subscription: {
        planId: 'p1',
        limits: { maxTutors: 2, maxStudents: 10 },
        currentUsage: { tutorsCount: 1, studentsCount: 9 },
      },
    });

    expect(hasTutorCapacity(company)).toBe(true);
    expect(hasStudentCapacity(company)).toBe(true);

    const fullCompany: Company = {
      ...company,
      subscription: {
        ...company.subscription,
        currentUsage: { tutorsCount: 2, studentsCount: 10 },
      },
    };

    expect(hasTutorCapacity(fullCompany)).toBe(false);
    expect(hasStudentCapacity(fullCompany)).toBe(false);

    const canceledCompany: Company = {
      ...company,
      subscription: {
        ...company.subscription,
        status: 'canceled',
        currentUsage: { tutorsCount: 0, studentsCount: 0 },
      },
    };

    expect(hasTutorCapacity(canceledCompany)).toBe(false);
    expect(hasStudentCapacity(canceledCompany)).toBe(false);
  });

  it('permite tutores y alumnos ilimitados cuando los límites son -1', () => {
    const unlimitedCompany: Company = {
      id: 'comp_unlimited',
      name: 'Unlimited Enterprise',
      slug: 'unlimited-ent',
      ownerId: 'owner_unlimited',
      branding: {},
      subscription: {
        planId: 'enterprise_infinite',
        status: 'active',
        limits: { maxTutors: -1, maxStudents: -1 },
        currentUsage: { tutorsCount: 9999, studentsCount: 99999 },
      },
    };

    expect(hasTutorCapacity(unlimitedCompany)).toBe(true);
    expect(hasStudentCapacity(unlimitedCompany)).toBe(true);
  });
});

describe('Casos de Uso de Empresa', () => {
  let repo: InMemoryCompanyRepository;

  beforeEach(() => {
    repo = new InMemoryCompanyRepository();
  });

  describe('createCompany', () => {
    it('crea y persiste una nueva empresa correctamente', async () => {
      const res = await createCompany(repo, {
        id: 'comp_test',
        name: 'BTECH Enterprise',
        slug: 'btech-enterprise',
        ownerId: 'usr_owner_10',
        planId: 'plan_corp',
        limits: { maxTutors: 10, maxStudents: 500 },
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.value.id).toBe('comp_test');
      expect(res.value.slug).toBe('btech-enterprise');

      const persisted = await repo.findById('comp_test');
      expect(persisted).not.toBeNull();
      expect(persisted?.name).toBe('BTECH Enterprise');
    });

    it('rechaza slug duplicado', async () => {
      await createCompany(repo, {
        id: 'comp_1',
        name: 'Empresa Uno',
        slug: 'empresa-repetida',
        ownerId: 'usr_1',
      });

      const res = await createCompany(repo, {
        id: 'comp_2',
        name: 'Empresa Dos',
        slug: 'empresa-repetida',
        ownerId: 'usr_2',
      });

      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe('CONFLICT');
      expect(res.error.message).toContain('ya está en uso');
    });

    it('rechaza que un owner cree más de una empresa', async () => {
      await createCompany(repo, {
        id: 'comp_1',
        name: 'Empresa Uno',
        slug: 'empresa-uno',
        ownerId: 'owner_duplicado',
      });

      const res = await createCompany(repo, {
        id: 'comp_2',
        name: 'Empresa Dos',
        slug: 'empresa-dos',
        ownerId: 'owner_duplicado',
      });

      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe('CONFLICT');
      expect(res.error.message).toContain('ya administra');
    });
  });

  describe('inviteTutorToCompany', () => {
    beforeEach(async () => {
      await createCompany(repo, {
        id: 'comp_alpha',
        name: 'Alpha Corp',
        slug: 'alpha-corp',
        ownerId: 'owner_alpha',
        limits: { maxTutors: 2, maxStudents: 20 },
      });
    });

    it('da de alta a un tutor y actualiza el contador de uso', async () => {
      const res = await inviteTutorToCompany(repo, {
        companyId: 'comp_alpha',
        tutorId: 'tutor_1',
        email: 'tutor1@alpha.com',
        displayName: 'Prof. Carlos',
        permissions: {
          canCreateCourses: true,
          canCreatePrograms: false,
          canManageStudents: true,
          canAccessMarketing: false,
        },
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.value.status).toBe('active');
      expect(res.value.permissions.canCreateCourses).toBe(true);

      const company = await repo.findById('comp_alpha');
      expect(company?.subscription.currentUsage.tutorsCount).toBe(1);
    });

    it('bloquea el alta cuando se alcanza el límite de tutores contratados', async () => {
      // 1er tutor
      await inviteTutorToCompany(repo, {
        companyId: 'comp_alpha',
        tutorId: 'tutor_1',
        email: 'tutor1@alpha.com',
        displayName: 'Tutor 1',
      });

      // 2do tutor (alcanza el límite de 2)
      await inviteTutorToCompany(repo, {
        companyId: 'comp_alpha',
        tutorId: 'tutor_2',
        email: 'tutor2@alpha.com',
        displayName: 'Tutor 2',
      });

      // 3er tutor (debe ser rechazado por cuota)
      const res = await inviteTutorToCompany(repo, {
        companyId: 'comp_alpha',
        tutorId: 'tutor_3',
        email: 'tutor3@alpha.com',
        displayName: 'Tutor 3 Excedente',
      });

      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe('FORBIDDEN');
      expect(res.error.message).toContain('Límite de tutores alcanzado');
    });

    it('rechaza invitar al mismo tutor dos veces a la misma empresa', async () => {
      await inviteTutorToCompany(repo, {
        companyId: 'comp_alpha',
        tutorId: 'tutor_repetido',
        email: 'repetido@alpha.com',
        displayName: 'Tutor Repetido',
      });

      const res = await inviteTutorToCompany(repo, {
        companyId: 'comp_alpha',
        tutorId: 'tutor_repetido',
        email: 'repetido@alpha.com',
        displayName: 'Tutor Repetido',
      });

      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe('CONFLICT');
    });
  });

  describe('updateTutorPermissions', () => {
    beforeEach(async () => {
      await createCompany(repo, {
        id: 'comp_beta',
        name: 'Beta Academy',
        slug: 'beta-academy',
        ownerId: 'owner_beta',
      });

      await inviteTutorToCompany(repo, {
        companyId: 'comp_beta',
        tutorId: 'tutor_beta_1',
        email: 'tutor@beta.com',
        displayName: 'Laura Docente',
      });
    });

    it('actualiza las potestades granulares del tutor correctamente', async () => {
      const res = await updateTutorPermissions(repo, {
        companyId: 'comp_beta',
        tutorId: 'tutor_beta_1',
        permissions: {
          canCreateCourses: true,
          canCreatePrograms: true,
          canManageStudents: false,
          canAccessMarketing: true,
          canCreateCampaigns: true,
          canCreateVideos: false,
        },
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.value.permissions.canCreateCourses).toBe(true);
      expect(res.value.permissions.canCreatePrograms).toBe(true);
      expect(res.value.permissions.canManageStudents).toBe(false);
      expect(res.value.permissions.canAccessMarketing).toBe(true);
      expect(res.value.permissions.canCreateCampaigns).toBe(true);
      expect(res.value.permissions.canCreateVideos).toBe(false);
    });

    it('retorna NOT_FOUND si el tutor no está vinculado a la empresa', async () => {
      const res = await updateTutorPermissions(repo, {
        companyId: 'comp_beta',
        tutorId: 'tutor_inexistente',
        permissions: {
          canCreateCourses: true,
          canCreatePrograms: false,
          canManageStudents: false,
          canAccessMarketing: false,
          canCreateCampaigns: false,
          canCreateVideos: false,
        },
      });

      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe('NOT_FOUND');
    });
  });

  describe('assignStudentToCompanyTutor', () => {
    beforeEach(async () => {
      await createCompany(repo, {
        id: 'comp_gamma',
        name: 'Gamma Tech',
        slug: 'gamma-tech',
        ownerId: 'owner_gamma',
      });

      await inviteTutorToCompany(repo, {
        companyId: 'comp_gamma',
        tutorId: 'tutor_gamma_active',
        email: 'active@gamma.com',
        displayName: 'Tutor Activo',
      });
    });

    it('asigna un alumno al tutor activo de la empresa', async () => {
      const res = await assignStudentToCompanyTutor(repo, {
        companyId: 'comp_gamma',
        studentId: 'student_123',
        tutorId: 'tutor_gamma_active',
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.value.assignedTutorId).toBe('tutor_gamma_active');
      expect(res.value.assignedTutorName).toBe('Tutor Activo');
    });

    it('rechaza asignar a un tutor que no pertenece a la empresa', async () => {
      const res = await assignStudentToCompanyTutor(repo, {
        companyId: 'comp_gamma',
        studentId: 'student_123',
        tutorId: 'tutor_ajeno',
      });

      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe('NOT_FOUND');
    });
  });
});
