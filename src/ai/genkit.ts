import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Cargar variables de entorno de forma segura
try {
  // Para Server Actions en Next.js, intentar cargar desde process.env primero
  // Si no están disponibles, intentar con dotenv
  if (!process.env.GOOGLE_GENAI_API_KEY && !process.env.GOOGLE_API_KEY) {
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
    console.log('� Variables cargadas desde .env.local');
  }
} catch (e) {
  console.warn('⚠️ No se pudo cargar dotenv, usando process.env');
}

/**
 * Obtiene la API key de Gemini según el ambiente
 */
function getApiKey(): string | undefined {
  // Revisar variables de entorno (local o producción)
  const key = process.env.GOOGLE_GENAI_API_KEY || 
              process.env.GOOGLE_API_KEY ||
              process.env.GOOGLE_GENAI_API_KEY_PROD ||
              process.env.GOOGLE_API_KEY_PROD;
  
  if (key) {
    console.log('🔑 API key configurada');
    return key;
  }
  
  return undefined;
}

const apiKey = getApiKey();

if (!apiKey) {
  console.error('❌ ERROR CRÍTICO: No se encontró API key de Gemini');
  console.error('   Asegúrate de configurar GOOGLE_GENAI_API_KEY en .env.local (local)');
  console.error('   o en Firebase Environment Variables (producción)');
}

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: apiKey || 'invalid-key'
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
    throw new Error('API key de Gemini no configurada. Revisa GOOGLE_GENAI_API_KEY');
  }
  return key;
}
