import { z } from 'zod';
import { err, ok, type Result } from '@/domain/shared/result';
import { forbidden, notFound, unavailable, type DomainError, validationError } from '@/domain/shared/errors';
import type { Course } from '../course';

const UpdateCourseInputSchema = z.object({
  id: z.string().min(1),
  mentorId: z.string().min(1),
  data: z.record(z.unknown()),
});

export type UpdateCourseInput = z.infer<typeof UpdateCourseInputSchema>;

export interface UpdateCourseReader {
  findById(id: string): Promise<Course | null>;
}

export interface UpdateCourseUpdater {
  updateCourse(id: string, data: Partial<Course>): Promise<void>;
}

export interface UpdateCourseDeps {
  readonly reader: UpdateCourseReader;
  readonly updater: UpdateCourseUpdater;
}

export async function updateCourse(
  deps: UpdateCourseDeps,
  input: unknown,
): Promise<Result<{ id: string }, DomainError>> {
  const parsed = UpdateCourseInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(validationError('Missing required fields'));
  }
  const { id, mentorId, data } = parsed.data;
  
  try {
    const course = await deps.reader.findById(id);
    if (!course) {
      return err(notFound('Course not found'));
    }
    
    // Autorización: un mentor solo puede modificar su propio curso
    if (course.mentorId !== mentorId) {
      return err(forbidden('You do not have permission to edit this course'));
    }

    await deps.updater.updateCourse(id, data as Partial<Course>);
    
    return ok({ id });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(unavailable(message));
  }
}
