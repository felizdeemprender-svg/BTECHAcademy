/**
 * @fileOverview Utilidad para generación de voz mediante Google Cloud TTS (REST API)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'fs';
import ffmpegStatic from 'ffmpeg-static';

const execPromise = promisify(exec);

const VOICE_MAPPING: Record<string, { code: string; name: string; gender: string }> = {
  'sofia': { code: 'es-ES', name: 'es-ES-Neural2-A', gender: 'FEMALE' },
  'mateo': { code: 'es-ES', name: 'es-ES-Neural2-B', gender: 'MALE' },
  'ximena': { code: 'es-US', name: 'es-US-Neural2-A', gender: 'FEMALE' },
  'diego': { code: 'es-US', name: 'es-US-Neural2-B', gender: 'MALE' },
};

export async function generateSpeechMP3(text: string, voiceId: string, apiKey: string, outputPath: string) {
  const voice = VOICE_MAPPING[voiceId.toLowerCase()] || VOICE_MAPPING['mateo'];

  let response;
  try {
    response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: voice.code, name: voice.name, ssmlGender: voice.gender },
        audioConfig: { audioEncoding: 'MP3' }
      }),
      signal: AbortSignal.timeout(10000)
    });
  } catch (err: any) {
    throw new Error(`TTS Fetch Failed: ${err.message}`);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Google TTS Error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const audioBuffer = Buffer.from(data.audioContent, 'base64');
  
  const fs = await import('fs/promises');
  await fs.writeFile(outputPath, audioBuffer);
  
  return outputPath;
}

export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    let resolvedFfmpeg = ffmpegStatic;
    if (!resolvedFfmpeg || !existsSync(resolvedFfmpeg)) {
      const ext = process.platform === 'win32' ? '.exe' : '';
      resolvedFfmpeg = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', `ffmpeg${ext}`);
    }

    if (!resolvedFfmpeg || !existsSync(resolvedFfmpeg)) {
      throw new Error("FFmpeg no encontrado");
    }

    // ffmpeg escupe la info en stderr incluso si solo lee el archivo (-i)
    try {
      await execPromise(`"${resolvedFfmpeg}" -i "${filePath}"`);
    } catch (err: any) {
      // Es esperado que de error porque no le dimos archivo de salida, pero su stderr tiene lo que buscamos
      const output = err.stderr || err.message;
      const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d+)/);
      if (durationMatch) {
         const hours = parseFloat(durationMatch[1]);
         const minutes = parseFloat(durationMatch[2]);
         const seconds = parseFloat(durationMatch[3]);
         return (hours * 3600) + (minutes * 60) + seconds;
      }
    }
    throw new Error("No regex match");
  } catch (err) {
    console.error('[TTS:DurationError] No se pudo leer el archivo con FFmpeg, recurriendo a matemáticas...', (err as Error).message);
    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat(filePath);
      return Math.max(1, stats.size / 4000); // 32kbps fallback
    } catch {
      return 5;
    }
  }
}
