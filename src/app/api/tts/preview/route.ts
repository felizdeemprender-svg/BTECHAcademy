import { NextRequest, NextResponse } from 'next/server';
import { generateSpeechV2 } from '@/lib/tts';
import { findVoiceById } from '@/domain/avatars';
import fs from 'fs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const voiceId = searchParams.get('voiceId') || 'es-AR-TomasNeural';
    
    // Si no pasan texto, buscar el sampleText del catálogo de avatares
    const catalogVoice = findVoiceById(voiceId);
    const defaultText = catalogVoice?.sampleText || 'Hola, este es un mensaje de prueba con mi voz.';
    const text = searchParams.get('text') || defaultText;

    const audioFilePath = await generateSpeechV2(text, voiceId);

    const audioBuffer = await fs.promises.readFile(audioFilePath);

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    console.error('[API:TTS:Preview Error]', err);
    return NextResponse.json(
      { error: err?.message || 'Error generando preescucha de voz' },
      { status: 500 }
    );
  }
}
