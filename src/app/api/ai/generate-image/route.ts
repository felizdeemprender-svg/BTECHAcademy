import { NextRequest, NextResponse } from 'next/server';
import { generateImagePromptFlow } from '@/ai/flows/generate-image-prompt';

export async function POST(req: NextRequest) {
  try {
    const { prompt, keywords, courseTitle, contextHint, engine, channel } = await req.json();

    const finalKeywords = keywords || 'education, online course, professional';
    let finalPrompt = prompt || 'professional corporate training photo';

    // Si nos envían contexto rico (desde ImageEditor), usamos Gemini para diseñar un prompt experto
    if (keywords || contextHint || courseTitle) {
      try {
        console.log('[generate-image] Solicitando prompt mejorado a Gemini...');
        finalPrompt = await generateImagePromptFlow({
          keywords: finalKeywords,
          contextHint: contextHint || '',
          courseTitle: courseTitle || '',
          channel: channel || 'video'
        });
        console.log('[generate-image] Prompt mejorado generado:', finalPrompt);
      } catch (e) {
        console.warn('[generate-image] Falló Gemini al generar el prompt. Se usará fallback', e);
      }
    }

    // ==== FLUJO PRO (Google Imagen) — único motor activo ====
    // Se deprecó el flujo gratuito: cualquier engine que no sea 'premium'
    // se fuerza al motor Pro sin devolver error (no cae al gratis).
    if (engine !== 'premium') {
      console.warn(`[generate-image] engine="${engine || 'undefined'}" — flujo gratis deprecado. Forzando a Google Imagen Pro.`);
    }
    console.log('[generate-image] 🔥 Ejecutando modelo Premium: Imagen');
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error('No se ha configurado la API Key de Google para Imagen.');

    const promptPremium = `${finalPrompt.trim()}. Professional photography, cinematic lighting, no text, no words.`;

    // Endpoint para Imagen 4 en Google AI Studio (Beta)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;

    const aspectRatio = channel === 'landing' ? "16:9" : "9:16";

    const reqBody = {
      instances: [{ prompt: promptPremium }],
      parameters: {
        sampleCount: 1,
        aspectRatio: aspectRatio,
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
      console.error('❌ Error de Google Imagen:', errText);
      throw new Error(`El modelo premium falló (${premiumRes.status}): ${errText}`);
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
  } catch (e: any) {
    console.error('[generate-image API]', e);
    // Errores de timeout o conexión
    const msg = e.name === 'TimeoutError' || e.name === 'AbortError' 
      ? 'La generación de imagen tardó demasiado (Timeout). El servicio externo está saturado.'
      : e.message || 'Error interno al comunicarse con el motor de IA.';
      
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
