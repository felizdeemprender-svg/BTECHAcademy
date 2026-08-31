import { NextRequest, NextResponse } from 'next/server';
import { generateImagePromptFlow } from '@/ai/flows/generate-image-prompt';

export async function POST(req: NextRequest) {
  try {
    const { prompt, keywords, courseTitle, contextHint, engine, channel, uid, role } = await req.json();

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

    // Endpoint para Imagen en Google AI Studio (Beta)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;

    const aspectRatio = channel === 'landing' ? "16:9" : "9:16";

    const reqBody = {
      contents: [{
        parts: [{ text: promptPremium }]
      }]
    };

    const premiumRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    });

    if (!premiumRes.ok) {
      const errText = await premiumRes.text();
      console.error('❌ Error de Google Imagen (Gemini):', errText);
      throw new Error(`El modelo premium falló (${premiumRes.status}): ${errText}`);
    }

    const premiumData = await premiumRes.json();
    if (!premiumData.candidates || !premiumData.candidates[0]) {
      throw new Error('La IA Premium no devolvió resultados.');
    }
    
    let base64Img = '';
    const parts = premiumData.candidates[0].content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData);
    if (imagePart && imagePart.inlineData) {
      base64Img = imagePart.inlineData.data;
    } else {
      throw new Error('La IA Premium no devolvió una imagen en el formato esperado.');
    }

    // Cobrar por la imagen generada
    if (uid) {
      try {
        const { calculateImageCost, deductCredits } = await import('@/lib/payments/credits');
        const cost = await calculateImageCost(1);
        await deductCredits(uid, cost, 'image_generation_premium', role || 'tutor');
      } catch (err) {
        console.warn('[generate-image] No se pudo deducir créditos:', err);
      }
    }

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
