import { describe, expect, it, vi } from 'vitest';
import { handleSyncCourseProgress } from '@/lib/api/course-progress-sync';
import { computeTaskSyncPatch, enrichLinkedTasksWithEnrollments } from '@/lib/courses/sync-mentoring-tasks';
import type { FirestoreGateway } from '@/data/firestore/gateway';

describe('Cross-Journey: Mentorías, Cursos y Sincronización de Desafíos de Módulos', () => {
  const tutorId = 'tutor_mentor_99';
  const studentUid = 'student_mentee_10';
  const studentEmail = 'mentee@fastoria.com';
  const courseId = 'course_arquitectura_limpia';
  const followupId = 'followup_mentoria_1a1_44';

  function createTestStore() {
    const store = {
      courses: new Map<string, any>([
        [courseId, {
          id: courseId,
          title: 'Arquitectura Limpia y DDD en Producción',
          mentorId: tutorId,
          modules: [
            { id: 'mod_dominio', title: 'Entidades y Casos de Uso' },
            { id: 'mod_puertos', title: 'Puertos y Adaptadores' },
          ],
        }],
      ]),
      enrollments: new Map<string, any>([
        [`enroll_${studentUid}_${courseId}`, {
          id: `enroll_${studentUid}_${courseId}`,
          studentId: studentUid,
          inviteEmail: studentEmail,
          courseId,
          status: 'active',
          progressPercent: 0,
          progress: {
            completedModules: [],
            evaluations: {},
          },
        }],
      ]),
      followups: new Map<string, any>([
        [followupId, {
          id: followupId,
          title: 'Programa de Alto Rendimiento Backend',
          mentorId: tutorId,
          studentId: studentUid,
          studentEmail,
          status: 'active',
        }],
      ]),
      // Tareas y desafíos vinculados dentro de la mentoría
      followupTasks: new Map<string, any>([
        [`${followupId}_task_mod_1`, {
          id: 'task_mod_1',
          followupId,
          title: 'Desafío: Implementar Capa de Dominio',
          type: 'module',
          courseId,
          moduleId: 'mod_dominio',
          status: 'pending',
          progress: 0,
        }],
        [`${followupId}_task_course_complete`, {
          id: 'task_course_complete',
          followupId,
          title: 'Hito Final: Completar Certificación de Arquitectura',
          type: 'course',
          courseId,
          status: 'pending',
          progress: 0,
        }],
      ]),
      student_achievements: new Map<string, any>(),
    };

    const gateway: FirestoreGateway = {
      getDoc: vi.fn().mockImplementation(async (col: string, id: string) => {
        const item = (store as any)[col]?.get(id);
        if (!item) return null;
        return { exists: true, id, data: () => item };
      }),
      createDoc: vi.fn().mockImplementation(async (col: string, id: string, data: any) => {
        (store as any)[col]?.set(id, data);
      }),
      mergeDoc: vi.fn().mockImplementation(async (col: string, id: string, data: any) => {
        const existing = (store as any)[col]?.get(id) || {};
        (store as any)[col]?.set(id, { ...existing, ...data });
      }),
      updateDoc: vi.fn().mockImplementation(async (col: string, id: string, patch: any) => {
        const existing = (store as any)[col]?.get(id) || {};
        (store as any)[col]?.set(id, { ...existing, ...patch });
      }),
      queryByField: vi.fn().mockImplementation(async (col: string, field: string, value: any) => {
        const colMap = (store as any)[col];
        if (!colMap) return { docs: [] };
        const matches: any[] = [];
        for (const [id, doc] of colMap.entries()) {
          if (doc[field] === value) matches.push({ exists: true, id, data: () => doc });
        }
        return { docs: matches };
      }),
      listSubDocs: vi.fn().mockImplementation(async (parentCol: string, parentId: string, subCol: string) => {
        if (parentCol === 'courses' && subCol === 'modules') {
          return {
            docs: [
              { id: 'mod_dominio', data: () => ({ title: 'Entidades y Casos de Uso' }) },
              { id: 'mod_puertos', data: () => ({ title: 'Puertos y Adaptadores' }) },
            ],
          };
        }
        return { docs: [] };
      }),
      serverTimestamp: vi.fn().mockImplementation(() => new Date()),
    } as unknown as FirestoreGateway;

    return { gateway, store };
  }

  it('Circuito Cross: Alumno rinde examen de módulo -> Se evalúa y califica -> Sincroniza y completa automáticamente el desafío en la mentoría', async () => {
    const { gateway, store } = createTestStore();
    const caller = { uid: studentUid, email: studentEmail, role: 'alumno' };

    // =========================================================================
    // PASO 1: El Alumno rinde y aprueba el Módulo 1 (Dominio) con score 95/100
    // =========================================================================
    const enrollment = store.enrollments.get(`enroll_${studentUid}_${courseId}`);
    enrollment.progress = {
      completedModules: ['mod_dominio'],
      evaluations: {
        mod_dominio: {
          score: 95,
          feedback: 'Excelente separación entre lógica pura e infraestructura.',
          strengths: ['Inmutabilidad', 'Entidades ricas'],
          submittedAt: new Date().toISOString(),
        },
      },
    };
    enrollment.progressPercent = 50;

    const syncResponse = await handleSyncCourseProgress(gateway, caller as any, courseId, {
      moduleId: 'mod_dominio',
      score: 95,
      feedback: 'Excelente separación entre lógica pura e infraestructura.',
    });

    expect(syncResponse.status).toBe(200);

    // =========================================================================
    // PASO 2: Motor de Tareas de Mentoría calcula el parche para los desafíos
    // =========================================================================
    const taskMod1 = store.followupTasks.get(`${followupId}_task_mod_1`);
    expect(taskMod1.status).toBe('pending');

    // Sincronización del desafío de módulo
    const patchTask1 = computeTaskSyncPatch(taskMod1, {
      courseId,
      completedModules: enrollment.progress.completedModules,
      progressPercent: enrollment.progressPercent,
      score: enrollment.progress.evaluations.mod_dominio.score,
      feedback: enrollment.progress.evaluations.mod_dominio.feedback,
      nowIso: new Date().toISOString(),
    });

    // El desafío de módulo debe pasar automáticamente a 'completed' con su nota
    expect(patchTask1).not.toBeNull();
    expect(patchTask1?.status).toBe('completed');
    expect(patchTask1?.score).toBe(95);
    expect(patchTask1?.progress).toBe(100);

    // Aplicar parche a la tarea de la mentoría
    Object.assign(taskMod1, patchTask1);
    expect(taskMod1.status).toBe('completed');

    // En cambio, el desafío de curso completo aún debe permanecer pendiente porque progressPercent = 50%
    const taskCourse = store.followupTasks.get(`${followupId}_task_course_complete`);
    const patchTaskCourseMid = computeTaskSyncPatch(taskCourse, {
      courseId,
      completedModules: enrollment.progress.completedModules,
      progressPercent: enrollment.progressPercent,
      nowIso: new Date().toISOString(),
    });
    expect(patchTaskCourseMid?.status).toBe('pending');
    expect(patchTaskCourseMid?.progress).toBe(50);

    // =========================================================================
    // PASO 3: El Alumno completa el Módulo 2 y finaliza el 100% del Curso
    // =========================================================================
    enrollment.progress.completedModules = ['mod_dominio', 'mod_puertos'];
    enrollment.progress.evaluations.mod_puertos = {
      score: 100,
      feedback: 'Implementación impecable de adaptadores desacoplados.',
      submittedAt: new Date().toISOString(),
    };
    enrollment.progressPercent = 100;

    const finalSyncResponse = await handleSyncCourseProgress(gateway, caller as any, courseId, {
      moduleId: 'mod_puertos',
      score: 100,
    });
    expect(finalSyncResponse.status).toBe(200);

    // Sincronización del Hito Final de la Mentoría
    const patchTaskCourseFinal = computeTaskSyncPatch(taskCourse, {
      courseId,
      completedModules: enrollment.progress.completedModules,
      progressPercent: enrollment.progressPercent,
      score: 100,
      feedback: 'Curso completado con éxito',
      nowIso: new Date().toISOString(),
    });

    expect(patchTaskCourseFinal).not.toBeNull();
    expect(patchTaskCourseFinal?.status).toBe('completed');
    expect(patchTaskCourseFinal?.progress).toBe(100);

    Object.assign(taskCourse, patchTaskCourseFinal);
    expect(taskCourse.status).toBe('completed');

    // =========================================================================
    // PASO 4: Enriquecimiento para la vista del Tutor (/mentoria/desafios)
    // =========================================================================
    const enrichedTasks = enrichLinkedTasksWithEnrollments(
      [taskMod1, taskCourse],
      [enrollment]
    );

    expect(enrichedTasks).toHaveLength(2);
    expect(enrichedTasks[0].status).toBe('completed');
    expect(enrichedTasks[0].score).toBe(95);
    expect(enrichedTasks[1].status).toBe('completed');
    expect(enrichedTasks[1].progress).toBe(100);
  });

  // =========================================================================
  // SALIDAS POR ERRORES ESPERADOS (Negative Paths)
  // =========================================================================

  it('(-) Error Esperado 3.1: Módulo no completado o ausente no debe dar por completado el desafío de la mentoría', () => {
    const pendingTask = {
      id: 'task_uncompleted',
      followupId,
      type: 'module' as const,
      courseId,
      moduleId: 'mod_no_rendido',
      status: 'pending' as const,
      progress: 0,
    };

    // Alumno solo completó mod_dominio
    const patch = computeTaskSyncPatch(pendingTask, {
      courseId,
      completedModules: ['mod_dominio'],
      progressPercent: 50,
      nowIso: new Date().toISOString(),
    });

    expect(patch).toBeNull();
    expect(pendingTask.status).toBe('pending');
  });

  it('(-) Error Esperado 3.2: Tarea vinculada a un curso diferente no debe ser afectada (Aislamiento de programas)', () => {
    const foreignTask = {
      id: 'task_foreign',
      followupId,
      type: 'course' as const,
      courseId: 'course_otro_distinto',
      status: 'pending' as const,
      progress: 0,
    };

    const patch = computeTaskSyncPatch(foreignTask, {
      courseId: 'course_actual',
      completedModules: ['mod_1'],
      progressPercent: 100,
      nowIso: new Date().toISOString(),
    });

    expect(patch).toBeNull();
  });
});
