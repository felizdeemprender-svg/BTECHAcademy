// Script para probar configuración de API key
const path = require('path');

// Cargar .env.local PRIMERO (antes de cualquier otra cosa)
console.log('🔧 Cargando .env.local...');
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  console.log('✅ .env.local cargado');
} catch (e) {
  console.log('⚠️ No se pudo cargar .env.local:', e.message);
}

console.log('\n🔍 Verificando configuración de API key...\n');

// Verificar variables de entorno
console.log('Variables de entorno:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('GOOGLE_GENAI_API_KEY:', process.env.GOOGLE_GENAI_API_KEY ? '✅ Configurada' : '❌ No configurada');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '✅ Configurada' : '❌ No configurada');
console.log('GOOGLE_GENAI_API_KEY_PROD:', process.env.GOOGLE_GENAI_API_KEY_PROD ? '✅ Configurada' : '❌ No configurada');

// Mostrar preview de las keys configuradas
if (process.env.GOOGLE_GENAI_API_KEY) {
  console.log('🔑 GOOGLE_GENAI_API_KEY preview:', process.env.GOOGLE_GENAI_API_KEY.substring(0, 10) + '...');
}
if (process.env.GOOGLE_API_KEY) {
  console.log('🔑 GOOGLE_API_KEY preview:', process.env.GOOGLE_API_KEY.substring(0, 10) + '...');
}

// Intentar cargar genkit.ts en modo desarrollo
try {
  console.log('\n🔧 Probando carga de genkit.ts en modo DESARROLLO...');
  
  // Forzar modo desarrollo
  process.env.NODE_ENV = 'development';
  
  // Limpiar cache del módulo
  delete require.cache[require.resolve('./src/ai/genkit.ts')];
  
  // Cargar el módulo
  const genkitModule = require('./src/ai/genkit.ts');
  
  console.log('✅ Módulo genkit.ts cargado correctamente');
  
  try {
    const apiKey = genkitModule.validateApiKey();
    console.log('🔑 API key detectada:', apiKey ? '✅ Válida' : '❌ Inválida');
    console.log('Key preview:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A');
  } catch (error) {
    console.error('❌ Error de validación:', error.message);
  }
  
} catch (error) {
  console.error('❌ Error al cargar genkit.ts:', error.message);
}

// Probar modo producción
try {
  console.log('\n🚀 Probando carga de genkit.ts en modo PRODUCCIÓN...');
  
  // Forzar modo producción
  process.env.NODE_ENV = 'production';
  
  // Limpiar cache del módulo
  delete require.cache[require.resolve('./src/ai/genkit.ts')];
  
  // Cargar el módulo
  const genkitModule = require('./src/ai/genkit.ts');
  
  console.log('✅ Módulo genkit.ts cargado correctamente');
  
  try {
    const apiKey = genkitModule.validateApiKey();
    console.log('🔑 API key detectada:', apiKey ? '✅ Válida' : '❌ Inválida');
    console.log('Key preview:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A');
  } catch (e) {
    console.log('❌ Error de validación (esperado en local):', e.message);
  }
  
} catch (error) {
  console.error('❌ Error al cargar genkit.ts:', error.message);
}

console.log('\n🏁 Prueba completada');
