import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function POST(req: Request) {
  try {
    const { adnId, format, isFull } = await req.json();
    if (!adnId || !format) return NextResponse.json({ success: false, error: "Faltan parámetros" }, { status: 400 });

    // 1. Mapear resoluciones
    const resolutions: Record<string, string> = {
      '9:16': '1080x1920',
      '1:1': '1080x1080',
      '16:9': '1920x1080',
      '4:5': '1080x1350'
    };
    const resolution = resolutions[format] || '1080x1920';

    // 2. Obtener el blueprint para sacar una escena real
    const blueprintPath = path.join(process.cwd(), 'public', 'adns', adnId, 'blueprint.json');
    let scenes: any[] = [{
      text: "PRUEBA DE HUMO EVO",
      segment_label: "GANCHO",
      duration: 3,
      imageUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1080&q=80"
    }];

    let audioUrlFromBlueprint = undefined;
    try {
      const content = await fs.readFile(blueprintPath, 'utf-8');
      const blueprint = JSON.parse(content);
      audioUrlFromBlueprint = blueprint.background_music_url;
      const slices = blueprint.slices || blueprint.default_blueprint?.slices || [];
      
      if (isFull && slices.length > 0) {
        scenes = slices; // Render completo
      } else if (slices.length > 0) {
        scenes = [{ ...slices[0], duration: 3 }]; // Smoke test
      }
    } catch (e) {
      console.warn("No se pudo leer blueprint para render, usando fallback.");
    }

    const renderUrl = `${new URL(req.url).origin}/api/video/render-v2`;

    const renderPayload = {
      jobId: `${isFull ? 'full' : 'smoke'}_${adnId}_${format.replace(':', '_')}`,
      scenes: scenes,
      resolution,
      adnId,
      audioUrl: audioUrlFromBlueprint,
      enable_tts: true, 
      marketingName: `${isFull ? 'FULL' : 'SMOKE'}_${adnId}`,
      isSmokeTest: true 
    };

    // Llamada interna al motor
    const renderRes = await fetch(renderUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(renderPayload)
    });

    const result = await renderRes.json();

    // 4. PREPARAR URL DE PREVISTA
    // Nota: No borramos inmediatamente para que el usuario pueda ver el video.
    // El Garbage Collector de render-v2 limpiará esto en 24h.
    let previewUrl = result.webViewLink;
    if (!previewUrl && result.jobId) {
      previewUrl = `${new URL(req.url).origin}/api/video/preview?jobId=${result.jobId}&t=${Date.now()}`;
    }

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: `${isFull ? 'Render completo' : 'Certificación'} exitosa en ${format}.`,
        previewUrl: previewUrl 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: `Error FFmpeg en ${format}: ${result.error}` 
      });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
