
'use server';
/**
 * @fileOverview Un asistente de tutoría IA para la plataforma e-learning.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TutorChatInputSchema = z.object({
  message: z.string().describe('La consulta del estudiante o mentor.'),
  context: z.string().optional().describe('Contexto adicional sobre el curso o tema actual.'),
  role: z.enum(['alumno', 'mentor', 'admin']).default('alumno'),
});
export type TutorChatInput = z.infer<typeof TutorChatInputSchema>;

const TutorChatOutputSchema = z.object({
  response: z.string().describe('La respuesta educativa del tutor.'),
  suggestions: z.array(z.string()).describe('Sugerencias de temas relacionados.'),
});
export type TutorChatOutput = z.infer<typeof TutorChatOutputSchema>;

export async function tutorChat(input: TutorChatInput): Promise<TutorChatOutput> {
  return tutorChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'tutorChatPrompt',
  input: { schema: TutorChatInputSchema },
  output: { schema: TutorChatOutputSchema },
  prompt: `Eres "Evo", el tutor inteligente de la plataforma Evolución Académica. 
Tu objetivo es ayudar a los usuarios (con el rol de {{{role}}}) a comprender conceptos complejos, sugerir recursos de estudio y resolver dudas educativas.

{{#if context}}
Ten en cuenta el siguiente contexto del curso:
{{{context}}}
{{/if}}

Pregunta del usuario: {{{message}}}

Proporciona una respuesta clara, motivadora y experta. Incluye 3 temas sugeridos para seguir profundizando.`,
});

const tutorChatFlow = ai.defineFlow(
  {
    name: 'tutorChatFlow',
    inputSchema: TutorChatInputSchema,
    outputSchema: TutorChatOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('No se pudo generar respuesta del tutor.');
    return output;
  }
);
