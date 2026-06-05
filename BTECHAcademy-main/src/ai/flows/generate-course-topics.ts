'use server';
/**
 * @fileOverview A Genkit flow that generates suggestions for new course topics.
 *
 * - generateCourseTopics - A function that handles the course topic generation process.
 * - GenerateCourseTopicsInput - The input type for the generateCourseTopics function.
 * - GenerateCourseTopicsOutput - The return type for the generateCourseTopics function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateCourseTopicsInputSchema = z.object({
  context: z.string().optional().describe('Optional existing course content or current trends to base suggestions on.'),
});
export type GenerateCourseTopicsInput = z.infer<typeof GenerateCourseTopicsInputSchema>;

const GenerateCourseTopicsOutputSchema = z.object({
  topics: z.array(z.string().describe('A suggested course topic.')).describe('A list of suggested course topics.'),
});
export type GenerateCourseTopicsOutput = z.infer<typeof GenerateCourseTopicsOutputSchema>;

export async function generateCourseTopics(input: GenerateCourseTopicsInput): Promise<GenerateCourseTopicsOutput> {
  return generateCourseTopicsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCourseTopicsPrompt',
  input: { schema: GenerateCourseTopicsInputSchema },
  output: { schema: GenerateCourseTopicsOutputSchema },
  prompt: `You are an expert in educational content creation. Your task is to generate a list of relevant and engaging course topics.

{{#if context}}
Use the following context to inspire the course topics:
Context: {{{context}}}
{{else}}
Generate topics based on general current trends and educational needs.
{{/if}}

Provide a list of 5-10 distinct course topics.`,
});

const generateCourseTopicsFlow = ai.defineFlow(
  {
    name: 'generateCourseTopicsFlow',
    inputSchema: GenerateCourseTopicsInputSchema,
    outputSchema: GenerateCourseTopicsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate course topics.');
    }
    return output;
  }
);
