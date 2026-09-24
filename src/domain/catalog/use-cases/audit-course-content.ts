import { z } from 'zod';
import { err, ok, type Result } from '@/domain/shared/result';
import { forbidden, notFound, validationError, type DomainError } from '@/domain/shared/errors';
import type { AiAuditingGateway } from '@/domain/auditing/use-cases/log-ai-interaction';

export const AuditCourseContentInputSchema = z.object({
  mentorId: z.string().min(1),
  courseId: z.string().min(1),
});

export type AuditCourseContentInput = z.infer<typeof AuditCourseContentInputSchema>;

export interface AuditCourseInfo {
  id: string;
  title: string;
  description: string;
  mentorId: string;
  modules: Array<{ title: string; content?: string }>;
}

export interface AuditCourseGateway {
  getCourseData(courseId: string): Promise<AuditCourseInfo | null>;
  flagCourse(courseId: string, reason: string): Promise<void>;
  markCourseSafe(courseId: string): Promise<void>;
}

export interface AuditCourseContentDeps {
  readonly gateway: AuditCourseGateway;
  readonly ai: AiAuditingGateway;
}

export async function auditCourseContent(
  deps: AuditCourseContentDeps,
  input: unknown
): Promise<Result<{ isSafe: boolean; reason?: string }, DomainError>> {
  const parsed = AuditCourseContentInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(validationError('Invalid input payload'));
  }

  const { mentorId, courseId } = parsed.data;

  // 1. Obtener la información del curso
  const course = await deps.gateway.getCourseData(courseId);
  if (!course) {
    return err(notFound(`Course ${courseId} not found`));
  }

  // Si alguien más trata de auditarlo, error de permisos.
  if (course.mentorId !== mentorId) {
    return err(forbidden('You do not have permission to audit this course'));
  }

  // 2. Extraer y compilar todo el texto relevante del curso
  const contentParts = [course.title, course.description];
  for (const mod of course.modules) {
    contentParts.push(mod.title);
    if (mod.content) contentParts.push(mod.content);
  }
  const fullText = contentParts.join('\n');

  // 3. (Opcional) Verificar créditos de IA del mentor si quisiéramos cobrar por esto
  // Por ahora asumiremos que la auditoría de seguridad es gratis y cubierta por la plataforma.
  
  // 4. Analizar el contenido
  const result = await deps.ai.scanContentForSensitiveTopics(fullText);

  // 5. Actualizar el estado del curso en la BD
  if (result.isSafe) {
    await deps.gateway.markCourseSafe(courseId);
  } else {
    const reason = result.reason || 'Flagged for sensitive content by AI auditor';
    await deps.gateway.flagCourse(courseId, reason);
    
    // Y registramos la interacción para analíticas de seguridad
    await deps.ai.logAuditRecord({
      id: `flag_${courseId}_${Date.now()}`,
      userId: mentorId,
      role: 'mentor',
      feature: 'course_safety_audit',
      status: 'flagged',
      reason,
      courseId
    });
  }

  return ok(result);
}
