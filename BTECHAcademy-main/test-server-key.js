// Test directo de API key en contexto de servidor
console.log('=== TEST SERVIDOR API KEY ===');

// Cargar .env.local como lo haría Next.js
const path = require('path');
const dotenv = require('dotenv');

console.log('🔧 Cargando .env.local...');
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (result.error) {
  console.error('❌ Error dotenv:', result.error);
  process.exit(1);
}

console.log('✅ Variables cargadas:');
console.log('GOOGLE_GENAI_API_KEY:', process.env.GOOGLE_GENAI_API_KEY ? 'EXISTS' : 'MISSING');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'EXISTS' : 'MISSING');

// Importar genkit y probar
try {
  console.log('\n🔧 Importando genkit...');
  const { ai, validateApiKey } = require('./src/ai/genkit.ts');
  
  console.log('✅ Genkit importado');
  
  const apiKey = validateApiKey();
  console.log('🔑 API key validada:', apiKey ? 'SUCCESS' : 'FAILED');
  console.log('🔑 Key preview:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A');
  
  // Probar generación simple con ai.generate
  console.log('\n🤖 Probando generación con IA...');
  
  ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: 'Responde "TEST OK" si puedes leer esto.',
    config: {
      maxOutputTokens: 10
    }
  }).then(response => {
    console.log('✅ TEST OK - Respuesta:', response.text);
    process.exit(0);
  }).catch(error => {
    console.error('❌ TEST FAILED - Error:', error.message);
    console.error('❌ Full error:', error);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Error importando genkit:', error.message);
  process.exit(1);
}
