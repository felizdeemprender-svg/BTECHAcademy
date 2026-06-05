'use server';
/**
 * @fileOverview Un flujo de Genkit para evaluar el desempeño de un alumno en un examen.
 * Analiza las respuestas del alumno en comparación con las respuestas correctas y proporciona feedback pedagógico.
 * NOTA: Este flujo usa la instancia interna de Genkit (sin proxy de créditos) porque es un
 * servicio al alumno que no debe cobrar saldo al mentor/tutor.
 */

// Usamos la instancia interna para NO pasar por el proxy de créditos (no cobrar al tutor)
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY })],
  model: 'googleai/gemini-2.5-flash',
} as any);
import { z } from 'genkit';

const EvaluationInputSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    type: z.string(),
    correctAnswer: z.any(),
  })),
  answers: z.record(z.any()),
  studentName: z.string().optional(),
});
export type EvaluationInput = z.infer<typeof EvaluationInputSchema>;

const EvaluationOutputSchema = z.object({
  score: z.number().describe('Puntaje del 0 al 100'),
  feedback: z.string().describe('Comentario pedagógico detallado sobre el desempeño.'),
  strengths: z.array(z.string()).describe('Puntos fuertes demostrados.'),
  areasToImprove: z.array(z.string()).describe('Áreas que requieren más estudio.'),
});
export type EvaluationOutput = z.infer<typeof EvaluationOutputSchema>;

export async function evaluateQuizPerformance(input: EvaluationInput): Promise<EvaluationOutput> {
  return evaluateQuizPerformanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateQuizPerformancePrompt',
  input: { 
    schema: z.object({
      studentName: z.string().optional(),
      evaluationData: z.array(z.object({
        index: z.number(),
        question: z.string(),
        type: z.string(),
        correctAnswer: z.string(),
        studentAnswer: z.string(),
      }))
    })
  },
  output: { schema: EvaluationOutputSchema },
  prompt: `Actúa como un mentor experto y empático. Tu tarea es evaluar las respuestas de un alumno a un examen de un módulo.

Datos del examen:
Alumno: {{{studentName}}}

Preguntas y Respuestas del Alumno:
{{#each evaluationData}}
Pregunta {{index}}: {{{question}}}
Tipo de pregunta: {{{type}}}
Respuesta Correcta Esperada: {{{correctAnswer}}}
Respuesta que dio el Alumno: {{{studentAnswer}}}
---
{{/each}}

Instrucciones para la evaluación:
1. Evalúa la precisión de cada respuesta comparándola con la esperada.
2. Para las respuestas de tipo "free_response" (libre), sé flexible pero busca que el alumno haya capturado los conceptos clave mencionados en la respuesta esperada.
3. Calcula un puntaje final de 0 a 100 basado en el acierto general.
4. Redacta un feedback motivador en segunda persona (ej: "Has demostrado un gran dominio...") que ayude al alumno a entender su progreso.
5. Identifica claramente las fortalezas demostradas y las áreas que requieren más estudio o repaso.`,
});

const evaluateQuizPerformanceFlow = ai.defineFlow(
  {
    name: 'evaluateQuizPerformanceFlow',
    inputSchema: EvaluationInputSchema,
    outputSchema: EvaluationOutputSchema,
  },
  async (input) => {
    // Combinamos las preguntas y respuestas en un formato plano y fácil de leer para Handlebars
    const evaluationData = input.questions.map((q, i) => {
      // Las respuestas vienen en un objeto donde las llaves son los índices como strings
      const studentAnswerRaw = input.answers[i.toString()];
      
      let studentAnswer = 'No respondida';
      if (studentAnswerRaw !== undefined && studentAnswerRaw !== null) {
        if (typeof studentAnswerRaw === 'boolean') {
          studentAnswer = studentAnswerRaw ? 'Verdadero' : 'Falso';
        } else {
          studentAnswer = String(studentAnswerRaw);
        }
      }

      let correctAnswer = 'No definida';
      if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
        if (typeof q.correctAnswer === 'boolean') {
          correctAnswer = q.correctAnswer ? 'Verdadero' : 'Falso';
        } else {
          correctAnswer = String(q.correctAnswer);
        }
      }

      return {
        index: i + 1,
        question: q.question,
        type: q.type,
        correctAnswer: correctAnswer,
        studentAnswer: studentAnswer,
      };
    });

    const { output } = await prompt({
      studentName: input.studentName || 'Estudiante',
      evaluationData
    });

    if (!output) throw new Error('No se pudo generar la evaluación del desempeño mediante la IA.');
    return output;
  }
);
