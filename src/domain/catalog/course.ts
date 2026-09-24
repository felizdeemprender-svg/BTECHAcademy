/**
 * Catálogo — Curso (colección `courses`).
 * Shape compatible con el alta de cursos (create/page.tsx).
 */
import { z } from 'zod';

import { MentorIdSchema } from '../shared/ids';
import { CourseStatusSchema, isCoursePublishedLike } from './course-status';

export const CourseBrandingOverrideSchema = z
  .object({
    primaryColor: z.string().optional(),
    brandName: z.string().optional(),
  })
  .catchall(z.unknown());
export type CourseBrandingOverride = z.infer<typeof CourseBrandingOverrideSchema>;

export const CourseSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  mentorId: MentorIdSchema,
  title: z.string().min(1, 'título vacío'),
  description: z.string().default(''),
  categoryId: z.string().min(1, 'categoría vacía'),
  level: z.string().default(''),
  tags: z.array(z.string()).default([]),
  status: CourseStatusSchema,
  modulesCount: z.number().int().min(0).default(0),
  studentsCount: z.number().int().min(0).default(0),
  thumbnail: z.string().optional(),
  duration: z.string().optional(),
  brandingOverride: CourseBrandingOverrideSchema.optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type Course = z.infer<typeof CourseSchema>;

export function parseCourse(data: unknown): Course {
  return CourseSchema.parse(data);
}

/** Solo cursos publicados/aprobados aceptan inscripciones y marketplace. */
export function canEnrollInCourse(course: Pick<Course, 'status'>): boolean {
  return isCoursePublishedLike(course.status);
}
