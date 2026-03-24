import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configuración del motor Genkit.
 * Se fuerza la carga de la API Key desde el entorno para evitar errores de resolución
 * en el contexto de ejecución de Next.js Server Actions.
 */
export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: process.env.GOOGLE_GENAI_API_KEY 
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
