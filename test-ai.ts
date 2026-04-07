
import 'dotenv/config';

async function listAllModels() {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`;
  
  try {
    const res = await fetch(endpoint);
    const data = await res.json();
    if (res.ok) {
      console.log('✅ LISTA COMPLETA DE MODELOS:');
      const imagenModels = data.models.filter((m: any) => m.name.includes('image') || m.name.includes('imagen') || m.name.includes('vision'));
      if (imagenModels.length > 0) {
        console.log('🔥 MODELOS DE IMAGEN ENCONTRADOS:');
        imagenModels.forEach((m: any) => console.log(`- ${m.name} (Soporta: ${m.supportedGenerationMethods.join(', ')})`));
      } else {
        console.log('⚠️ NO SE ENCONTRARON MODELOS DE IMAGEN. Todos los modelos:');
        data.models.forEach((m: any) => console.log(`- ${m.name}`));
      }
    } else {
      console.error('❌ ERROR:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ ERROR:', err);
  }
}

listAllModels();
