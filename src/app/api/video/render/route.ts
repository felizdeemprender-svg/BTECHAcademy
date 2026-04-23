import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { writeFile, mkdir, readFile, stat, readdir } from 'fs/promises';
import { spawn } from 'child_process';
import os from 'os';
import { uploadToDrive, getOrCreateFolder } from '@/lib/drive-utils';
import ffmpegPathFromStatic from 'ffmpeg-static';

interface Scene {
  imageUrl: string;
  text: string;
  voiceover_text?: string;
  voiceover_voice?: string;
  segment_label?: string;
  duration?: number;
}

async function runFfmpeg(args: string[], label?: string): Promise<void> {
  const exeName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const customBinaryPaths = [
    path.join(process.cwd(), 'node_modules', 'custom-ffmpeg-build', exeName),
    path.join(process.cwd(), '..', '..', 'node_modules', 'custom-ffmpeg-build', exeName),
  ];

  let ffmpegPath: string | null = null;
  for (const p of customBinaryPaths) {
    if (fs.existsSync(p)) {
      ffmpegPath = p;
      break;
    }
  }
  
  if (!ffmpegPath) {
    ffmpegPath = ffmpegPathFromStatic || exeName;
  }

  if (process.platform !== 'win32' && ffmpegPath !== exeName && fs.existsSync(ffmpegPath)) {
    try { fs.chmodSync(ffmpegPath, 0o755); } catch (e) {}
  }

  return new Promise((resolve, reject) => {
    let fontsDir = path.join(process.cwd(), 'public', 'fonts');
    if (!fs.existsSync(fontsDir)) fontsDir = path.join(process.cwd(), '..', '..', 'public', 'fonts');
    const env = { ...process.env, FONTCONFIG_FILE: path.join(fontsDir, 'fonts.conf'), FONTCONFIG_PATH: fontsDir };
    
    const proc = spawn(ffmpegPath!, args, { env });
    let stderr = '';
    proc.stderr.on('data', (data) => stderr += data.toString());
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else {
        const errLines = stderr.split('\n').filter(l => l.trim()).slice(-20).join('\n');
        reject(new Error(`FFmpeg failed (code ${code}): ${errLines}`));
      }
    });
  });
}

function getDrawtextFilter(adnConfig: any, scene: Scene, brandColor: string, width: number, height: number, textFilePath: string) {
  const segment = scene.segment_label || 'default';
  const activeRule = { ...adnConfig.scenes_rules.default.text_styling, ...(adnConfig.scenes_rules[segment]?.text_styling || {}) };
  const fontColor = (activeRule.fontcolor || 'white').replace('{brandColor}', brandColor);
  const fontFile = activeRule.fontFamily || 'Inter-Black.ttf';
  
  let fontsDir = path.join(process.cwd(), 'public', 'fonts');
  if (!fs.existsSync(fontsDir)) fontsDir = path.join(process.cwd(), '..', '..', 'public', 'fonts');
  const fontPath = path.join(fontsDir, fontFile).replace(/\\/g, '/').replace(/:/g, '\\:');
  const safeTextPath = textFilePath.replace(/\\/g, '/').replace(/:/g, '\\:');
  
  const posY = activeRule.y === 'center' ? '(h-text_h)/2' : activeRule.y || '(h-text_h)/2';
  const posX = '(w-text_w)/2';

  return `drawtext=fontfile='${fontPath}':textfile='${safeTextPath}':expansion=normal:fontsize=${activeRule.fontsize}:fontcolor=${fontColor}:x=${posX}:y=${posY}:borderw=2:bordercolor=black`;
}

function getPostProductionFilters(adnConfig: any, segmentLabel: string | undefined) {
  const fx = adnConfig.global_fx || {};
  let filters = [];
  if (fx.sharpen) filters.push('unsharp=3:3:0.8:3:3:0.4');
  if (fx.vignette_intensity > 0) filters.push(`vignette=PI*${fx.vignette_intensity}`);
  return filters.join(',');
}

