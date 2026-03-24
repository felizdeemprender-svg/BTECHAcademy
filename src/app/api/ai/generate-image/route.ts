import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json({ error: 'Prompt inválido.' }, { status: 400 });
    }

    // Utilizamos Pollinations AI para generación de imágenes gratuita y sin key (ya que Google AI Studio no exporta Imagen 3 aún)
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(prompt.trim());
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&seed=${seed}&nologo=true`;

    let imageRes;
    let usedFallback = false;
    try {
      imageRes = await fetch(imageUrl, {
        signal: AbortSignal.timeout(8000) // Timeout rápido de 8s
      });
      if (!imageRes.ok) throw new Error('Pollinations falló');
    } catch (err) {
      console.warn('[Pollinations Fallback] Servicio saturado. Rescatando con imagen de stock temática.');
      usedFallback = true;
      // Extraemos un par de keywords básicas del prompt para buscar en stock (en inglés)
      const kw = prompt.toLowerCase().includes('education') ? 'education,professional' : 
                 prompt.toLowerCase().includes('marketing') ? 'marketing,business' : 
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

    return NextResponse.json({ imageDataUrl });
  } catch (e: any) {
    console.error('[generate-image API]', e);
    // Errores de timeout o conexión
    const msg = e.name === 'TimeoutError' || e.name === 'AbortError' 
      ? 'La generación de imagen tardó demasiado (Timeout). El servicio externo está saturado.'
      : e.message || 'Error interno al comunicarse con el motor de IA.';
      
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
