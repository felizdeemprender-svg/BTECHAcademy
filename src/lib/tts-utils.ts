import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) return resolve(15);
    
    // RESOLUCIÓN ABSOLUTA BYPASS WEBPACK (Igual que en FFmpeg)
    const ffprobeExe = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
    const ffprobePath = path.join(process.cwd(), 'node_modules', 'ffprobe-static', 'bin', process.platform, process.arch, ffprobeExe);
    
    const proc = spawn(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ]);

    let output = '';
    proc.stdout.on('data', (data) => output += data.toString());
    proc.on('close', (code) => {
      if (code === 0) {
        const dur = parseFloat(output.trim());
        resolve(!isNaN(dur) ? dur : 15);
      } else {
        resolve(15); // Fallback amigable
      }
    });
    proc.on('error', () => resolve(15));
  });
}

export async function generateSpeechMP3(text: string, voiceId: string, apiKey: string, outputPath: string): Promise<void> {
  console.log(`[TTS-Utils] Generando voz real para: ${voiceId}`);
  
  const VOICE_MAP: Record<string, { name: string, languageCode: string }> = {
    mateo: { name: 'es-US-Neural2-B', languageCode: 'es-US' },
    diego: { name: 'es-ES-Neural2-B', languageCode: 'es-ES' },
    sofia: { name: 'es-US-Neural2-A', languageCode: 'es-US' },
    ximena: { name: 'es-MX-Neural2-A', languageCode: 'es-MX' }
  };

  const selectedVoice = VOICE_MAP[voiceId] || VOICE_MAP['mateo'];

  const requestBody = {
    input: { text },
    voice: { languageCode: selectedVoice.languageCode, name: selectedVoice.name },
    audioConfig: { audioEncoding: 'MP3' }
  };

  try {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[TTS-Utils] Error de API Google TTS:`, err);
      throw new Error(`Google TTS API Error: ${response.status}`);
    }

    const data = await response.json();
    const audioContent = data.audioContent;
    const buffer = Buffer.from(audioContent, 'base64');
    fs.writeFileSync(outputPath, buffer);
    console.log(`[TTS-Utils] Audio guardado exitosamente en: ${outputPath}`);
  } catch (error) {
    console.error(`[TTS-Utils] Falló la generación de TTS, creando silencio como fallback:`, error);
    // Fallback original para evitar romper el render
    const exeName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    const ffmpegPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', exeName);
    
    return new Promise((resolve) => {
      const proc = spawn(ffmpegPath, [
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '5', '-q:a', '9', '-acodec', 'libmp3lame', '-y', outputPath
      ]);
      proc.on('close', () => resolve());
      proc.on('error', () => resolve());
    });
  }
}

