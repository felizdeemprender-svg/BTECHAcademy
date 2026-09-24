/**
 * Catálogo — Módulo/clase (subcolección `courses/{id}/modules`).
 * Shape compatible con el formulario de creación de cursos.
 */
import { z } from 'zod';

export const ModuleContentTypeSchema = z.enum(['text', 'video']);
export type ModuleContentType = z.infer<typeof ModuleContentTypeSchema>;

export const ModuleQuestionSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  text: z.string(),
  type: z.string().min(1, 'tipo vacío'),
  options: z.array(z.string()).default([]),
  correctAnswer: z.number().int().min(0).default(0),
});
export type ModuleQuestion = z.infer<typeof ModuleQuestionSchema>;

export const SupportMaterialSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  name: z.string().min(1, 'nombre vacío'),
  url: z.string().min(1, 'url vacía'),
  isMaster: z.boolean().default(false),
});
export type SupportMaterial = z.infer<typeof SupportMaterialSchema>;

export const ModuleSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  title: z.string().min(1, 'título vacío'),
  contentType: ModuleContentTypeSchema,
  content: z.string().default(''),
  videoUrl: z.string().default(''),
  supportMaterials: z.array(SupportMaterialSchema).default([]),
  questions: z.array(ModuleQuestionSchema).default([]),
  supportQuestions: z.array(ModuleQuestionSchema).default([]),
  minPassingScore: z.number().int().min(0).max(100).default(70),
  allowRetries: z.boolean().default(true),
  enableSupportQuestions: z.boolean().default(false),
  hasSupportEnabled: z.boolean().optional(),
  order: z.number().int().min(0).default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type Module = z.infer<typeof ModuleSchema>;

export function isVideoModule(module: Pick<Module, 'contentType'>): boolean {
  return module.contentType === 'video';
}

/** Un módulo de video requiere URL para poder guardarse. */
export function isModuleReadyToSave(module: Pick<Module, 'contentType' | 'title' | 'videoUrl'>): boolean {
  if (module.title.trim() === '') return false;
  if (module.contentType === 'video' && module.videoUrl.trim() === '') return false;
  return true;
}

export function moduleQuestionCount(
  module: Pick<Module, 'questions' | 'supportQuestions'>,
): number {
  return module.questions.length + module.supportQuestions.length;
}

export function hasMasterMaterial(
  module: Pick<Module, 'supportMaterials'>,
): boolean {
  return module.supportMaterials.some((m) => m.isMaster);
}
