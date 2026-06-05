// Test simulando Server Action de Next.js
console.log('=== TEST SERVER ACTION NEXT.JS ===\n');

// Simular entorno de Server Action
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables como Next.js Server Action
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('🔑 Variables en Server Action:');
console.log('GOOGLE_GENAI_API_KEY:', process.env.GOOGLE_GENAI_API_KEY ? 'EXISTS' : 'MISSING');

// Importar genkit como Server Action
async function testServerAction() {
  try {
    console.log('\n🔧 Importando genkit como Server Action...');
    delete require.cache[require.resolve('./src/ai/genkit.ts')];
    const { ai } = require('./src/ai/genkit.ts');
    
    console.log('✅ Genkit importado en Server Action');
    
    // Probar con más detalles para ver si Next.js trunca
    console.log('\n🤖 Probando generación extendida...');
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: 'Genera una lista de 5 tags SEO para marketing digital. Responde solo con las tags, una por línea.',
      config: {
        maxOutputTokens: 100,
        temperature: 0.1
      }
    });
    
    console.log('✅ Respuesta completa:');
    console.log('Longitud:', response.text.length);
    console.log('Contenido:', response.text);
    console.log('Tipo:', typeof response.text);
    
    if (response.text.length < 20) {
      console.error('❌ RESPUESTA TRUNCADA - Probable problema con Next.js');
    } else {
      console.log('🎉 RESPUESTA COMPLETA - IA funciona correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error en Server Action:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejutar test
testServerAction();
