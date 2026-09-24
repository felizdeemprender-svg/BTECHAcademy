import { z } from 'zod';
import { err, ok, type Result } from '@/domain/shared/result';
import { forbidden, notFound, unavailable, type DomainError, validationError } from '@/domain/shared/errors';
import type { Course } from '../course';
import { CourseStatusSchema } from '../course-status';

const PublishCourseInputSchema = z.object({
  id: z.string().min(1),
  mentorId: z.string().min(1),
  status: CourseStatusSchema,
});

export type PublishCourseInput = z.infer<typeof PublishCourseInputSchema>;

export interface PublishCourseReader {
  findById(id: string): Promise<Course | null>;
}

export interface PublishCourseUpdater {
  updateCourse(id: string, data: Partial<Course>): Promise<void>;
}

export interface PublishCourseDeps {
  readonly reader: PublishCourseReader;
  readonly updater: PublishCourseUpdater;
}

export async function publishCourse(
  deps: PublishCourseDeps,
  input: unknown,
): Promise<Result<{ id: string; status: string }, DomainError>> {
  const parsed = PublishCourseInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(validationError('Invalid status or missing fields'));
  }
  const { id, mentorId, status } = parsed.data;
  
  try {
    const course = await deps.reader.findById(id);
    if (!course) {
      return err(notFound('Course not found'));
    }
    
    // Autorización: un mentor solo puede modificar su propio curso
    if (course.mentorId !== mentorId) {
      return err(forbidden('You do not have permission to change this course status'));
    }

    await deps.updater.updateCourse(id, { status });
    
    return ok({ id, status });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(unavailable(message));
  }
}
