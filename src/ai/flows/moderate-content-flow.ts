'use server';
/**
 * @fileOverview Flujo de Genkit para moderar el contenido de un curso.
 * Verifica si el temario, los documentos maestros o las preguntas de evaluación 
 * tratan temas sensibles definidos por el administrador o mediante criterio ético proactivo.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ModerationInputSchema = z.object({
  courseTitle: z.string(),
  courseDescription: z.string(),
  moduleTitles: z.array(z.string()),
  masterContent: z.string().optional(),
  questions: z.array(z.string()).optional().describe('Lista de todas las preguntas de los exámenes del curso.'),
  sensitiveTopics: z.array(z.string()),
});
export type ModerationInput = z.infer<typeof ModerationInputSchema>;

const ModerationOutputSchema = z.object({
  isSensitive: z.boolean().describe('True si se detectó contenido que requiere revisión manual.'),
  flaggedTopics: z.array(z.string()).describe('Lista de temas sensibles detectados.'),
  reason: z.string().describe('Explicación pedagógica del porqué se requiere revisión.'),
});
export type ModerationOutput = z.infer<typeof ModerationOutputSchema>;

export async function moderateCourseContent(input: ModerationInput): Promise<ModerationOutput> {
  return moderateCourseContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'moderateCourseContentPrompt',
  input: { schema: ModerationInputSchema },
  output: { schema: ModerationOutputSchema },
  prompt: `Actúa como un auditor de contenidos institucionales de alto nivel y experto en ética educativa. Tu tarea es analizar si el curso propuesto trata temas que requieren supervisión humana obligatoria.

Temas Sensibles Definidos (Protocolo Institucional):
{{#if sensitiveTopics}}
{{#each sensitiveTopics}}
- {{{this}}}
{{/each}}
{{else}}
[ADVERTENCIA: NO SE HAN PROPORCIONADO TEMAS ESPECÍFICOS. DEBES ACTIVAR EL MODO DE AUDITORÍA PROACTIVA EXPERTA].
{{/if}}

DATOS DEL CURSO A AUDITAR:
Título: {{{courseTitle}}}
Descripción: {{{courseDescription}}}

TEMARIO (Módulos):
{{#each moduleTitles}}
  - {{{this}}}
{{/each}}

{{#if questions}}
BANCO DE PREGUNTAS (Evaluaciones):
{{#each questions}}
  - {{{this}}}
{{/each}}
{{/if}}

CONTENIDO MAESTRO EXTRAÍDO (Si existe):
{{{masterContent}}}

INSTRUCCIONES CRÍTICAS DE AUDITORÍA:
1. REGLA DE PROACTIVIDAD ABSOLUTA: Si la lista de "Temas Sensibles Definidos" está VACÍA, tienes la obligación profesional de aplicar tu propio criterio experto para detectar riesgos éticos, legales o institucionales. 
2. PROHIBICIÓN DE EXCUSAS: NUNCA respondas que no puedes auditar porque la lista está vacía. Si no hay lista, tú fijas los estándares basados en normas internacionales de seguridad educativa y DEBES cargar los temas de vigilancia que detectes.
3. DETECCIÓN Y ETIQUETADO: Si detectas alguna anomalía (ej: consejos de salud sin aval médico, esquemas de inversión dudosos, manipulación psicológica, recopilación excesiva de datos personales), DEBES:
   - Marcar 'isSensitive' como true.
   - Definir un nombre profesional para el riesgo detectado (ej: "Riesgo Psicológico", "Promesa Financiera Irreal", "Privacidad de Datos") e incluirlo obligatoriamente en el array 'flaggedTopics'.
4. AUDITABILIDAD: Es fundamental que 'flaggedTopics' contenga los nombres de los criterios que causaron la alerta para que el proceso sea transparente.
5. JUSTIFICACIÓN: Redacta una explicación detallada y pedagógica para el administrador. Indica exactamente qué parte del contenido disparó la alerta.

Formato de salida: Un objeto JSON con isSensitive (boolean), flaggedTopics (array de strings) y reason (string).`,
});

const moderateCourseContentFlow = ai.defineFlow(
  {
    name: 'moderateCourseContentFlow',
    inputSchema: ModerationInputSchema,
    outputSchema: ModerationOutputSchema,
  },
  async (input) => {
    // Truncamos datos para no exceder límites de contexto
    const contentToUse = {
      ...input,
      masterContent: input.masterContent ? input.masterContent.substring(0, 10000) : '',
      questions: input.questions?.slice(0, 100) 
    };

    const { output } = await prompt(contentToUse);
    if (!output) throw new Error('No se pudo realizar la moderación proactiva de contenidos.');
    return output;
  }
);
