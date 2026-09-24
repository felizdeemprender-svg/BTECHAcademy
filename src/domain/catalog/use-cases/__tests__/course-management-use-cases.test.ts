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
  });

  describe('deleteCourse', () => {
    it('debe borrar lógicamente si es el dueño', async () => {
      const deleter = createMockDeleter();
      const result = await deleteCourse(
        { reader: createMockReader(), deleter },
        { id: 'course-1', mentorId: 'tutor-1' }
      );
      expect(result.ok).toBe(true);
      expect(deleter.deleteCourse).toHaveBeenCalledWith('course-1');
    });
  });
});
