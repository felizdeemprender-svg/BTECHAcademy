'use server';
/**
 * @fileOverview Un flujo de Genkit que analiza un documento para proponer una estructura de curso completa.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateCourseStructureInputSchema = z.object({
  content: z.string().describe('El texto extraído del documento original.'),
  preferredLevel: z.enum(['basico', 'medio', 'avanzado']).optional(),
});
export type GenerateCourseStructureInput = z.infer<typeof GenerateCourseStructureInputSchema>;

const ModuleProposalSchema = z.object({
  title: z.string(),
  description: z.string(),
  objectives: z.array(z.string()),
  order: z.number(),
});

const GenerateCourseStructureOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  level: z.enum(['basico', 'medio', 'avanzado']),
  duration: z.number().describe('Horas estimadas'),
  modules: z.array(ModuleProposalSchema),
});
export type GenerateCourseStructureOutput = z.infer<typeof GenerateCourseStructureOutputSchema>;

export async function generateCourseStructure(input: GenerateCourseStructureInput): Promise<GenerateCourseStructureOutput> {
  return generateCourseStructureFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCourseStructurePrompt',
  input: { schema: GenerateCourseStructureInputSchema },
  output: { schema: GenerateCourseStructureOutputSchema },
  prompt: `Actúa como un diseñador instruccional experto. Analiza el siguiente contenido y propón una estructura de curso e-learning coherente.

Contenido del documento:
{{{content}}}

Nivel preferido: {{{preferredLevel}}}

Debes devolver un JSON con:
- Un título atractivo.
- Una descripción detallada.
- Una categoría sugerida.
- El nivel de dificultad.
- Duración total estimada en horas.
- Una lista de módulos (mínimo 3) con sus respectivos títulos, descripciones y objetivos de aprendizaje.`,
});

const generateCourseStructureFlow = ai.defineFlow(
  {
    name: 'generateCourseStructureFlow',
    inputSchema: GenerateCourseStructureInputSchema,
    outputSchema: GenerateCourseStructureOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('No se pudo generar la estructura del curso.');
    return output;
  }
);
