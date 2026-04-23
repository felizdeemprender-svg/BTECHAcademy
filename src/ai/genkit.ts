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
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ]
  }
});

/**
 * Verifica que las API keys críticas estén disponibles.
 */
export function validateAiConfig() {
  const genaiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  const ttsKey = process.env.GOOGLE_TTS_API_KEY;

  const status = {
    has_genai: !!genaiKey,
    has_tts: !!ttsKey
  };

  if (!genaiKey) {
    console.error('[Genkit] ERROR: API key de Gemini no configurada.');
    throw new Error('Servicio de IA no disponible (Falta GOOGLE_GENAI_API_KEY)');
  }

  if (!ttsKey) {
    console.warn('[Genkit] ADVERTENCIA: GOOGLE_TTS_API_KEY no configurada. Las locuciones podrían fallar.');
  }

  return status;
}

/**
 * Alias para compatibilidad con flujos existentes.
 */
export function validateApiKey(): string {
  validateAiConfig();
  return (process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY)!;
}
