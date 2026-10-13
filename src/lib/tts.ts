/**
 * @fileOverview Sistema de Voz Híbrido (Google Cloud + Microsoft Edge) con Caché Inteligente
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { existsSync, mkdirSync } from 'fs';
import ffmpegStatic from 'ffmpeg-static';
import crypto from 'crypto';
import { Communicate } from 'edge-tts-universal';

const execPromise = promisify(exec);
const fsPromises = fs.promises;

// 📁 Configuración de Caché
const CACHE_DIR = path.join(process.cwd(), 'public', 'tts_cache');
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

// 🎙️ Mapeo de Voces para Microsoft Edge (Gratis y Naturales)
const EDGE_VOICE_MAPPING: Record<string, string> = {
  'sofia': 'es-ES-ElviraNeural',
  'mateo': 'es-ES-AlvaroNeural',
  'diego': 'es-MX-JorgeNeural',
  'dalia': 'es-MX-DaliaNeural',
  'jorge': 'es-MX-JorgeNeural',
  'alvaro': 'es-ES-AlvaroNeural',
  'elvira': 'es-ES-ElviraNeural',
  'ximena': 'es-ES-XimenaNeural',
  'paloma': 'es-US-PalomaNeural',
  'alonso': 'es-US-AlonsoNeural',
  'tomas': 'es-AR-TomasNeural',
  'elena': 'es-AR-ElenaNeural',
  'gonzalo': 'es-CO-GonzaloNeural',
  'salome': 'es-CO-SalomeNeural'
};

// 🎙️ Mapeo de Voces para Google (Legacy & High-Reliability Fallback)
const GOOGLE_VOICE_MAPPING: Record<string, { code: string; name: string; gender: string }> = {
  'sofia': { code: 'es-ES', name: 'es-ES-Neural2-A', gender: 'FEMALE' },
  'mateo': { code: 'es-ES', name: 'es-ES-Neural2-B', gender: 'MALE' },
  'ximena': { code: 'es-US', name: 'es-US-Neural2-A', gender: 'FEMALE' },
  'diego': { code: 'es-US', name: 'es-US-Neural2-B', gender: 'MALE' },
  'tomas': { code: 'es-US', name: 'es-US-Neural2-B', gender: 'MALE' },
  'elena': { code: 'es-US', name: 'es-US-Neural2-A', gender: 'FEMALE' },
  'jorge': { code: 'es-US', name: 'es-US-Neural2-C', gender: 'MALE' },
  'dalia': { code: 'es-US', name: 'es-US-Neural2-A', gender: 'FEMALE' },
  'gonzalo': { code: 'es-ES', name: 'es-ES-Neural2-F', gender: 'MALE' },
  'salome': { code: 'es-ES', name: 'es-ES-Neural2-E', gender: 'FEMALE' },
  'alvaro': { code: 'es-ES', name: 'es-ES-Neural2-B', gender: 'MALE' },
  'elvira': { code: 'es-ES', name: 'es-ES-Neural2-A', gender: 'FEMALE' },
  'alonso': { code: 'es-US', name: 'es-US-Neural2-B', gender: 'MALE' },
  'paloma': { code: 'es-US', name: 'es-US-Neural2-A', gender: 'FEMALE' },
  'guy': { code: 'en-US', name: 'en-US-Neural2-D', gender: 'MALE' },
  'jenny': { code: 'en-US', name: 'en-US-Neural2-F', gender: 'FEMALE' },
  'antonio': { code: 'pt-BR', name: 'pt-BR-Neural2-B', gender: 'MALE' },
  'francisca': { code: 'pt-BR', name: 'pt-BR-Neural2-A', gender: 'FEMALE' },
};

function resolveVoiceKey(voiceId: string): string {
  const lower = voiceId.toLowerCase();
  for (const key of Object.keys(GOOGLE_VOICE_MAPPING)) {
    if (lower.includes(key)) return key;
  }
  return 'mateo';
}

/**
 * Genera un hash único basado en el texto y la voz para el sistema de caché
 */
function getCacheHash(text: string, voiceId: string): string {
  return crypto.createHash('md5').update(`${text.trim()}_${voiceId.toLowerCase()}`).digest('hex');
}

