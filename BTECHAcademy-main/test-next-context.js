// Test para verificar si Next.js carga las variables correctamente
console.log('=== TEST NEXT.JS SERVER CONTEXT ===\n');

// Importar genkit como lo haría Next.js en Server Action
const path = require('path');

try {
  console.log('🔧 Cargando variables...');
  
  // Cargar .env.local como lo haría Next.js
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  
  console.log('🔑 Variables después de cargar:');
  console.log('GOOGLE_GENAI_API_KEY:', process.env.GOOGLE_GENAI_API_KEY ? 'EXISTS' : 'MISSING');
  
  // Importar genkit
  console.log('\n🔧 Importando genkit...');
  delete require.cache[require.resolve('./src/ai/genkit.ts')];
  const { ai } = require('./src/ai/genkit.ts');
  
  console.log('✅ Genkit importado');
  
  // Probar generación
  console.log('\n🤖 Probando generación...');
  ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: 'Responde "TEST OK" si puedes leer esto.',
    config: { maxOutputTokens: 10 }
  }).then(response => {
    console.log('✅ TEST OK - Respuesta:', response.text);
    console.log('\n🎉 LA IA FUNCIONA EN CONTEXTO NEXT.JS');
  }).catch(error => {
    console.error('❌ TEST FAILED - Error:', error.message);
    console.error('Causa probable: API key no disponible o inválida');
  });
  
} catch (error) {
  console.error('❌ Error general:', error.message);
}
