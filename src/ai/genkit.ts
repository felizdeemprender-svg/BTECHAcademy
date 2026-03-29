import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno desde .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env.local') });

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
