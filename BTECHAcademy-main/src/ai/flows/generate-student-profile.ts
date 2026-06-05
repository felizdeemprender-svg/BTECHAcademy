'use server';
/**
 * @fileOverview Flujo de Genkit para generar un perfil profundo del alumno.
 * Permite un enfoque personalizado y análisis de fuentes granulares.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PerformanceDataSchema = z.object({
  courseTitle: z.string(),
  averageScore: z.number(),
  completedModules: z.number(),
  totalModules: z.number(),
  feedbacks: z.array(z.string()),
});

const TaskDataSchema = z.object({
  title: z.string(),
  answer: z.string(),
  score: z.number(),
  aiFeedback: z.string(),
});

const FollowUpDataSchema = z.object({
  title: z.string(),
  goal: z.string(),
  sessionsMinutes: z.array(z.string()),
});

const StudentProfileInputSchema = z.object({
  studentName: z.string(),
  profilingFocus: z.string().describe('El ángulo o tipo de análisis a realizar (ej: Vocacional, Competencial, Conductual).'),
  performanceData: z.array(PerformanceDataSchema).optional(),
  tasksData: z.array(TaskDataSchema).optional(),
  followUpsData: z.array(FollowUpDataSchema).optional(),
  mentorNotes: z.array(z.string()).optional(),
});
export type StudentProfileInput = z.infer<typeof StudentProfileInputSchema>;

const StudentProfileOutputSchema = z.object({
  summary: z.string().describe('Resumen ejecutivo del perfil del alumno bajo el enfoque solicitado.'),
  learningStyle: z.string().describe('Estilo de aprendizaje o patrón detectado.'),
  strengths: z.array(z.string()).describe('Fortalezas detectadas.'),
  areasToImprove: z.array(z.string()).describe('Áreas de oportunidad.'),
  recommendation: z.string().describe('Sugerencia estratégica para el mentor.'),
  justification: z.string().describe('Justificación detallada del razonamiento basada en los datos específicos proporcionados.'),
});
export type StudentProfileOutput = z.infer<typeof StudentProfileOutputSchema>;

export async function generateStudentProfile(input: StudentProfileInput): Promise<StudentProfileOutput> {
  return generateStudentProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStudentProfilePrompt',
  input: { schema: StudentProfileInputSchema },
  output: { schema: StudentProfileOutputSchema },
  prompt: `Actúa como un experto en analítica educativa y psicología organizacional. Tu tarea es realizar un perfilamiento profundo del alumno.

ENFOQUE DEL ANÁLISIS: "{{{profilingFocus}}}"
(Debes priorizar este enfoque en toda tu evaluación).

DATOS DEL ALUMNO:
Nombre: {{{studentName}}}

{{#if performanceData}}
ACTIVIDAD EN CURSOS SELECCIONADOS:
{{#each performanceData}}
- Curso: {{{courseTitle}}} ({{{completedModules}}}/{{{totalModules}}} módulos)
  Puntaje Promedio: {{{averageScore}}}%
  Feedbacks clave: {{#each feedbacks}} "{{{this}}}" {{/each}}
---
{{/each}}
{{/if}}

{{#if tasksData}}
DESAFÍOS/TAREAS SELECCIONADAS:
{{#each tasksData}}
- Tarea: {{{title}}} (Nota: {{{score}}}%)
  Respuesta: "{{{answer}}}"
  Feedback previo: "{{{aiFeedback}}}"
---
{{/each}}
{{/if}}

{{#if followUpsData}}
SEGUIMIENTOS ESTRATÉGICOS SELECCIONADOS:
{{#each followUpsData}}
- Programa: {{{title}}}
  Objetivo: {{{goal}}}
  Minutas de Sesión: {{#each sessionsMinutes}} "{{{this}}}" {{/each}}
---
{{/each}}
{{/if}}

{{#if mentorNotes}}
NOTAS DE LA BITÁCORA DEL MENTOR:
{{#each mentorNotes}}
- "{{{this}}}"
{{/each}}
{{/if}}

Instrucciones Críticas:
1. Realiza un análisis cruzado de las fuentes para responder al enfoque solicitado ("{{{profilingFocus}}}").
2. No inventes datos. Si la información es insuficiente para algún punto, indícalo profesionalmente.
3. En la "justificación", sé muy específico: "Llegamos a la conclusión X porque en la tarea Y el alumno respondió Z".
4. El tono debe ser institucional, empático y altamente útil para la toma de decisiones del mentor.`,
});

const generateStudentProfileFlow = ai.defineFlow(
  {
    name: 'generateStudentProfileFlow',
    inputSchema: StudentProfileInputSchema,
    outputSchema: StudentProfileOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('No se pudo generar el perfil con el enfoque solicitado.');
    return output;
  }
);
