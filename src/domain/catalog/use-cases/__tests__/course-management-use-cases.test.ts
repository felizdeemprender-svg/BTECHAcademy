import { describe, expect, it, vi } from 'vitest';
import { updateCourse, publishCourse, deleteCourse } from '../index';
import type { Course } from '../../course';

describe('Catalog Course Management Use Cases', () => {
  const mockCourse = {
    id: 'course-1',
    mentorId: 'tutor-1',
    title: 'Test Course',
    description: '',
    categoryId: 'cat-1',
    level: '',
    tags: [],
    status: 'draft',
    modulesCount: 0,
    studentsCount: 0,
  } as unknown as Course;

  const createMockReader = (course: Course | null = mockCourse) => ({
    findById: vi.fn().mockResolvedValue(course),
  });

  const createMockUpdater = () => ({
    updateCourse: vi.fn().mockResolvedValue(undefined),
  });

  const createMockDeleter = () => ({
    deleteCourse: vi.fn().mockResolvedValue(undefined),
  });

  describe('updateCourse', () => {
    it('debe fallar si el input es inválido', async () => {
      const result = await updateCourse(
        { reader: createMockReader(), updater: createMockUpdater() },
        { id: 'course-1' } // falta mentorId y data
      );
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION');
      } else {
        expect.fail('Expected error');
      }
    });

    it('debe fallar si el curso no existe', async () => {
      const result = await updateCourse(
        { reader: createMockReader(null), updater: createMockUpdater() },
        { id: 'missing', mentorId: 'tutor-1', data: { title: 'New' } }
      );
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      } else {
        expect.fail('Expected error');
      }
    });

    it('debe fallar si el mentorId no coincide con el dueño del curso (forbidden)', async () => {
      const result = await updateCourse(
        { reader: createMockReader(), updater: createMockUpdater() },
        { id: 'course-1', mentorId: 'hacker', data: { title: 'Hacked' } }
      );
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN');
      } else {
        expect.fail('Expected error');
      }
    });

    it('debe actualizar el curso exitosamente', async () => {
      const updater = createMockUpdater();
      const result = await updateCourse(
        { reader: createMockReader(), updater },
        { id: 'course-1', mentorId: 'tutor-1', data: { title: 'Updated' } }
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('course-1');
      }
      expect(updater.updateCourse).toHaveBeenCalledWith('course-1', { title: 'Updated' });
    });
  });

  describe('publishCourse', () => {
    it('debe fallar si el status es inválido', async () => {
      const result = await publishCourse(
        { reader: createMockReader(), updater: createMockUpdater() },
        { id: 'course-1', mentorId: 'tutor-1', status: 'invalid-status' }
      );
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION');
      } else {
        expect.fail('Expected error');
      }
    });

    it('debe cambiar el status si es el dueño', async () => {
      const updater = createMockUpdater();
      const result = await publishCourse(
        { reader: createMockReader(), updater },
        { id: 'course-1', mentorId: 'tutor-1', status: 'published' }
      );
      expect(result.ok).toBe(true);
      expect(updater.updateCourse).toHaveBeenCalledWith('course-1', { status: 'published' });
    });

    it('debe bloquear a un tutor de empresa cuando intenta publicar directamente', async () => {
      const companyCourse = {
        ...mockCourse,
        companyId: 'company-123',
        ownerId: 'company-123',
        mentorId: 'tutor-1',
      } as unknown as Course;

      const updater = createMockUpdater();
      const result = await publishCourse(
        { reader: createMockReader(companyCourse), updater },
        { id: 'course-1', mentorId: 'tutor-1', status: 'public' }
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN');
        expect(result.error.message).toBe('Solo la empresa titular tiene potestad para publicar este curso');
      }
      expect(updater.updateCourse).not.toHaveBeenCalled();
    });

    it('debe permitir a un tutor de empresa cambiar a borrador', async () => {
      const companyCourse = {
        ...mockCourse,
        companyId: 'company-123',
        ownerId: 'company-123',
        mentorId: 'tutor-1',
      } as unknown as Course;

      const updater = createMockUpdater();
      const result = await publishCourse(
        { reader: createMockReader(companyCourse), updater },
        { id: 'course-1', mentorId: 'tutor-1', status: 'draft' }
      );

      expect(result.ok).toBe(true);
      expect(updater.updateCourse).toHaveBeenCalledWith('course-1', { status: 'draft' });
    });

    it('debe permitir a la empresa titular publicar el curso con rol empresa', async () => {
      const companyCourse = {
        ...mockCourse,
        companyId: 'company-123',
        ownerId: 'company-123',
        mentorId: 'tutor-1',
      } as unknown as Course;

      const updater = createMockUpdater();
      const result = await publishCourse(
        { reader: createMockReader(companyCourse), updater },
        {
          id: 'course-1',
          mentorId: 'owner-user',
          status: 'public',
          callerRole: 'empresa',
          companyId: 'company-123',
        }
      );

      expect(result.ok).toBe(true);
      expect(updater.updateCourse).toHaveBeenCalledWith('course-1', { status: 'published' });
    });
  });

  describe('deleteCourse', () => {
    it('debe fallar con VALIDATION si faltan campos obligatorios', async () => {
      const deleter = createMockDeleter();
      const result = await deleteCourse(
        { reader: createMockReader(), deleter },
        { id: '' }
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('VALIDATION');
      }
      expect(deleter.deleteCourse).not.toHaveBeenCalled();
    });

    it('debe fallar con NOT_FOUND si el curso no existe', async () => {
      const deleter = createMockDeleter();
      const result = await deleteCourse(
        { reader: createMockReader(null), deleter },
        { id: 'non-existent', mentorId: 'tutor-1' }
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
      expect(deleter.deleteCourse).not.toHaveBeenCalled();
    });

    it('debe fallar con FORBIDDEN si un usuario ajeno intenta borrar el curso', async () => {
      const deleter = createMockDeleter();
      const result = await deleteCourse(
        { reader: createMockReader(), deleter },
        { id: 'course-1', mentorId: 'hacker-user' }
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
      expect(deleter.deleteCourse).not.toHaveBeenCalled();
    });

    it('debe borrar si es el dueño directo del curso', async () => {
      const deleter = createMockDeleter();
      const result = await deleteCourse(
        { reader: createMockReader(), deleter },
        { id: 'course-1', mentorId: 'tutor-1' }
      );
      expect(result.ok).toBe(true);
      expect(deleter.deleteCourse).toHaveBeenCalledWith('course-1');
    });

    it('debe permitir a un ADMIN borrar cualquier curso', async () => {
      const deleter = createMockDeleter();
      const result = await deleteCourse(
        { reader: createMockReader(), deleter },
        { id: 'course-1', mentorId: 'admin-user', callerRole: 'admin' }
      );
      expect(result.ok).toBe(true);
      expect(deleter.deleteCourse).toHaveBeenCalledWith('course-1');
    });

    it('debe permitir a la EMPRESA titular borrar un curso creado por su tutor', async () => {
      const companyCourse = {
        ...mockCourse,
        mentorId: 'tutor-subordinate',
        companyId: 'company-fastoria',
      } as unknown as Course;

      const deleter = createMockDeleter();
      const result = await deleteCourse(
        { reader: createMockReader(companyCourse), deleter },
        {
          id: 'course-1',
          mentorId: 'supervisor-uid',
          callerRole: 'empresa',
          companyId: 'company-fastoria',
        }
      );
      expect(result.ok).toBe(true);
      expect(deleter.deleteCourse).toHaveBeenCalledWith('course-1');
    });

    it('debe denegar el borrado a un rol empresa ajeno a la organización del curso', async () => {
      const companyCourse = {
        ...mockCourse,
        mentorId: 'tutor-1',
        companyId: 'company-A',
      } as unknown as Course;

      const deleter = createMockDeleter();
      const result = await deleteCourse(
        { reader: createMockReader(companyCourse), deleter },
        {
          id: 'course-1',
          mentorId: 'supervisor-b',
          callerRole: 'empresa',
          companyId: 'company-B',
        }
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
      expect(deleter.deleteCourse).not.toHaveBeenCalled();
    });
  });
});
