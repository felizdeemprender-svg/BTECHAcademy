import { NextRequest, NextResponse } from 'next/server';
import { generateImagePromptFlow } from '@/ai/flows/generate-image-prompt';

export async function POST(req: NextRequest) {
  try {
    const { prompt, keywords, courseTitle, contextHint, engine, channel, uid, role, mode } = await req.json();

    const finalKeywords = keywords || courseTitle || 'education, learning';
    const hasCustomPrompt = typeof prompt === 'string' && prompt.trim().length > 0;
    let finalPrompt = hasCustomPrompt ? prompt.trim() : '';

    // Si no viene un prompt manual (o si el modo es 'prompt_only'), diseñamos el prompt experto con Gemini
    if (!hasCustomPrompt || mode === 'prompt_only') {
      try {
        console.log('[generate-image] Solicitando prompt mejorado a Gemini...');
        finalPrompt = await generateImagePromptFlow({
          keywords: finalKeywords,
          contextHint: contextHint || '',
          courseTitle: courseTitle || keywords || '',
          channel: channel || 'video',
          uid,
          role,
        });
        console.log('[generate-image] Prompt mejorado generado:', finalPrompt);
      } catch (e) {
        console.warn('[generate-image] Falló Gemini al generar el prompt. Se usará fallback', e);
        if (!finalPrompt) {
          finalPrompt = `Editorial photography representing "${courseTitle || finalKeywords}", natural cinematic lighting, shallow depth of field`;
        }
      }
    }

    if (mode === 'prompt_only') {
      return NextResponse.json({
        generatedPrompt: finalPrompt,
      });
    }

    // ==== FLUJO PRO (Google Imagen) — único motor activo ====
    // Se deprecó el flujo gratuito: cualquier engine que no sea 'premium'
    // se fuerza al motor Pro sin devolver error (no cae al gratis).
    if (engine !== 'premium') {
      console.warn(`[generate-image] engine="${engine || 'undefined'}" — flujo gratis deprecado. Forzando a Google Imagen Pro.`);
    }
    console.log('[generate-image] Ejecutando modelo Premium: Imagen');
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error('No se ha configurado la API Key de Google para Imagen.');

    const aspectRatio = channel === 'landing' || channel === 'thumbnails' ? '16:9' : '9:16';
    const promptPremium = `${finalPrompt.trim()}. High-end photography, cinematic lighting, no text, no words, no letters. Aspect Ratio: ${aspectRatio}.`;

    // Endpoint para Imagen en Google AI Studio (Beta)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;

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
        
        const isAdmin = role === 'admin';
        console.log("--- [DEBUG IA] AUDITORÍA AUTOMÁTICA (IMAGEN PREMIUM) ---");
        console.log(`> Usuario: ${uid} (${role})`);
        console.log(`> Acción Detectada: image_generation_premium`);
        console.log(`> Cantidad: 1 imagen`);
        console.log(`> Costo Proveedor: $${cost.providerCost}`);
        console.log(`> Cobro al Tutor: $${isAdmin ? '0 (Admin Gratis)' : cost.billedCost}`);
        console.log("----------------------------------------------------------");

        await deductCredits(uid, cost, 'image_generation_premium', role || 'tutor');
      } catch (err) {
        console.warn('[generate-image] No se pudo deducir créditos:', err);
      }
    }

    return NextResponse.json({ 
      imageDataUrl: `data:image/jpeg;base64,${base64Img}`, 
      generatedPrompt: finalPrompt 
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