/**
 * [V2] Generador de Voz Pro (Google Cloud Neural + Microsoft Edge + Caché)
 * @returns Path del archivo generado o recuperado de caché
 */
export async function generateSpeechV2(text: string, voiceId: string, isSmokeTest: boolean = false): Promise<string> {
  const hash = getCacheHash(text, voiceId);
  const cachePath = path.join(CACHE_DIR, `${hash}.mp3`);

  // 1. Verificar Caché en Disco
  if (existsSync(cachePath)) {
    console.log(`🎯 [TTS:Cache] Hit! Reusing audio for: "${text.substring(0, 20)}..."`);
    return cachePath;
  }

  // 2. Google Cloud TTS (Rápido, alta disponibilidad en servidor)
  const googleApiKey = process.env.GOOGLE_TTS_API_KEY;
  if (googleApiKey) {
    try {
      return await generateSpeechMP3(text, voiceId, googleApiKey, cachePath);
    } catch (gErr: any) {
      console.warn('⚠️ [TTS:Google Warning]', gErr?.message);
    }
  }

  // 3. Fallback Microsoft Edge (con timeout seguro para evitar bloqueos)
  console.log(`🌐 [TTS:Edge] Generating new audio for: "${text.substring(0, 20)}..."`);
  
  try {
    const edgeVoice = voiceId.includes('Neural') || voiceId.includes('-')
      ? voiceId
      : (EDGE_VOICE_MAPPING[voiceId.toLowerCase()] || EDGE_VOICE_MAPPING['mateo']);
    const communicate = new Communicate(text, { voice: edgeVoice });
    const chunks: Buffer[] = [];
    
    // Timeout de 6 segundos para no congelar la petición
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Edge TTS timeout')), 6000)
    );

    const streamPromise = (async () => {
      for await (const chunk of communicate.stream()) {
        if (chunk.type === 'audio' && chunk.data) {
          chunks.push(chunk.data);
        }
      }
      return Buffer.concat(chunks);
    })();

    const finalBuffer = await Promise.race([streamPromise, timeoutPromise]);
    await fsPromises.writeFile(cachePath, finalBuffer);
    
    return cachePath;
  } catch (err) {
    console.error('❌ [TTS:Edge Error]', err);
    throw err;
  }
}

/**
 * [Legacy] Generador de Voz de Google (Mantenido por compatibilidad)
 */
export async function generateSpeechMP3(text: string, voiceId: string, apiKey: string, outputPath: string) {
  console.log(`📜 [TTS:Google] Using Google Cloud for: "${text.substring(0, 20)}..."`);
  const voiceKey = resolveVoiceKey(voiceId);
  const voice = GOOGLE_VOICE_MAPPING[voiceKey] || GOOGLE_VOICE_MAPPING['mateo'];

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
  await fsPromises.writeFile(outputPath, audioBuffer);
  
  return outputPath;
}

/**
 * Obtiene la duración exacta de un archivo de audio
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    let resolvedFfmpeg = ffmpegStatic;
    if (!resolvedFfmpeg || !existsSync(resolvedFfmpeg)) {
      const ext = process.platform === 'win32' ? '.exe' : '';
      resolvedFfmpeg = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', `ffmpeg${ext}`);
    }

    try {
      const { stderr } = await execPromise(`"${resolvedFfmpeg}" -i "${filePath}"`);
      return parseDuration(stderr);
    } catch (err: any) {
      const output = err.stderr || err.message;
      return parseDuration(output);
    }
  } catch (err) {
    console.error('[TTS:DurationError] Error reading duration, using fallback...', (err as Error).message);
    const stats = await fsPromises.stat(filePath);
    return Math.max(1, stats.size / 6000); // Estimación 48kbps
  }
}

function parseDuration(output: string): number {
  const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d+)/);
  if (durationMatch) {
    const hours = parseFloat(durationMatch[1]);
    const minutes = parseFloat(durationMatch[2]);
    const seconds = parseFloat(durationMatch[3]);
    return (hours * 3600) + (minutes * 60) + seconds;
  }
  throw new Error("No duration match in FFmpeg output");
}
