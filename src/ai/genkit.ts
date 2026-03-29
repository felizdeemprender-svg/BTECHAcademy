import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configuración del motor Genkit para Next.js.
 * Soporta diferentes variables según ambiente:
 * - Local: GOOGLE_GENAI_API_KEY o GOOGLE_API_KEY (desde .env.local)
 * - Producción: Configuración desde Firebase Functions Config o Environment Variables
 */
function getApiKey(): string | undefined {
  // Intentar leer de Firebase Functions Config (producción)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const functions = require('firebase-functions');
    const config = functions.config();
    if (config?.google?.genai_api_key_prod) {
      console.log('🔑 Usando API key de Firebase Functions Config');
      return config.google.genai_api_key_prod;
    }
  } catch {
    // No está en Firebase Functions, continuar con otras opciones
  }

  // Revisar variables de entorno de producción (Firebase Environment Variables)
  const prodKey = process.env.GOOGLE_GENAI_API_KEY_PROD || process.env.GOOGLE_API_KEY_PROD;
  if (prodKey) {
    console.log('🔑 Usando API key de PRODUCCIÓN (env var)');
    return prodKey;
  }
  
  // Revisar variables de desarrollo (local)
  const devKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (devKey) {
    console.log('🔑 Usando API key de DESARROLLO');
    return devKey;
  }
  
  return undefined;
}

const apiKey = getApiKey();

if (!apiKey) {
  console.warn('⚠️ Ninguna API key configurada. Las funciones de IA no funcionarán.');
  console.warn('   Local: Configura GOOGLE_GENAI_API_KEY en .env.local');
  console.warn('   Prod:  Configura google.genai_api_key_prod en Firebase');
}

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: apiKey || 'dummy-key-for-build'
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});

/**
 * Verifica que la API key esté disponible antes de usar IA.
 */
export function validateApiKey(): string {
  const key = getApiKey();
  if (!key) {
    throw new Error('API key no configurada. Revisa GOOGLE_GENAI_API_KEY (local) o google.genai_api_key_prod (Firebase)');
  }
  return key;
}
