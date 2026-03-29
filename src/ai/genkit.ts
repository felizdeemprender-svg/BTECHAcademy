import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Detectar ambiente
const isProduction = process.env.NODE_ENV === 'production';

// Cargar variables de entorno de forma segura (solo en desarrollo)
if (!isProduction) {
  try {
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
    console.log('🔧 Modo DESARROLLO: Variables cargadas desde .env.local');
  } catch (e) {
    console.warn('⚠️ No se pudo cargar dotenv');
  }
} else {
  console.log('🚀 Modo PRODUCCIÓN: Usando variables de Firebase');
}

/**
 * Obtiene la API key según el ambiente:
 * - Desarrollo: GOOGLE_GENAI_API_KEY (de .env.local)
 * - Producción: GOOGLE_GENAI_API_KEY_PROD (de Firebase)
 */
function getApiKey(): string | undefined {
  if (isProduction) {
    // En producción, intentar leer desde Firebase Functions Config primero
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const functions = require('firebase-functions');
      const config = functions.config();
      if (config?.google?.genai_api_key_prod) {
        console.log('🔑 Usando API key de Firebase Functions Config');
        return config.google.genai_api_key_prod;
      }
    } catch (e) {
      console.warn('⚠️ No se pudo leer functions.config(), intentando process.env');
    }
    
    // Fallback: intentar desde process.env (Firebase Environment Variables)
    const prodKey = process.env.GOOGLE_GENAI_API_KEY_PROD || process.env.GOOGLE_API_KEY_PROD;
    if (prodKey) {
      console.log('🔑 Usando API key de PRODUCCIÓN (env var)');
      return prodKey;
    }
    
    console.error('❌ ERROR: GOOGLE_GENAI_API_KEY_PROD no configurada en producción');
    console.error('   Configura con: firebase functions:config:set google.genai_api_key_prod="TU_API_KEY"');
    return undefined;
  } else {
    // En desarrollo, usar variable de desarrollo
    const devKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (devKey) {
      console.log('🔑 Usando API key de DESARROLLO');
      return devKey;
    }
    console.error('❌ ERROR: GOOGLE_GENAI_API_KEY no configurada en .env.local');
    return undefined;
  }
}

const apiKey = getApiKey();

if (!apiKey) {
  console.error('❌ ERROR CRÍTICO: No se encontró API key de Gemini');
  if (isProduction) {
    console.error('   Configura GOOGLE_GENAI_API_KEY_PROD en Firebase Environment Variables');
  } else {
    console.error('   Configura GOOGLE_GENAI_API_KEY en .env.local');
  }
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
    const varName = isProduction ? 'GOOGLE_GENAI_API_KEY_PROD' : 'GOOGLE_GENAI_API_KEY';
    throw new Error(`API key de Gemini no configurada. Revisa ${varName}`);
  }
  return key;
}
