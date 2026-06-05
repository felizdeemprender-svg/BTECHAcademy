
'use server';
/**
 * @fileOverview Un flujo de Genkit para generar copy publicitario persuasivo.
 * Analiza los cursos de un mentor para crear una landing page de ventas de alto impacto.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SalesCopyInputSchema = z.object({
  mentorName: z.string(),
  courses: z.array(z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
  })),
  targetAudience: z.string().optional().describe('Ej: Emprendedores, Médicos, Estudiantes universitarios.'),
});
export type SalesCopyInput = z.infer<typeof SalesCopyInputSchema>;

const SalesCopyOutputSchema = z.object({
  headline: z.string().describe('Titular principal ultra-persuasivo.'),
  subheadline: z.string().describe('Bajada que explica la transformación del alumno.'),
  benefits: z.array(z.string()).describe('Lista de 4 a 6 beneficios clave del programa.'),
  aboutMentor: z.string().describe('Blurb corto resaltando la autoridad del mentor.'),
  pricingHook: z.string().describe('Frase que justifica el valor de la inversión.'),
});
export type SalesCopyOutput = z.infer<typeof SalesCopyOutputSchema>;

export async function generateSalesCopy(input: SalesCopyInput): Promise<SalesCopyOutput> {
  return generateSalesCopyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSalesCopyPrompt',
  input: { schema: SalesCopyInputSchema },
  output: { schema: SalesCopyOutputSchema },
  prompt: `Actúa como un experto en Marketing Directo y Copywriting de respuesta rápida para infoproductos.
Tu objetivo es crear el contenido para una página de ventas (Landing Page) para los cursos del mentor: {{{mentorName}}}.

DATOS DE LOS CURSOS:
{{#each courses}}
- Título: {{{title}}}
- Descripción: {{{description}}}
- Categoría: {{{category}}}
---
{{/each}}

{{#if targetAudience}}
PÚBLICO OBJETIVO: {{{targetAudience}}}
{{/if}}

INSTRUCCIONES DE REDACCIÓN:
1. Headline: Debe ser una promesa clara de resultado (Ej: "Domina la IA y triplica tu productividad").
2. Subheadline: Debe atacar el dolor del cliente y ofrecer la solución.
3. Benefits: Enfócate en la transformación, no solo en características técnicas. Usa verbos de acción.
4. About Mentor: Redacta una presentación que genere confianza inmediata.
5. Pricing Hook: Haz que la inversión parezca pequeña comparada con el valor recibido.

El tono debe ser profesional, aspiracional y altamente persuasivo.`,
});

const generateSalesCopyFlow = ai.defineFlow(
  {
    name: 'generateSalesCopyFlow',
    inputSchema: SalesCopyInputSchema,
    outputSchema: SalesCopyOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('No se pudo generar el copy publicitario con la IA.');
    return output;
  }
);
