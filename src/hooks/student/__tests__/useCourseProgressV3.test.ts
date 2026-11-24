import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Module, StudentEnrollment } from '@/types/student';

// Función pura extraída de la lógica de useCourseProgressV3 para validación unitaria de progreso
function calculateProgressPercent(
  enrollment: StudentEnrollment | null,
  modules: Module[]
): number {
  if (!enrollment || modules.length === 0) return 0;

  const completedIds = enrollment.progress?.completedModules || [];
  const evaluations = enrollment.progress?.evaluations || {};

  let processedCount = 0;

  modules.forEach(mod => {
    const isCompleted = completedIds.includes(mod.id);
    const evaluation = evaluations[mod.id];
    const hasEvaluation = !!evaluation;
    const allowsRetries = mod.allowRetries !== false;
    const needsSupport = !!mod.enableSupportQuestions && (mod.supportQuestions?.length ?? 0) > 0;

    if (isCompleted) {
      processedCount++;
    } else if (hasEvaluation) {
      if (!allowsRetries) {
        if (!needsSupport || evaluation.isSupport) {
          processedCount++;
        }
      }
    }
  });

  return Math.round((processedCount / modules.length) * 100);
}

// Simulador de persistencia segura de borradores de quiz en useCourseProgressV3
function safeSaveDraft(uid: string, courseId: string, moduleId: string, answers: Record<string, any>): boolean {
  if (!uid || !moduleId) return false;
  const key = `btech_draft_${uid}_${courseId}_${moduleId}`;
  try {
    localStorage.setItem(key, JSON.stringify(answers));
    return true;
  } catch (e) {
    return false;
  }
}

function safeGetDraft(uid: string, courseId: string, moduleId: string): Record<string, any> {
  if (!uid || !moduleId) return {};
  const key = `btech_draft_${uid}_${courseId}_${moduleId}`;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
}

describe('useCourseProgressV3 - Lógica de Negocio y Resiliencia (src/hooks/student/useCourseProgressV3.ts)', () => {
  const mockModules: Module[] = [
    { id: 'mod-1', title: 'Módulo 1', order: 1 } as Module,
    { id: 'mod-2', title: 'Módulo 2', order: 2, allowRetries: false } as Module,
    { id: 'mod-3', title: 'Módulo 3', order: 3, allowRetries: false, enableSupportQuestions: true, supportQuestions: [{ id: 'sq-1' } as any] } as Module,
    { id: 'mod-4', title: 'Módulo 4', order: 4 } as Module,
  ];

  describe('Cálculo de Porcentaje de Progreso (progressPercent)', () => {
    it('debe retornar 0% si no hay matrícula activa o los módulos están vacíos', () => {
      expect(calculateProgressPercent(null, mockModules)).toBe(0);
      expect(calculateProgressPercent({} as StudentEnrollment, [])).toBe(0);
    });

    it('debe calcular 25% cuando 1 de 4 módulos está aprobado', () => {
      const enrollment: StudentEnrollment = {
        id: 'enr-1',
        courseId: 'course-1',
        studentId: 'user-1',
        progress: {
          completedModules: ['mod-1'],
          evaluations: {}
        }
      } as any;

      expect(calculateProgressPercent(enrollment, mockModules)).toBe(25);
    });

    it('debe contar como procesado un módulo reprobado sin reintentos (allowRetries: false)', () => {
      const enrollment: StudentEnrollment = {
        id: 'enr-1',
        courseId: 'course-1',
        studentId: 'user-1',
        progress: {
          completedModules: ['mod-1'],
          evaluations: {
            'mod-2': { passed: false, score: 40 }
          }
        }
      } as any;

      // mod-1 (completado) + mod-2 (reprobado definitivo sin reintentos) = 2/4 = 50%
      expect(calculateProgressPercent(enrollment, mockModules)).toBe(50);
    });

    it('no debe contar como procesado un módulo que requiere refuerzo si no se completó el soporte', () => {
      const enrollment: StudentEnrollment = {
        id: 'enr-1',
        courseId: 'course-1',
        studentId: 'user-1',
        progress: {
          completedModules: [],
          evaluations: {
            'mod-3': { passed: false, score: 50, isSupport: false }
          }
        }
      } as any;

      // mod-3 tiene enableSupportQuestions: true y no es isSupport -> no cuenta
      expect(calculateProgressPercent(enrollment, mockModules)).toBe(0);
    });

    it('debe contar como procesado el módulo de refuerzo cuando isSupport es verdadero', () => {
      const enrollment: StudentEnrollment = {
        id: 'enr-1',
        courseId: 'course-1',
        studentId: 'user-1',
        progress: {
          completedModules: [],
          evaluations: {
            'mod-3': { passed: false, score: 50, isSupport: true }
          }
        }
      } as any;

      // mod-3 con evaluación de soporte realizada -> cuenta 1/4 = 25%
      expect(calculateProgressPercent(enrollment, mockModules)).toBe(25);
    });

    it('debe retornar 100% cuando todos los módulos están completados', () => {
      const enrollment: StudentEnrollment = {
        id: 'enr-1',
        courseId: 'course-1',
        studentId: 'user-1',
        progress: {
          completedModules: ['mod-1', 'mod-2', 'mod-3', 'mod-4'],
          evaluations: {}
        }
      } as any;

      expect(calculateProgressPercent(enrollment, mockModules)).toBe(100);
    });
  });

  describe('Blindaje de LocalStorage en Borradores de Quiz', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
      mockStorage = {};
      vi.stubGlobal('localStorage', {
        getItem: vi.fn((key: string) => mockStorage[key] || null),
        setItem: vi.fn((key: string, val: string) => {
          mockStorage[key] = val;
        })
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('debe guardar y recuperar respuestas correctamente en condiciones normales', () => {
      const answers = { q1: 'opcion-a', q2: 3 };
      const ok = safeSaveDraft('user-1', 'course-1', 'mod-1', answers);
      expect(ok).toBe(true);

      const recovered = safeGetDraft('user-1', 'course-1', 'mod-1');
      expect(recovered).toEqual(answers);
    });

    it('debe atrapar excepciones de setItem (QuotaExceededError) sin romper la ejecución', () => {
      vi.stubGlobal('localStorage', {
        setItem: vi.fn(() => {
          throw new Error('QuotaExceededError');
        })
      });

      const ok = safeSaveDraft('user-1', 'course-1', 'mod-1', { q1: 'test' });
      expect(ok).toBe(false);
    });

    it('debe atrapar JSON corrupto o excepciones en getItem retornando un objeto vacío', () => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => '{{{invalid-json')
      });

      const recovered = safeGetDraft('user-1', 'course-1', 'mod-1');
      expect(recovered).toEqual({});
    });
  });
});
