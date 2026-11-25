import { describe, expect, it, vi } from 'vitest';
import { createCourse, type CreateCourseDeps } from '../catalog/use-cases/create-course';
import type { CourseAuthor, NewCourseDoc } from '../catalog/course-repository';

describe('Cross-Journey: Límites en Creación de Cursos por Tipo de Tutor y Plan (Cortesía, Pro, Ilimitado y Empresa)', () => {
  function createCourseHarness(initialAuthors: Record<string, Partial<CourseAuthor> & { isAdmin?: boolean }>, initialCourses: NewCourseDoc[] = []) {
    const authorsDb = new Map<string, any>(Object.entries(initialAuthors));
    const coursesDb = new Map<string, NewCourseDoc>(initialCourses.map(c => [c.id, c]));

    const deps: CreateCourseDeps = {
      authorSource: {
        findAuthor: async (mentorId: string): Promise<CourseAuthor | null> => {
          const a = authorsDb.get(mentorId);
          if (!a) return null;
          return {
            isAdmin: a.isAdmin ?? false,
            companyId: a.companyId,
            companyRole: a.companyRole,
            subscription: a.subscription,
            ...a,
          };
        },
      },
      counter: {
        countActiveCoursesByMentor: async (mentorId: string): Promise<number> => {
          let count = 0;
          for (const c of coursesDb.values()) {
            if (c.mentorId === mentorId && (c.data as any)?.isActive !== false && (c.data as any)?.status !== 'archived') {
              count++;
            }
          }
          return count;
        },
      },
      writer: {
        createCourse: async (doc: NewCourseDoc): Promise<void> => {
          coursesDb.set(doc.id, doc);
        },
      },
    };

    return { deps, authorsDb, coursesDb };
  }

  // =========================================================================
  // 1. TUTOR DE CORTESÍA (TRIAL / CORTESÍA - 1 CURSO MÁXIMO)
  // =========================================================================
  describe('1. Tutores de Cortesía (Límite = 1 Curso)', () => {
    const courtesyMentorId = 'tutor_cortesia_01';
    const authors = {
      [courtesyMentorId]: {
        isAdmin: false,
        subscription: {
          planId: 'cortesia_trial',
          endDate: '2030-01-01',
          maxSimultaneousCourses: 1, // Cupo estricto de cortesía
        },
      },
    };

    it('(+) Permite crear el primer curso de cortesía exitosamente', async () => {
      const { deps, coursesDb } = createCourseHarness(authors);

      const res = await createCourse(deps, {
        mentorId: courtesyMentorId,
        id: 'curso_cortesia_1',
        courseData: { title: 'Curso de Prueba de Cortesía', price: 0, status: 'published', isActive: true },
      });

      expect(res.ok).toBe(true);
      if (res.ok) expect(res.value.id).toBe('curso_cortesia_1');
      expect(coursesDb.has('curso_cortesia_1')).toBe(true);
    });

    it('(-) Bloquea con 403 cuando el tutor de cortesía intenta crear un segundo curso superando su cupo', async () => {
      const existingCourse: NewCourseDoc = {
        id: 'curso_cortesia_1',
        mentorId: courtesyMentorId,
        data: { title: 'Curso 1 Activo', isActive: true, status: 'published' },
      };
      const { deps, coursesDb } = createCourseHarness(authors, [existingCourse]);

      const res = await createCourse(deps, {
        mentorId: courtesyMentorId,
        id: 'curso_cortesia_2_exceso',
        courseData: { title: 'Curso 2 en Exceso', price: 10000 },
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('FORBIDDEN');
        expect(res.error.message).toBe('Course limit reached');
        expect(res.error.details).toEqual({ message: 'Limit of 1 active courses reached.' });
      }
      expect(coursesDb.has('curso_cortesia_2_exceso')).toBe(false);
    });

    it('(+) Si el tutor de cortesía archiva o desactiva su curso previo, libera el cupo y puede crear uno nuevo', async () => {
      // El curso 1 fue archivado
      const archivedCourse: NewCourseDoc = {
        id: 'curso_cortesia_1',
        mentorId: courtesyMentorId,
        data: { title: 'Curso 1 Archivó', isActive: false, status: 'archived' },
      };
      const { deps, coursesDb } = createCourseHarness(authors, [archivedCourse]);

      const res = await createCourse(deps, {
        mentorId: courtesyMentorId,
        id: 'curso_cortesia_nuevo',
        courseData: { title: 'Nuevo Curso Reemplazante', isActive: true, status: 'published' },
      });

      expect(res.ok).toBe(true);
      expect(coursesDb.has('curso_cortesia_nuevo')).toBe(true);
    });
  });

  // =========================================================================
  // 2. TUTOR CON CORTESÍA / SUSCRIPCIÓN EXPIRADA
  // =========================================================================
  describe('2. Tutores con Período de Cortesía Expirado', () => {
    it('(-) Bloquea la creación si el período de cortesía o suscripción ya venció', async () => {
      const expiredMentorId = 'tutor_vencido_99';
      const authors = {
        [expiredMentorId]: {
          isAdmin: false,
          subscription: {
            planId: 'trial_vencido',
            endDate: '2024-01-01', // Fecha pasada
            maxSimultaneousCourses: 5,
          },
        },
      };
      const { deps } = createCourseHarness(authors);

      const res = await createCourse(deps, {
        mentorId: expiredMentorId,
        id: 'curso_bloqueado',
        courseData: { title: 'Intento en cuenta vencida' },
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('FORBIDDEN');
        expect(res.error.message).toBe('Valid subscription required');
      }
    });

    it('(-) Bloquea la creación si el usuario no tiene ningún registro de suscripción', async () => {
      const noSubMentorId = 'tutor_sin_sub';
      const authors = {
        [noSubMentorId]: {
          isAdmin: false,
          subscription: undefined,
        },
      };
      const { deps } = createCourseHarness(authors);

      const res = await createCourse(deps, {
        mentorId: noSubMentorId,
        id: 'curso_bloqueado_sin_sub',
        courseData: { title: 'Sin suscripción' },
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('FORBIDDEN');
        expect(res.error.message).toBe('Valid subscription required');
      }
    });
  });

  // =========================================================================
  // 3. TUTOR CON PLAN PRO (LÍMITE = 5 CURSOS)
  // =========================================================================
  describe('3. Tutores con Plan Pro (Límite = 5 Cursos)', () => {
    const proMentorId = 'tutor_plan_pro';
    const authors = {
      [proMentorId]: {
        isAdmin: false,
        subscription: {
          planId: 'pro',
          endDate: '2030-12-31',
          maxSimultaneousCourses: 5,
        },
      },
    };

    it('(+) Permite crear hasta 5 cursos simultáneos sin bloqueo', async () => {
      const initialCourses: NewCourseDoc[] = [
        { id: 'c1', mentorId: proMentorId, data: { isActive: true } },
        { id: 'c2', mentorId: proMentorId, data: { isActive: true } },
        { id: 'c3', mentorId: proMentorId, data: { isActive: true } },
        { id: 'c4', mentorId: proMentorId, data: { isActive: true } },
      ];
      const { deps, coursesDb } = createCourseHarness(authors, initialCourses);

      // Creación del quinto curso (aún dentro del cupo)
      const res = await createCourse(deps, {
        mentorId: proMentorId,
        id: 'c5_quinto_curso',
        courseData: { title: 'Quinto Curso Pro' },
      });

      expect(res.ok).toBe(true);
      expect(coursesDb.has('c5_quinto_curso')).toBe(true);
    });

    it('(-) Bloquea con 403 al intentar crear el sexto curso con cupo lleno', async () => {
      const initialCourses: NewCourseDoc[] = [
        { id: 'c1', mentorId: proMentorId, data: { isActive: true } },
        { id: 'c2', mentorId: proMentorId, data: { isActive: true } },
        { id: 'c3', mentorId: proMentorId, data: { isActive: true } },
        { id: 'c4', mentorId: proMentorId, data: { isActive: true } },
        { id: 'c5', mentorId: proMentorId, data: { isActive: true } },
      ];
      const { deps } = createCourseHarness(authors, initialCourses);

      const res = await createCourse(deps, {
        mentorId: proMentorId,
        id: 'c6_exceso',
        courseData: { title: 'Sexto Curso en Exceso' },
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('FORBIDDEN');
        expect(res.error.message).toBe('Course limit reached');
        expect(res.error.details).toEqual({ message: 'Limit of 5 active courses reached.' });
      }
    });
  });

  // =========================================================================
  // 4. TUTOR DE EMPRESA / CORPORATIVO (HERENCIA Y DRAFT FORZADO)
  // =========================================================================
  describe('4. Tutores de Empresa / Corporativos', () => {
    it('(+) Omite suscripción individual, asigna companyId y fuerza estado draft para aprobación', async () => {
      const companyTutorId = 'tutor_empresa_44';
      const companyId = 'empresa_latam_corp';
      const authors = {
        [companyTutorId]: {
          isAdmin: false,
          companyId,
          companyRole: 'tutor',
          subscription: undefined, // No tiene suscripción individual
        },
      };
      const { deps, coursesDb } = createCourseHarness(authors);

      const res = await createCourse(deps, {
        mentorId: companyTutorId,
        id: 'curso_b2b_1',
        courseData: { title: 'Capacitación Interna de Ventas', status: 'published' },
      });

      expect(res.ok).toBe(true);
      const created = coursesDb.get('curso_b2b_1');
      expect(created).toBeDefined();
      expect(created?.data).toMatchObject({
        title: 'Capacitación Interna de Ventas',
        companyId,
        ownerId: companyId,
        status: 'draft', // Forzado a borrador para revisión corporativa
      });
    });
  });

  // =========================================================================
  // 5. SUPER ADMINISTRADOR (BYPASS TOTAL)
  // =========================================================================
  describe('5. Super Administrador', () => {
    it('(+) Bypass total: Puede crear cursos ilimitados sin suscripción ni límites', async () => {
      const adminId = 'super_admin_id';
      const authors = {
        [adminId]: {
          isAdmin: true,
          subscription: undefined,
        },
      };
      const { deps, coursesDb } = createCourseHarness(authors);

      const res = await createCourse(deps, {
        mentorId: adminId,
        id: 'curso_infra_admin',
        courseData: { title: 'Curso Oficial Fastoria' },
      });

      expect(res.ok).toBe(true);
      expect(coursesDb.has('curso_infra_admin')).toBe(true);
    });
  });
});
