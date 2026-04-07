import { NextRequest, NextResponse } from 'next/server';
import { generateImagePromptFlow } from '@/ai/flows/generate-image-prompt';

export async function POST(req: NextRequest) {
  try {
    const { prompt, keywords, courseTitle, contextHint, engine } = await req.json();

    const finalKeywords = keywords || 'education, online course, professional';
    let finalPrompt = prompt || 'professional corporate training photo';

    // Si nos envían contexto rico (desde ImageEditor), usamos Gemini para diseñar un prompt experto
    if (keywords || contextHint || courseTitle) {
      try {
        console.log('[generate-image] Solicitando prompt mejorado a Gemini...');
        finalPrompt = await generateImagePromptFlow({
          keywords: finalKeywords,
          contextHint: contextHint || '',
          courseTitle: courseTitle || ''
        });
        console.log('[generate-image] Prompt mejorado generado:', finalPrompt);
      } catch (e) {
        console.warn('[generate-image] Falló Gemini al generar el prompt. Se usará fallback', e);
      }
    }

    // ==== FLUJO PREMIUM (Google Imagen 3) ====
    if (engine === 'premium') {
      console.log('[generate-image] 🔥 Ejecutando modelo Premium: Imagen 3');
      const apiKey = process.env.GOOGLE_GENAI_API_KEY;
      if (!apiKey) throw new Error('No se ha configurado la API Key de Google para Imagen 3.');

      const promptPremium = `${finalPrompt.trim()}. 4k resolution, hyperrealistic, award winning photography, professional corporate style, no text, no words.`;

      // Endpoint para Imagen 3 en Google AI Studio (Beta)
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
      
      const reqBody = {
        instances: [{ prompt: promptPremium }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          outputOptions: { mimeType: "image/jpeg" }
        }
      };

      const premiumRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });

      if (!premiumRes.ok) {
        const errText = await premiumRes.text();
        console.error('[generate-image] Imagen 3 falló:', errText);
        throw new Error('El modelo premium de Google falló. Revisa tu API Key o cuota.');
      }

      const premiumData = await premiumRes.json();
      if (!premiumData.predictions || !premiumData.predictions[0]) {
        throw new Error('La IA Premium no devolvió resultados.');
      }
      const base64Img = premiumData.predictions[0].bytesBase64Encoded;
      return NextResponse.json({ 
        imageDataUrl: `data:image/jpeg;base64,${base64Img}`, 
        generatedPrompt: promptPremium 
      });
    }

    // ==== FLUJO GRATIS (Pollinations AI) ====
    const seed = Math.floor(Math.random() * 1000000);
    const cb = Date.now(); // Cache-buster estricto
    // Modificamos ligeramente el literal del prompt para destrozar el caché interno del backend de IA
    const uniquePrompt = `${finalPrompt.trim()} - variation ${seed}`;
    const encodedPrompt = encodeURIComponent(uniquePrompt);
    // Utilizamos el modelo FLUX estricto que demora < 5 segundos en lugar del default que puede saturarse
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&seed=${seed}&nologo=true&cb=${cb}&model=flux`;

    let imageRes;
    let usedFallback = false;
    try {
      imageRes = await fetch(imageUrl, {
        signal: AbortSignal.timeout(25000) // Pollinations puede tardar 15-20s en crear imágenes puras
      });
      if (!imageRes.ok) throw new Error('Pollinations falló');
    } catch (err) {
      console.warn('[Pollinations Fallback] Servicio saturado. Rescatando con imagen de stock temática.');
      usedFallback = true;
      // Extraemos un par de keywords básicas del finalKeywords para buscar en stock
      const lowercaseKw = finalKeywords.toLowerCase();
      const kw = lowercaseKw.includes('education') ? 'education,professional' : 
                 lowercaseKw.includes('data') || lowercaseKw.includes('tech') ? 'technology,data' : 
                 'business,office';
      
      imageRes = await fetch(`https://loremflickr.com/800/600/${kw}?lock=${seed}`);
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Validar que realmente retornó una imagen y no un json de error camuflado
    const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
        return NextResponse.json(
          { error: 'El servidor de IA devolvió un formato no válido. El servicio podría estar bajo mantenimiento.' },
          { status: 502 }
        );
    }

    const base64 = buffer.toString('base64');
    const imageDataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({ imageDataUrl, generatedPrompt: finalPrompt });
  } catch (e: any) {
    console.error('[generate-image API]', e);
    // Errores de timeout o conexión
    const msg = e.name === 'TimeoutError' || e.name === 'AbortError' 
      ? 'La generación de imagen tardó demasiado (Timeout). El servicio externo está saturado.'
      : e.message || 'Error interno al comunicarse con el motor de IA.';
      
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
