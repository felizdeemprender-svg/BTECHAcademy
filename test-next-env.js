// Test simulando entorno Next.js con path aliases
console.log('=== TEST CON PATH ALIASES (COMO NEXT.JS) ===\n');

// Configurar path aliases como Next.js
const path = require('path');
const fs = require('fs');

// Simular configuración de Next.js paths
function createAliases() {
  const dir = path.resolve(process.cwd(), 'src');
  const aliases = {
    '@/ai': path.join(dir, 'ai'),
    '@/lib': path.join(dir, 'lib'),
    '@/components': path.join(dir, 'components'),
    '@/ui': path.join(dir, 'components/ui')
  };
  
  // Configurar require para que entienda los aliases
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    // Reemplazar alias con path real
    for (const [alias, realPath] of Object.entries(aliases)) {
      if (id.startsWith(alias)) {
        id = id.replace(alias, realPath);
      }
    }
    return originalRequire.call(this, id);
  };
  
  console.log('✅ Aliases configurados:', Object.keys(aliases));
}

createAliases();

// Cargar variables de entorno
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('🔑 Variables de entorno:');
console.log('GOOGLE_GENAI_API_KEY:', process.env.GOOGLE_GENAI_API_KEY ? 'EXISTS' : 'MISSING');

// Test con imports usando aliases
console.log('\n🧪 TEST con aliases como Next.js');
try {
  // Importar genkit con alias
  const { ai } = require('@/ai/genkit.ts');
  
  ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: 'Responde "OK" si puedes leer esto.',
    config: { maxOutputTokens: 5 }
  }).then(response => {
    console.log('✅ Genkit con alias OK:', response.text);
  }).catch(error => {
    console.error('❌ Genkit con alias FAILED:', error.message);
  });
} catch (error) {
  console.error('❌ Error importando con alias:', error.message);
}

// Test flujo de tags
console.log('\n🏷️ TEST flujo de tags con alias');
setTimeout(() => {
  try {
    const { generateTagSuggestions } = require('@/ai/flows/generate-tag-suggestions.ts');
    
    generateTagSuggestions({
      branch: 'Marketing Digital',
      existingTags: []
    }).then(result => {
      console.log('✅ Tags con alias OK - Cantidad:', result.suggestions?.length || 0);
      console.log('📝 Primera tag:', result.suggestions?.[0]?.name || 'N/A');
    }).catch(error => {
      console.error('❌ Tags con alias FAILED:', error.message);
    });
  } catch (error) {
    console.error('❌ Error importando tags con alias:', error.message);
  }
}, 2000);
