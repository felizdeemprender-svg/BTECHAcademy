import { generateImagePromptFlow } from '@/ai/flows/generate-image-prompt';

export async function generateImage(params: {
  prompt?: string;
  keywords?: string;
  courseTitle?: string;
  contextHint?: string;
  engine?: string;
  channel?: string;
  uid?: string;
  role?: string;
  aspectRatio?: '1:1' | '9:16' | '16:9';
}): Promise<string> {
  const { prompt, keywords, courseTitle, contextHint, engine, channel, uid, role, aspectRatio } = params;
  const finalKeywords = keywords || 'education, online course, professional';
  let finalPrompt = prompt || 'professional corporate training photo';

  if (keywords || contextHint || courseTitle) {
    try {
      finalPrompt = await generateImagePromptFlow({
        keywords: finalKeywords,
        contextHint: contextHint || '',
        courseTitle: courseTitle || '',
        channel: channel || 'video',
        uid: uid,
        role: role
      });
    } catch (e) {
      console.warn('[generateImage] Falló Gemini prompt gen', e);
    }
  }

  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new Error('No GOOGLE_GENAI_API_KEY');

  const promptPremium = `${finalPrompt.trim()}. Professional photography, cinematic lighting, no text, no words. Aspect Ratio: ${aspectRatio || '1:1'}.`;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;

  const reqBody = {
    contents: [{ parts: [{ text: promptPremium }] }]
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Error Imagen');

  const b64 = data.predictions?.[0]?.bytesBase64Encoded || data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
  if (!b64) throw new Error('No se devolvió imagen en la respuesta.');

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
      console.warn('[generateImage] No se pudo deducir créditos:', err);
    }
  }

  // Retornar Data URL directamente
  return `data:image/jpeg;base64,${b64}`;
}
