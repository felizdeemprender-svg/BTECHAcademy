'use server';
/**
 * @fileOverview Un flujo de Genkit para generar sugerencias de temas sensibles de moderación.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ModerationSuggestionInputSchema = z.object({
  context: z.string().describe('El contexto institucional o área temática (ej: Educación, Salud, Inversiones).'),
  existingTopics: z.array(z.string()).optional().describe('Lista de temas que ya están bajo vigilancia para evitar duplicados.'),
});
export type ModerationSuggestionInput = z.infer<typeof ModerationSuggestionInputSchema>;

const ModerationSuggestionOutputSchema = z.object({
  suggestions: z.array(z.object({
    topic: z.string().describe('Nombre del concepto o tema sensible.'),
    reason: z.string().describe('Explicación de por qué este tema podría requerir supervisión humana.'),
  })),
});
export type ModerationSuggestionOutput = z.infer<typeof ModerationSuggestionOutputSchema>;

export async function generateModerationSuggestions(input: ModerationSuggestionInput): Promise<ModerationSuggestionOutput> {
  return generateModerationSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateModerationSuggestionsPrompt',
  input: { schema: ModerationSuggestionInputSchema },
  output: { schema: ModerationSuggestionOutputSchema },
  prompt: `Actúa como un experto en ética institucional y auditoría de contenidos educativos.
Tu tarea es proponer una lista de 5 a 8 temas o conceptos "Sensibles" que deberían requerir revisión manual por un administrador antes de ser publicados en un catálogo oficial.

Contexto de la Institución: "{{{context}}}"

Reglas críticas:
1. Propón temas que puedan generar riesgos legales, éticos o de reputación específicamente en el contexto mencionado.
2. NO propongas temas que ya existan en esta lista de control actual: {{#each existingTopics}} "{{this}}", {{/each}}.
3. Las sugerencias deben ser términos cortos (1-3 palabras) acompañados de una breve justificación.
4. Enfócate en la prevención de desinformación, temas controversiales o prácticas no autorizadas.

Formato de salida: Un objeto JSON con un array 'suggestions' que contenga objetos con 'topic' y 'reason'.`,
});

const generateModerationSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateModerationSuggestionsFlow',
    inputSchema: ModerationSuggestionInputSchema,
    outputSchema: ModerationSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('No se pudieron generar sugerencias de moderación para este contexto.');
    return output;
  }
);