export async function POST(req: NextRequest) {
  try {
    const host = req.headers.get('host') || '';
    if (host.includes('web.app') || host.includes('firebaseapp.com')) {
      return NextResponse.json({ 
        success: false, 
        error: `⚠️ Por favor, usa: https://btechacademy-pro--btechacademy-8b329.us-central1.hosted.app/` 
      }, { status: 403 });
    }

    const { scenes, adnId, brandColor, resolution, audioUrl, marketingName, googleToken, isCarousel } = await req.json();
    const tmpDir = path.join(os.tmpdir(), `render_${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });

    // ADN Config
    let adnsDir = path.join(process.cwd(), 'public', 'adns');
    if (!fs.existsSync(adnsDir)) adnsDir = path.join(process.cwd(), '..', '..', 'public', 'adns');
    const adnFiles = await readdir(adnsDir);
    const targetFile = adnFiles.find(f => f.startsWith(adnId || '01')) || '01_guru_hormozi.json';
    const adnConfig = JSON.parse(await readFile(path.join(adnsDir, targetFile), 'utf-8'));
    const adnColor = brandColor || '#8B5CF6';
    const [width, height] = (resolution || '1080x1920').split('x').map(Number);

    // Parallel Downloads
    const audioPromise = audioUrl ? (async () => {
      const res = await fetch(audioUrl.startsWith('/') ? `https://${host}${audioUrl}` : audioUrl);
      const p = path.join(tmpDir, 'bg.mp3');
      await writeFile(p, Buffer.from(await res.arrayBuffer()));
      return p;
    })() : Promise.resolve(null);

    const sceneAssets = await Promise.all(scenes.map(async (scene: Scene, i: number) => {
      const imgPath = path.join(tmpDir, `img_${i}.jpg`);
      const textPath = path.join(tmpDir, `text_${i}.txt`);
      const res = await fetch(scene.imageUrl);
      await writeFile(imgPath, Buffer.from(await res.arrayBuffer()));

      const segment = scene.segment_label || 'default';
      const activeRule = { ...adnConfig.scenes_rules.default.text_styling, ...(adnConfig.scenes_rules[segment]?.text_styling || {}) };
      const words = (scene.text || '').split(' ');
      let lines = [], cur = '';
      const maxChars = Math.floor((width * 0.8) / (activeRule.fontsize * 0.6));
      for (const w of words) {
        if ((cur + w).length > maxChars) { lines.push(cur.trim()); cur = w + ' '; }
        else cur += w + ' ';
      }
      if (cur) lines.push(cur.trim());
      await writeFile(textPath, lines.join('\n'), 'utf8');
      return { imgPath, textPath, hasText: lines.length > 0 };
    }));

    const audioPath = await audioPromise;
    const sceneClips = [];
    const voiceClips = [];
    const ttsApiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_API_KEY;

    // Sequential Render
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const asset = sceneAssets[i];
      const duration = scene.duration || 5;
      const out = path.join(tmpDir, `p_${i}.mp4`);
      
      const drawtext = asset.hasText ? getDrawtextFilter(adnConfig, scene, adnColor, width, height, asset.textPath) : null;
      const postFX = getPostProductionFilters(adnConfig, scene.segment_label);
      const filters = [`scale=${width*2}:${height*2}:force_original_aspect_ratio=increase,crop=${width*2}:${height*2},scale=${width}:${height},format=yuv420p`];
      if (drawtext) filters.push(drawtext);
      if (postFX) filters.push(postFX);

      await runFfmpeg([
        '-loop', '1', '-t', String(duration), '-i', asset.imgPath.replace(/\\/g, '/'),
        '-vf', filters.join(','), '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '2', '-y', out.replace(/\\/g, '/')
      ]);
      sceneClips.push(out);

      if (scene.voiceover_text && ttsApiKey) {
        const { generateSpeechMP3 } = await import('@/lib/tts');
        const v = path.join(tmpDir, `v_${i}.mp3`);
        await generateSpeechMP3(scene.voiceover_text, scene.voiceover_voice || 'mateo', ttsApiKey, v);
        voiceClips.push(v);
      }
    }

    const safeName = (marketingName || 'Evo').replace(/[^a-z0-9]/gi, '_');
    if (isCarousel) {
      const links = [];
      const root = googleToken ? await getOrCreateFolder(googleToken, 'EVO') : '';
      for (let i = 0; i < sceneClips.length; i++) {
        const final = path.join(tmpDir, `f_${i}.mp4`);
        const args = ['-i', sceneClips[i].replace(/\\/g, '/')];
        if (voiceClips[i]) {
          args.push('-i', voiceClips[i].replace(/\\/g, '/'), '-filter_complex', '[1:a]volume=2[a]', '-map', '0:v', '-map', '[a]', '-c:a', 'aac');
        }
        await runFfmpeg([...args, '-y', final.replace(/\\/g, '/')]);
        if (googleToken && root) {
          const res = await uploadToDrive(final, googleToken, `${safeName}_${i+1}.mp4`, 'video/mp4', root);
          links.push(res.webViewLink);
        }
      }
      return NextResponse.json({ success: true, webViewLink: links.join(',') });
    } else {
      const concat = path.join(tmpDir, 'c.txt');
      await writeFile(concat, sceneClips.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
      const merged = path.join(tmpDir, 'merged.mp4');
      await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', concat.replace(/\\/g, '/'), '-c', 'copy', '-y', merged.replace(/\\/g, '/')]);
      
      let finalAudio = null;
      if (voiceClips.length > 0) {
        finalAudio = path.join(tmpDir, 'voice.mp3');
        const vcat = path.join(tmpDir, 'vc.txt');
        await writeFile(vcat, voiceClips.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
        await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', vcat.replace(/\\/g, '/'), '-c', 'copy', '-y', finalAudio.replace(/\\/g, '/')]);
      }

      const final = path.join(tmpDir, 'final.mp4');
      const args = ['-i', merged.replace(/\\/g, '/')];
      if (finalAudio) args.push('-i', finalAudio.replace(/\\/g, '/'), '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0');
      else args.push('-c:v', 'copy');
      await runFfmpeg([...args, '-y', final.replace(/\\/g, '/')]);

      let driveLink = '';
      if (googleToken) {
        const root = await getOrCreateFolder(googleToken, 'EVO');
        const res = await uploadToDrive(final, googleToken, `${safeName}.mp4`, 'video/mp4', root);
        driveLink = res.webViewLink;
      }
      return NextResponse.json({ success: true, webViewLink: driveLink });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
