'use server';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EvaluationInputSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    type: z.string(),
    correctAnswer: z.any(),
  })),
  answers: z.record(z.any()),
  studentName: z.string().optional(),
  tutorUid: z.string().describe('ID del tutor dueño del curso para facturación de la IA'),
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

const evaluateQuizPerformanceFlow = ai.defineFlow({
    name: 'evaluateQuizPerformanceFlow',
    inputSchema: EvaluationInputSchema,
    outputSchema: EvaluationOutputSchema,
  },
  async (input: EvaluationInput) => {
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

    const promptText = `Actúa como un mentor experto y empático. Tu tarea es evaluar las respuestas de un alumno a un examen de un módulo.

Datos del examen:
Alumno: ${input.studentName || 'Estudiante'}

Preguntas y Respuestas del Alumno:
${evaluationData.map(d => `Pregunta ${d.index}: ${d.question}
Tipo de pregunta: ${d.type}
Respuesta Correcta Esperada: ${d.correctAnswer}
Respuesta que dio el Alumno: ${d.studentAnswer}
---`).join('\n')}

Instrucciones para la evaluación:
1. Evalúa la precisión de cada respuesta comparándola con la esperada.
2. Para las respuestas de tipo "free_response" (libre), sé flexible pero busca que el alumno haya capturado los conceptos clave mencionados en la respuesta esperada.
3. Calcula un puntaje final de 0 a 100 basado en el acierto general.
4. Redacta un feedback motivador en segunda persona (ej: "Has demostrado un gran dominio...") que ayude al alumno a entender su progreso.
5. Identifica claramente las fortalezas demostradas y las áreas que requieren más estudio o repaso.`;

    const { output } = await ai.generate({
      prompt: promptText,
      output: { schema: EvaluationOutputSchema }
    }, 'quiz_evaluation', input.tutorUid);

    if (!output) throw new Error('No se pudo generar la evaluación del desempeño mediante la IA.');
    return output;
  }
);
