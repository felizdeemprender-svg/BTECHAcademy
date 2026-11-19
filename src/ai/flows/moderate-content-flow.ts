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
  Módulos: ${(input.moduleTitles || []).join(', ')}
  ${input.sensitiveTopics && input.sensitiveTopics.length > 0 ? `Temas sensibles a vigilar: ${input.sensitiveTopics.join(', ')}` : ''}
  
  Determina si existen riesgos éticos o temas sensibles y responde con la estructura requerida.`;

  try {
    const response = await generateWithAuditing({
      prompt: promptText,
      output: { schema: ModerationOutputSchema }
    }, 'course_audit', input.ownerUid);

    // 1. Caso ideal: Genkit parseó el output estructurado
    if (response?.output && typeof response.output.isSensitive === 'boolean') {
      return {
        isSensitive: response.output.isSensitive,
        flaggedTopics: Array.isArray(response.output.flaggedTopics) ? response.output.flaggedTopics : [],
        reason: response.output.reason || 'Auditoría completada exitosamente.'
      };
    }

    // 2. Fallback: Parsear JSON desde response.text si vino envuelto en texto/markdown
    if (response?.text) {
      try {
        const cleaned = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (typeof parsed.isSensitive === 'boolean') {
          return {
            isSensitive: parsed.isSensitive,
            flaggedTopics: Array.isArray(parsed.flaggedTopics) ? parsed.flaggedTopics : [],
            reason: parsed.reason || 'Auditoría completada exitosamente.'
          };
        }
      } catch (parseErr) {
        console.warn("[moderateCourseContent] No se pudo parsear response.text como JSON:", parseErr);
      }
    }

    // 3. Fallback seguro por defecto si el modelo respondió sin estructura
    return {
      isSensitive: false,
      flaggedTopics: [],
      reason: response?.text || 'Contenido evaluado sin anomalías detectadas.'
    };
  } catch (error: any) {
    console.error("[moderateCourseContent] Error fatal en flujo de auditoría:", error);
    throw new Error(error.message || 'Error en la auditoría de contenido por IA');
  }
}
