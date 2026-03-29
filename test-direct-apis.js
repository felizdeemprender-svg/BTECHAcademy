// Test directo de APIs de Gemini fuera de la aplicación
console.log('=== TEST DIRECTO DE APIS GEMINI ===\n');

// Cargar variables de entorno
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('🔑 Variables de entorno:');
console.log('GOOGLE_GENAI_API_KEY:', process.env.GOOGLE_GENAI_API_KEY ? 'EXISTS' : 'MISSING');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'EXISTS' : 'MISSING');

// Test 1: Importar genkit y probar conexión básica
console.log('\n🧪 TEST 1: Conexión básica con Genkit');
try {
  const { ai } = require('./src/ai/genkit.ts');
  
  ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: 'Responde "OK" si puedes leer esto.',
    config: { maxOutputTokens: 5 }
  }).then(response => {
    console.log('✅ TEST 1 OK:', response.text);
  }).catch(error => {
    console.error('❌ TEST 1 FAILED:', error.message);
  });
} catch (error) {
  console.error('❌ TEST 1 ERROR:', error.message);
}

// Test 2: Probar flujo de generación de tags
console.log('\n🏷️ TEST 2: Flujo de generación de tags');
setTimeout(() => {
  try {
    const { generateTagSuggestions } = require('./src/ai/flows/generate-tag-suggestions.js');
    
    generateTagSuggestions({
      branch: 'Marketing Digital',
      existingTags: []
    }).then(result => {
      console.log('✅ TEST 2 OK - Tags generadas:', result.suggestions?.length || 0);
      console.log('📝 Primera tag:', result.suggestions?.[0]?.name || 'N/A');
    }).catch(error => {
      console.error('❌ TEST 2 FAILED:', error.message);
    });
  } catch (error) {
    console.error('❌ TEST 2 ERROR:', error.message);
  }
}, 2000);

// Test 3: Probar flujo de templates
console.log('\n📄 TEST 3: Flujo de generación de templates');
setTimeout(() => {
  try {
    const { generateTemplateCollection } = require('./src/ai/flows/generate-template-collection.js');
    
    generateTemplateCollection({
      directives: 'Crear templates para marketing digital',
      mentorName: 'Test Mentor',
      designTokens: {
        primary: '#FF6B6B',
        secondary: '#FFFFFF',
        accent: '#4ECDC4',
        fontHeading: 'Inter',
        fontBody: 'Inter'
      },
      enabledChannels: {
        landings: true,
        emails: false,
        socials: false,
        ads: false
      }
    }).then(result => {
      console.log('✅ TEST 3 OK - Templates generados');
      console.log('📄 Landings:', result.landings?.length || 0);
    }).catch(error => {
      console.error('❌ TEST 3 FAILED:', error.message);
    });
  } catch (error) {
    console.error('❌ TEST 3 ERROR:', error.message);
  }
}, 4000);

console.log('\n⏳ Ejecutando tests...');
