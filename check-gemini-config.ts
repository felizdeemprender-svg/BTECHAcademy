import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import dotenv from 'dotenv';

// Cargar variables de entorno - ruta absoluta
dotenv.config(); // Carga automáticamente .env.local

async function checkGeminiConfig() {
  console.log('🔍 Verificando configuración de Gemini API:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('GOOGLE_GENAI_API_KEY existe:', !!process.env.GOOGLE_GENAI_API_KEY);
  console.log('GOOGLE_GENAI_API_KEY longitud:', process.env.GOOGLE_GENAI_API_KEY?.length || 0);
  
  // También verificar GOOGLE_API_KEY por si acaso
  console.log('GOOGLE_API_KEY existe:', !!process.env.GOOGLE_API_KEY);
  console.log('GOOGLE_API_KEY longitud:', process.env.GOOGLE_API_KEY?.length || 0);

  // Usar cualquiera de las dos keys que exista
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.log('❌ ERROR: Ninguna API key de Google está definida');
    console.log('💡 Solución: Verifica que .env.local contenga GOOGLE_GENAI_API_KEY');
    return;
  }

  try {
    console.log('🚀 Intentando inicializar Genkit...');
    const ai = genkit({
      plugins: [
        googleAI({ 
          apiKey: apiKey
        }),
      ],
      model: 'googleai/gemini-2.5-flash',
    });

    console.log('✅ Genkit inicializado correctamente');
    
    // Probar una generación simple
    console.log('🧪 Probando generación simple...');
    const { text } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: 'Responde con "Gemini funciona correctamente" en español.',
      config: {
        maxOutputTokens: 50,
      },
    });

    console.log('✅ Generación exitosa:', text);
    
  } catch (error: any) {
    console.error('❌ Error al usar Gemini:', error);
    
    if (error.message.includes('API key')) {
      console.log('💡 Probablemente la API key es inválida o no tiene permisos');
    }
    
    if (error.message.includes('quota')) {
      console.log('💡 Probablemente se alcanzó el límite de cuota');
    }
  }

  console.log('🏁 Verificación completada');
}

checkGeminiConfig();
