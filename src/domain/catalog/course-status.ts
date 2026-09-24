/**
 * Catálogo — Estados del curso.
 * Valores observados en código: 'creating' (al iniciar),
 * 'draft' (borrador), 'pending_terms' (sin términos),
 * 'published' / 'approved' (visibles).
 */

import { z } from 'zod';

export const CourseStatusSchema = z.enum([
  'creating',
  'draft',
  'pending_terms',
  'published',
  'approved',
]);
export type CourseStatus = z.infer<typeof CourseStatusSchema>;

/** Publicado o aprobado: visible para alumnos y marketplace. */
export function isCoursePublishedLike(status: CourseStatus): boolean {
  return status === 'published' || status === 'approved';
}

/** Editable por el mentor (en construcción o borrador). */
export function isCourseEditable(status: CourseStatus): boolean {
  return status === 'creating' || status === 'draft';
}
