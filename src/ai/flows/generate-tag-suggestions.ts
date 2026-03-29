'use server';
/**
 * @fileOverview Un flujo de Genkit para generar sugerencias de etiquetas optimizadas para SEO.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TagSuggestionInputSchema = z.object({
  branch: z.string().describe('La rama o área de conocimiento (ej: Marketing, Medicina, Programación).'),
  existingTags: z.array(z.string()).optional().describe('Lista de nombres de etiquetas que ya existen para evitar duplicados.'),
});
export type TagSuggestionInput = z.infer<typeof TagSuggestionInputSchema>;

const TagItemSchema = z.object({
  name: z.string().describe('Nombre corto, profesional y optimizado para SEO.'),
  description: z.string().describe('Descripción breve que incluya términos semánticos para búsqueda.'),
});

const TagSuggestionOutputSchema = z.object({
  suggestions: z.array(TagItemSchema),
});
export type TagSuggestionOutput = z.infer<typeof TagSuggestionOutputSchema>;

export async function generateTagSuggestions(input: TagSuggestionInput): Promise<TagSuggestionOutput> {
  // Diagnóstico: verificar si la API key está disponible en el servidor
  console.log('🔍 SERVER: Verificando API key en generateTagSuggestions');
  console.log('🔍 SERVER: GOOGLE_GENAI_API_KEY existe:', !!process.env.GOOGLE_GENAI_API_KEY);
  console.log('🔍 SERVER: GOOGLE_API_KEY existe:', !!process.env.GOOGLE_API_KEY);
  
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ SERVER: No hay API key disponible para Gemini');
    throw new Error('No se pudo conectar con Gemini: API key no configurada en el servidor');
  }
  
  console.log('✅ SERVER: API key disponible, ejecutando flow...');
  return generateTagSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTagSuggestionsPrompt',
  input: { schema: TagSuggestionInputSchema },
  output: { schema: TagSuggestionOutputSchema },
  prompt: `Actúa como un experto en SEO (Search Engine Optimization) y taxonomía educativa.
Tu tarea es proponer una lista de 5 a 8 etiquetas técnicas y profesionales para clasificar cursos dentro del área de: "{{{branch}}}".

Reglas críticas de generación:
1. **Enfoque SEO**: Selecciona nombres que funcionen como palabras clave (keywords) de alto volumen de búsqueda en Google.
2. **Cortas y Precisas**: Las etiquetas deben tener entre 1 y 3 palabras.
3. **Semántica**: La descripción debe utilizar términos relacionados que ayuden al posicionamiento orgánico del curso.
4. **Originalidad**: NO propongas etiquetas que ya existan en esta lista: {{#each existingTags}} "{{this}}", {{/each}}.
5. **Contexto**: Asegúrate de que las propuestas cubran diferentes sub-nichos dentro de la rama proporcionada.

Formato de salida: Un objeto JSON con un array 'suggestions' que contenga objetos con 'name' (la keyword) y 'description'.`,
});

const generateTagSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateTagSuggestionsFlow',
    inputSchema: TagSuggestionInputSchema,
    outputSchema: TagSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('No se pudieron generar sugerencias SEO para esta rama.');
    return output;
  }
);
