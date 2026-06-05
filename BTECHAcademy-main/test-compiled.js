// Test con archivos compilados de Next.js
console.log('=== TEST CON ARCHIVOS COMPILADOS ===\n');

// Cargar variables de entorno
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('🔑 Variables cargadas:', process.env.GOOGLE_GENAI_API_KEY ? 'OK' : 'NO');

// Intentar cargar desde el directorio compilado
try {
  console.log('\n🔍 Buscando archivos compilados...');
  const fs = require('fs');
  
  // Buscar en directorio actual
  const possiblePaths = [
    './src/ai/flows/generate-tag-suggestions.js',
    './src/ai/flows/generate-template-collection.js',
    '../src/ai/flows/generate-tag-suggestions.js',
    '../src/ai/flows/generate-template-collection.js'
  ];
  
  for (const testPath of possiblePaths) {
    try {
      if (fs.existsSync(testPath)) {
        console.log(`✅ Encontrado: ${testPath}`);
        
        if (testPath.includes('generate-tag-suggestions')) {
          const { generateTagSuggestions } = require(testPath);
          generateTagSuggestions({
            branch: 'Marketing Digital',
            existingTags: []
          }).then(result => {
            console.log('✅ TAGS FUNCIONA:', result.suggestions?.length || 0);
          }).catch(error => {
            console.error('❌ TAGS ERROR:', error.message);
          });
        }
        
        if (testPath.includes('generate-template-collection')) {
          const { generateTemplateCollection } = require(testPath);
          generateTemplateCollection({
            directives: 'Test',
            mentorName: 'Test',
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
            console.log('✅ TEMPLATES FUNCIONA:', result.landings?.length || 0);
          }).catch(error => {
            console.error('❌ TEMPLATES ERROR:', error.message);
          });
        }
      }
    } catch (e) {
      console.log(`❌ No se puede cargar ${testPath}:`, e.message);
    }
  }
} catch (error) {
  console.error('❌ Error general:', error.message);
}
