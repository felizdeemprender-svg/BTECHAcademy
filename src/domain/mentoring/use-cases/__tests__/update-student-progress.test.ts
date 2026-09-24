import { describe, expect, it, vi, beforeEach } from 'vitest';
import { updateStudentProgress, type UpdateStudentProgressDeps } from '../update-student-progress';

describe('Mentoring Use Cases: updateStudentProgress', () => {
  let defaultDeps: UpdateStudentProgressDeps;

  beforeEach(() => {
    defaultDeps = {
      gateway: {
        getEnrollmentProgress: vi.fn().mockResolvedValue({ completedModules: ['mod1'] }),
        updateEnrollmentProgress: vi.fn().mockResolvedValue(undefined),
        checkIfCourseCompleted: vi.fn().mockResolvedValue(false),
        issueCertificate: vi.fn().mockResolvedValue(undefined),
      }
    };
  });

  it('debe agregar un módulo completado y actualizar el progreso', async () => {
    const result = await updateStudentProgress(defaultDeps, { enrollmentId: 'e1', moduleId: 'mod2', completed: true });
    
    expect(result.ok).toBe(true);
    expect(defaultDeps.gateway.updateEnrollmentProgress).toHaveBeenCalledWith('e1', {
      completedModules: ['mod1', 'mod2']
    });
    expect(defaultDeps.gateway.checkIfCourseCompleted).toHaveBeenCalled();
    expect(defaultDeps.gateway.issueCertificate).not.toHaveBeenCalled(); // No se completó el curso
  });

  it('debe remover un módulo completado si completed=false', async () => {
    const result = await updateStudentProgress(defaultDeps, { enrollmentId: 'e1', moduleId: 'mod1', completed: false });
    
    expect(result.ok).toBe(true);
    expect(defaultDeps.gateway.updateEnrollmentProgress).toHaveBeenCalledWith('e1', {
      completedModules: []
    });
  });

  it('no debe hacer nada si el módulo ya estaba en el estado deseado', async () => {
    const result = await updateStudentProgress(defaultDeps, { enrollmentId: 'e1', moduleId: 'mod1', completed: true });
    
    expect(result.ok).toBe(true);
    // Si ya estaba completado, no debe llamar a update
    expect(defaultDeps.gateway.updateEnrollmentProgress).not.toHaveBeenCalled();
  });

  it('debe emitir certificado si el curso se completó', async () => {
    defaultDeps.gateway.checkIfCourseCompleted = vi.fn().mockResolvedValue(true);
    
    const result = await updateStudentProgress(defaultDeps, { enrollmentId: 'e1', moduleId: 'mod2', completed: true });
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.courseCompleted).toBe(true);
    }
    expect(defaultDeps.gateway.issueCertificate).toHaveBeenCalledWith('e1');
  });

  it('debe retornar error si la matricula no existe', async () => {
    defaultDeps.gateway.getEnrollmentProgress = vi.fn().mockResolvedValue(null);
    const result = await updateStudentProgress(defaultDeps, { enrollmentId: 'missing', moduleId: 'mod1', completed: true });
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});
