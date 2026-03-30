'use server';
/**
 * @fileOverview Un flujo de Genkit para generar sugerencias de etiquetas optimizadas para SEO.
 */

import { ai, validateApiKey } from '../genkit';
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
  console.log('🔍 [SEO Tags] Validando API key...');
  try {
    validateApiKey();
    console.log('✅ [SEO Tags] API key validada');
  } catch (e: any) {
    console.error('❌ [SEO Tags] API key no disponible:', e.message);
    throw new Error('No se pudo conectar con Gemini: ' + e.message);
  }
  
  return generateTagSuggestionsFlow(input);
}

const generateTagSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateTagSuggestionsFlow',
    inputSchema: TagSuggestionInputSchema,
    outputSchema: TagSuggestionOutputSchema,
  },
  async (input) => {
    let existingTagsStr = '';
    if (input.existingTags && input.existingTags.length > 0) {
      existingTagsStr = input.existingTags.map(t => `"${t}"`).join(', ');
    }

    const { output } = await ai.generate({
      prompt: `Actúa como un experto en SEO (Search Engine Optimization) y taxonomía educativa.
Tu tarea es proponer una lista de 5 a 8 etiquetas técnicas y profesionales para clasificar cursos dentro del área de: "${input.branch}".

Reglas críticas de generación:
1. **Enfoque SEO**: Selecciona nombres que funcionen como palabras clave (keywords) de alto volumen de búsqueda en Google.
2. **Cortas y Precisas**: Las etiquetas deben tener entre 1 y 3 palabras.
3. **Semántica**: La descripción debe utilizar términos relacionados que ayuden al posicionamiento orgánico del curso.
4. **Originalidad**: NO propongas etiquetas que ya existan en esta lista: [${existingTagsStr}].
5. **Contexto**: Asegúrate de que las propuestas cubran diferentes sub-nichos dentro de la rama proporcionada.

Formato de salida: Un objeto JSON con un array 'suggestions' que contenga objetos con 'name' (la keyword) y 'description'.`,
      output: { schema: TagSuggestionOutputSchema },
      config: { 
        temperature: 0.7,
      }
    });

    if (!output) throw new Error('No se pudieron generar sugerencias SEO para esta rama.');
    return output;
  }
);
