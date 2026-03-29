// Script simple para probar .env.local
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando archivo .env.local...');

const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Path:', envPath);

try {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('✅ Archivo leído');
  console.log('Contenido:');
  console.log(content);
  console.log('---');
  
  // Probar dotenv
  const dotenv = require('dotenv');
  const result = dotenv.config({ path: envPath });
  
  console.log('Resultado dotenv:', result);
  
  if (result.error) {
    console.error('❌ Error dotenv:', result.error);
  }
  
  console.log('\nVariables después de dotenv:');
  console.log('GOOGLE_GENAI_API_KEY:', process.env.GOOGLE_GENAI_API_KEY ? '✅' : '❌');
  console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '✅' : '❌');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
