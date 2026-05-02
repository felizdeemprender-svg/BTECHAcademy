'use server';
import { generateWithAuditing } from '@/ai/genkit';
import { z } from 'genkit';

const ModerationInputSchema = z.object({
  courseTitle: z.string(),
  courseDescription: z.string(),
  moduleTitles: z.array(z.string()),
  masterContent: z.string().optional(),
  questions: z.array(z.string()).optional(),
  sensitiveTopics: z.array(z.string()),
  ownerUid: z.string().optional(),
});

const ModerationOutputSchema = z.object({
  isSensitive: z.boolean(),
  flaggedTopics: z.array(z.string()),
  reason: z.string(),
});

export async function moderateCourseContent(input: any) {
  console.log(">>> [SERVER] moderateCourseContent recibida en el servidor");
  // Construimos el prompt experto original
  const promptText = `Actúa como un auditor de contenidos institucionales. Analiza el curso:
  Título: ${input.courseTitle}
  Descripción: ${input.courseDescription}
  Módulos: ${input.moduleTitles.join(', ')}
  
  Determina si existen riesgos éticos o temas sensibles.`;

  const response = await generateWithAuditing({
    prompt: promptText,
    output: { schema: ModerationOutputSchema }
  }, 'course_audit', input.ownerUid);

  return response.output;
}
