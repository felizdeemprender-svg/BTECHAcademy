'use server';
/**
 * @fileOverview Este archivo define un flujo de Genkit para generar preguntas de quiz diversas 
 * (opción múltiple, verdadero/falso, respuesta libre) a partir de contenido proporcionado.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuestionTypeSchema = z.enum(['multiple_choice', 'true_false', 'free_response']);

const QuestionSchema = z.object({
  type: QuestionTypeSchema,
  question: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.any(),
  explanation: z.string().optional(),
});

const GenerateQuizQuestionsInputSchema = z.object({
  content: z.string(),
  numQuestions: z.number().int().positive().default(5),
  questionTypes: z.array(QuestionTypeSchema).default(['multiple_choice', 'true_false', 'free_response']),
  role: z.string().optional(),
  expectations: z.string().optional(),
});
export type GenerateQuizQuestionsInput = z.infer<typeof GenerateQuizQuestionsInputSchema>;

const GenerateQuizQuestionsOutputSchema = z.object({
  questions: z.array(QuestionSchema).optional(),
  error: z.string().optional(),
});

export async function generateQuizQuestions(input: GenerateQuizQuestionsInput) {
  try {
    const result = await generateQuizQuestionsFlow(input);
    return result.questions || [];
  } catch (error: any) {
    console.error("[Server Action Error: GenerateQuiz]", error);
    // Devolvemos un error capturable por la UI
    return { error: error.message || "Fallo inesperado al generar preguntas." };
  }
}

const generateQuizQuestionsPrompt = ai.definePrompt({
  name: 'generateQuizQuestionsPrompt',
  input: { schema: GenerateQuizQuestionsInputSchema },
  output: { schema: z.array(QuestionSchema) },
  prompt: `Actúa como {{#if role}}{{{role}}}{{else}}un experto educador institucional{{/if}} especializado en diseño de evaluaciones de alto nivel.

Tu tarea es generar exactamente {{{numQuestions}}} preguntas basadas EXCLUSIVAMENTE en el contenido proporcionado. Los tipos de preguntas permitidos son: {{{questionTypes}}}.

{{#if expectations}}
INSTRUCCIONES CRÍTICAS DEL MENTOR:
{{{expectations}}}
{{/if}}

Guías por tipo:
- Opción Múltiple: 4 opciones claras, solo una correcta. El campo 'correctAnswer' debe ser el texto exacto de la opción correcta.
- Verdadero/Falso: Declaraciones factuales del texto. El campo 'correctAnswer' debe ser un booleano true o false.
- Respuesta Libre: Preguntas que requieran síntesis. En 'correctAnswer' detalla los puntos clave.

Contenido a evaluar:
{{{content}}}`,
});

const generateQuizQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuizQuestionsFlow',
    inputSchema: GenerateQuizQuestionsInputSchema,
    outputSchema: GenerateQuizQuestionsOutputSchema,
  },
  async (input) => {
    // Truncamos contenido para evitar timeouts
    const contentToUse = input.content.length > 15000 ? input.content.substring(0, 15000) : input.content;
    
    const { output } = await generateQuizQuestionsPrompt({
      ...input,
      content: contentToUse
    }, {
      config: { temperature: 0.4 }
    });

    if (!output || !Array.isArray(output)) {
      throw new Error('La respuesta de la IA no tiene el formato esperado.');
    }

    return { questions: output };
  }
);
