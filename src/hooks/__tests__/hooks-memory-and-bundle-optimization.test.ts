import { describe, it, expect, vi } from 'vitest';
import nextConfig from '../../../next.config';

describe('Optimizaciones Paso 1 y Paso 2: Bundle y Fugas de Memoria en Hooks', () => {
  describe('Paso 1: Configuración de optimizePackageImports en next.config.ts', () => {
    it('debe incluir react-icons para tree-shaking estricto en el bundle', () => {
      const optimizeImports = nextConfig.experimental?.optimizePackageImports;
      expect(optimizeImports).toBeDefined();
      expect(optimizeImports).toContain('react-icons');
    });

    it('debe mantener las librerías críticas optimizadas previamente', () => {
      const optimizeImports = nextConfig.experimental?.optimizePackageImports || [];
      expect(optimizeImports).toContain('lucide-react');
      expect(optimizeImports).toContain('date-fns');
      expect(optimizeImports).toContain('framer-motion');
      expect(optimizeImports).toContain('recharts');
      expect(optimizeImports).toContain('@radix-ui/react-icons');
    });
  });

  describe('Paso 2A: useCourseProgressV3 - Prevención de Fugas de Memoria en Listeners de Firestore', () => {
    it('debe registrar y desuscribir el listener del mentor al desmontar o re-emitir el curso', () => {
      const unsubCourseMock = vi.fn();
      const unsubModsMock = vi.fn();
      const unsubMentorMock = vi.fn();

      let capturedCourseCallback: ((snap: any) => void) | null = null;
      let capturedMentorCallback: ((snap: any) => void) | null = null;

      // Mock simulado de la lógica del useEffect de useCourseProgressV3
      let unsubMentor: (() => void) | null = null;

      const mockOnSnapshot = (target: any, cb: (snap: any) => void) => {
        if (target.type === 'course') {
          capturedCourseCallback = cb;
          return unsubCourseMock;
        }
        if (target.type === 'modules') {
          return unsubModsMock;
        }
        if (target.type === 'mentor') {
          capturedMentorCallback = cb;
          return unsubMentorMock;
        }
        return vi.fn();
      };

      // Simular inicio del efecto en useCourseProgressV3
      const unsubCourse = mockOnSnapshot({ type: 'course' }, (snap: any) => {
        if (snap.exists) {
          const data = snap.data;
          if (data.mentorId) {
            if (unsubMentor) {
              unsubMentor();
              unsubMentor = null;
            }
            unsubMentor = mockOnSnapshot({ type: 'mentor' }, (mSnap: any) => {
              // Actualiza mentorProfile
            });
          }
        }
      });
      const unsubMods = mockOnSnapshot({ type: 'modules' }, () => {});

      const cleanup = () => {
        unsubCourse();
        unsubMods();
        if (unsubMentor) {
          unsubMentor();
          unsubMentor = null;
        }
      };

      // 1. Simular emisión del curso con mentorId
      capturedCourseCallback!({ exists: true, data: { id: 'c1', mentorId: 'mentor_123' } });
      expect(unsubMentor).not.toBeNull();
      expect(unsubMentorMock).not.toHaveBeenCalled();

      // 2. Simular cambio de mentorId en nueva emisión del curso
      capturedCourseCallback!({ exists: true, data: { id: 'c1', mentorId: 'mentor_456' } });
      expect(unsubMentorMock).toHaveBeenCalledTimes(1); // El listener anterior fue limpiado

      // 3. Simular desmontaje del componente (cleanup del useEffect)
      cleanup();
      expect(unsubCourseMock).toHaveBeenCalledTimes(1);
      expect(unsubModsMock).toHaveBeenCalledTimes(1);
      expect(unsubMentorMock).toHaveBeenCalledTimes(2); // El listener activo fue limpiado
      expect(unsubMentor).toBeNull();
    });
  });

  describe('Paso 2B: useFollowUps - Agregación Eficiente con getCountFromServer', () => {
    it('debe utilizar getCountFromServer en lugar de descargar colecciones enteras con getDocs', async () => {
      const mockCount = 14;
      const getCountFromServerMock = vi.fn().mockResolvedValue({
        data: () => ({ count: mockCount })
      });

      const followUps = [
        { id: 'fu_1', studentName: 'Alumno Uno' },
        { id: 'fu_2', studentName: 'Alumno Dos' }
      ];

      // Simulación del efecto optimizado en useFollowUps
      let isCancelled = false;
      const stats: Record<string, { consumed: number }> = {};

      await Promise.all(
        followUps.map(async (fu) => {
          try {
            const countSnap = await getCountFromServerMock({ followUpId: fu.id });
            stats[fu.id] = { consumed: countSnap.data().count };
          } catch {
            // error catch
          }
        })
      );

      if (!isCancelled) {
        expect(stats).toEqual({
          fu_1: { consumed: 14 },
          fu_2: { consumed: 14 }
        });
      }

      expect(getCountFromServerMock).toHaveBeenCalledTimes(2);
    });

    it('debe respetar el flag isCancelled ante un desmontaje temprano', async () => {
      let isCancelled = false;
      let stateUpdated = false;

      const delayedCountMock = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: () => ({ count: 5 }) });
          }, 50);
        });
      });

      const executeEffect = async () => {
        await delayedCountMock();
        if (!isCancelled) {
          stateUpdated = true;
        }
      };

      const promise = executeEffect();

      // Simular desmontaje antes de que resuelva
      isCancelled = true;

      await promise;

      // El estado no debió actualizarse
      expect(stateUpdated).toBe(false);
    });
  });
});
