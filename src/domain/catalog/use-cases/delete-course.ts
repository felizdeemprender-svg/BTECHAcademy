import { z } from 'zod';
import { err, ok, type Result } from '@/domain/shared/result';
import { forbidden, notFound, unavailable, type DomainError, validationError } from '@/domain/shared/errors';
import type { Course } from '../course';

const DeleteCourseInputSchema = z.object({
  id: z.string().min(1),
  mentorId: z.string().min(1),
});

export type DeleteCourseInput = z.infer<typeof DeleteCourseInputSchema>;

export interface DeleteCourseReader {
  findById(id: string): Promise<Course | null>;
}

export interface DeleteCourseDeleter {
  deleteCourse(id: string): Promise<void>;
}

export interface DeleteCourseDeps {
  readonly reader: DeleteCourseReader;
  readonly deleter: DeleteCourseDeleter;
}

export async function deleteCourse(
  deps: DeleteCourseDeps,
  input: unknown,
): Promise<Result<{ id: string }, DomainError>> {
  const parsed = DeleteCourseInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(validationError('Missing required fields'));
  }
  const { id, mentorId } = parsed.data;
  
  try {
    const course = await deps.reader.findById(id);
    if (!course) {
      return err(notFound('Course not found'));
    }
    
    // Autorización
    if (course.mentorId !== mentorId) {
      return err(forbidden('You do not have permission to delete this course'));
    }

    await deps.deleter.deleteCourse(id);
    
    return ok({ id });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(unavailable(message));
  }
}
