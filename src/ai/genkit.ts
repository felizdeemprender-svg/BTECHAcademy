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
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});

/**
 * Verifica que la API key esté disponible antes de usar IA.
 */
export function validateApiKey(): string {
  const key = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error('API key de Gemini no configurada. Revisa GOOGLE_GENAI_API_KEY en .env.local');
  }
  return key;
}
