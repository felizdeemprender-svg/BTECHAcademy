'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { deductCredits, calculateGeminiCost } from '@/lib/payments/credits';

/**
 * Acción de Servidor Pura para la Auditoría
 */
export async function runCourseAuditAction(input: any) {
  console.log(">>> [ACTION] Ejecutando Auditoría desde Action Pura...");
  
  try {
    // Definimos el esquema de salida aquí mismo para máxima seguridad
    const OutputSchema = z.object({
      isSensitive: z.boolean(),
      flaggedTopics: z.array(z.string()),
      reason: z.string()
    });

    const response = await ai.generate({
      prompt: `Analiza el curso: ${input.courseTitle}. Descripción: ${input.courseDescription}. Temas: ${input.moduleTitles?.join(', ')}`,
      output: { schema: OutputSchema }
    });

    const result = response.output;
    if (!result) throw new Error("La IA no devolvió resultado.");

    // Cobro manual
    try {
      const tokens = response.usage?.totalTokens || 0;
      const cost = await calculateGeminiCost(tokens);
      if (input.invokerUid) {
        await deductCredits(input.invokerUid, cost, 'course_audit', input.invokerRole, input.ownerUid);
      }
    } catch (e) {
      console.warn("Error en registro de créditos:", e);
    }

    return result;
  } catch (error: any) {
    console.error(">>> [ACTION] ERROR:", error.message);
    throw new Error(error.message);
  }
}
