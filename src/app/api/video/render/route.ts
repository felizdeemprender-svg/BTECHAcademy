import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { writeFile, mkdir, readFile, unlink, readdir, stat } from 'fs/promises';
import { spawn } from 'child_process';
import { uploadToDrive, getOrCreateFolder } from '@/lib/drive-utils';
import ffmpegPathFromStatic from 'ffmpeg-static';

interface Scene {
  imageUrl: string;
  text: string;
  voiceover?: string;
  segment_label?: string;
  duration?: number;
}

interface RenderRequest {
  jobId: string;
  scenes: Scene[];
  audioUrl?: string;
  audioDuration?: number;
  resolution?: string;
  fps?: number;
  brandColor?: string;
  adnId?: string;
  enable_tts?: boolean;
  voice_id?: string;
  voiceover?: string;
  audioEffect?: 'none' | 'studio' | 'auto';
  googleToken?: string;
  isCarousel?: boolean;
  platform?: string;
  marketingName?: string;
}

async function runGarbageCollector(basePath: string) {
  try {
    const folders = await readdir(basePath);
    const now = Date.now();
    const TTL = 24 * 60 * 60 * 1000;
    for (const folder of folders) {
      const folderPath = path.join(basePath, folder);
      const folderStat = await stat(folderPath);
      if (now - folderStat.mtimeMs > TTL) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }
    }
  } catch (err) {}
}

async function runFfmpeg(args: string[], label?: string): Promise<void> {
  const exeName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  
  // 1. PRIORIDAD MÁXIMA: Usar el binario personalizado con soporte drawtext/libfreetype
  //    Este binario es descargado en postinstall y copiado al standalone en postbuild.
  const customBinaryPaths = [
    path.join(process.cwd(), 'node_modules', 'custom-ffmpeg-build', exeName),
    path.join(process.cwd(), '..', '..', 'node_modules', 'custom-ffmpeg-build', exeName),
    path.join('/workspace', '.next', 'standalone', 'node_modules', 'custom-ffmpeg-build', exeName),
  ];

  let ffmpegPath: string | null = null;

  for (const p of customBinaryPaths) {
    if (fs.existsSync(p)) {
      ffmpegPath = p;
      console.log(`[FFmpeg:Path] ✅ Usando binario PERSONALIZADO (con drawtext): ${p}`);
      break;
    }
  }
  
  // 2. Fallback: ffmpeg-static (sin drawtext — último recurso)
  if (!ffmpegPath) {
    const fallbackPaths = [
      ffmpegPathFromStatic,
      path.join(process.cwd(), 'node_modules', 'ffmpeg-static', exeName),
      path.join(process.cwd(), '..', '..', 'node_modules', 'ffmpeg-static', exeName),
      path.join('/workspace', 'node_modules', 'ffmpeg-static', exeName),
    ];
    for (const p of fallbackPaths) {
      if (p && fs.existsSync(p)) {
        ffmpegPath = p;
        console.warn(`[FFmpeg:Path] ⚠️ Usando ffmpeg-static (SIN drawtext): ${p}`);
        break;
      }
    }
  }

  // 3. Último recurso: comando global
  if (!ffmpegPath) {
    ffmpegPath = exeName;
    console.warn(`[FFmpeg:Path] ⚠️ Usando comando global: ${exeName}`);
  }

  // LOG DE DIAGNÓSTICO (Solo visible en servidor)
  console.log(`[FFmpeg:Path] Usando binario en: ${ffmpegPath} (Existe: ${fs.existsSync(ffmpegPath)})`);

  // 4. Asegurar permisos de ejecución en Linux
  if (process.platform !== 'win32' && ffmpegPath !== exeName && fs.existsSync(ffmpegPath)) {
    try {
      fs.chmodSync(ffmpegPath, 0o755);
    } catch (e) {
      console.warn(`[FFmpeg:Permissions] No se pudo aplicar chmod a ${ffmpegPath}`);
    }
  }

  return new Promise((resolve, reject) => {
    // Búsqueda robusta de la carpeta de fuentes
    let fontsDir = path.join(process.cwd(), 'public', 'fonts');
    if (!fs.existsSync(fontsDir)) {
      fontsDir = path.join(process.cwd(), '..', '..', 'public', 'fonts');
    }
    const fontsConfPath = path.join(fontsDir, 'fonts.conf');

    const env = {
      ...process.env,
      FONTCONFIG_FILE: fontsConfPath,
      FONTCONFIG_PATH: fontsDir,
    };
    
    if (label) console.log(`[FFmpeg:${label}] Ejecutando con ${args.length} argumentos...`);
    
    const proc = spawn(ffmpegPath!, args, { env });
    let stderr = '';
    proc.stderr.on('data', (data: Buffer) => stderr += data.toString());
    proc.on('close', (code: number) => {
      if (code === 0) resolve();
      else {
        // Mostrar más líneas de error para diagnóstico y los argumentos
        const errLines = stderr.split('\n').filter(l => l.trim()).slice(-15).join(' | ');
        const argsStr = args.join(' ');
        const finalErr = `FFmpeg error (${code}) at ${ffmpegPath}: ${errLines} --- COMMAND: ${argsStr}`;
        reject(new Error(finalErr));
      }
    });
    proc.on('error', (err: Error) => reject(new Error(`Failed to start FFmpeg: ${err.message}`)));
  });
}

// LÓGICA DE TEXTO NIVEL DIOS (Capas, Resplandores y Áreas Seguras)
function getDrawtextFilter(adnConfig: any, scene: Scene, brandColor: string, width: number, height: number, textFilePath: string) {
  const segment = scene.segment_label || 'default';
  const rules = adnConfig.scenes_rules;
  const activeRule = { ...rules.default.text_styling, ...(rules[segment]?.text_styling || {}) };
  
  const resolveColor = (col: string) => {
    if (!col) return 'white';
    return col.replace('{brandColor}', brandColor).replace('@', '\\@'); // Escapar @ para FFmpeg
  };

  const fontColor = resolveColor(activeRule.fontcolor || 'white');
  const fontFile = activeRule.fontFamily || 'Inter-Black.ttf';
  
  // Búsqueda robusta de la fuente
  let fontsDir = path.join(process.cwd(), 'public', 'fonts');
  if (!fs.existsSync(fontsDir)) {
    fontsDir = path.join(process.cwd(), '..', '..', 'public', 'fonts');
  }
  
  const fontAbsPath = path.join(fontsDir, fontFile);
  const fallbackPath = path.join(fontsDir, 'Inter-Black.ttf');
  const resolvedFontPath = fs.existsSync(fontAbsPath) ? fontAbsPath : fallbackPath;
  
  // FIX DUAL-PLATFORM:
  // - Windows: paths absolutos 'C:/...' crashean FFmpeg -> usar RELATIVOS.
  // - Linux/Standalone: paths relativos pueden no resolver -> usar ABSOLUTOS.
  let fontPath: string;
  let safeTextPath: string;
  if (process.platform === 'win32') {
    fontPath = path.relative(process.cwd(), resolvedFontPath).replace(/\\/g, '/');
    safeTextPath = path.relative(process.cwd(), textFilePath).replace(/\\/g, '/');
  } else {
    fontPath = resolvedFontPath.replace(/\\/g, '/');
    safeTextPath = textFilePath.replace(/\\/g, '/');
  }
  
  // Traducción de alias semánticos a expresiones matemáticas de FFmpeg
  const sanitizeCoord = (val: string, isX: boolean) => {
    if (!val) return isX ? '(w-text_w)/2' : '(h-text_h)/2';
    if (val === 'center') return isX ? '(w-text_w)/2' : '(h-text_h)/2';
    if (val === 'left' || val === 'top') return '0';
    if (val === 'right') return '(w-text_w)';
    if (val === 'bottom') return '(h-text_h)';
    return val;
  };

  let posX = sanitizeCoord(activeRule.x, true);
  let posY = sanitizeCoord(activeRule.y, false);
  
  if (adnConfig.global_fx.safe_area_protection) {
    posY = `if(lt(${posY}\\,h*0.15)\\,h*0.15\\,${posY})`;
    posY = `if(gt(${posY}\\,h*0.78)\\,h*0.78\\,${posY})`;
  }

  // Animaciones Cinéticas (Modifican posición)
  if (activeRule.animation === 'kinetic_pop') {
     posX = `(w-text_w)/2`;
     posY = `${posY}+(40*exp(-t*8)*sin(t*20))`;
  } else if (activeRule.animation === 'slide_in') {
     posX = `if(lte(t\\,0.4)\\, (t/0.4)*(w-text_w)/2\\, (w-text_w)/2)`;
  }

  // Usamos expansion=normal para tags dinámicos y text_align=center para bloques multilinea
  const baseParams = `fontfile='${fontPath}':textfile='${safeTextPath}':expansion=normal:text_align=C:fontsize=${activeRule.fontsize}`;

  // CONSTRUCCIÓN DE CADENA DE FILTROS (Múltiples capas para efecto Glow/Shadow/Stroke)
  let filter = '';
  
  // 1. Capa de Glow/Neon (Sombra borrosa de color)
  if (activeRule.effects?.neon_glow?.enabled) {
    const glowColor = resolveColor(activeRule.effects.neon_glow.color || 'white');
    const radius = activeRule.effects.neon_glow.radius || 10;
    filter += `drawtext=${baseParams}:fontcolor=${glowColor}:x=${posX}:y=${posY}:shadowcolor=${glowColor}:shadowx=0:shadowy=0:box=1:boxcolor=${glowColor}\\@0.2:boxborderw=${radius},`;
  }

  // 2. Capa de Sombra 3D (Múltiples offsets)
  if (activeRule.effects?.fake_3d_shadows) {
    filter += `drawtext=${baseParams}:fontcolor=black\\@0.5:x=${posX}+4:y=${posY}+4,`;
    filter += `drawtext=${baseParams}:fontcolor=black\\@0.3:x=${posX}+8:y=${posY}+8,`;
  }

  // 3. Capa Principal con Stroke
  filter += `drawtext=${baseParams}:fontcolor=${fontColor}:x=${posX}:y=${posY}`;
  
  if (activeRule.effects?.text_stroke) {
    const sCol = resolveColor(activeRule.effects.text_stroke.color || 'black');
    const sW = activeRule.effects.text_stroke.width || 2;
    filter += `:borderw=${sW}:bordercolor=${sCol}`;
  }

  return filter;
}

// FUNCIÓN DE POST-PRODUCCIÓN PROFESIONAL
function getPostProductionFilters(adnConfig: any, segmentLabel: string | undefined) {
  const gFx = adnConfig.global_fx || {};
  const sFx = adnConfig.scenes_rules[segmentLabel || 'default']?.visual_fx || {};
  const fx = { ...gFx, ...sFx };
  
  let filters: string[] = [];
  
  if (fx.sharpen) filters.push('unsharp=3:3:0.8:3:3:0.4');
  
  // LUT Support (Simulación con EQ si no hay archivo, pero preparado para .cube)
  if (fx.colorGrade_lut) {
     filters.push('eq=contrast=1.1:saturation=1.2'); // Simulación
  }

  if (fx.vignette_intensity > 0) {
    filters.push(`vignette=PI*${fx.vignette_intensity}`);
  }

  if (fx.grain_intensity > 0) {
    filters.push(`noise=alls=${fx.grain_intensity/5}:allf=t+u`);
  }

  if (fx.vhs_overdrive) {
    filters.push('noise=alls=20:allf=t+u,hue=s=0.5'); // Removed curves=preset=vintage to maximize compatibility
  }

  if (fx.background_dynamic_blur) {
    filters.push('boxblur=20:5');
  }

  return filters.join(',');
}

export async function POST(req: NextRequest) {
  const baseRenderPath = path.join(process.cwd(), 'tmp', 'render_jobs');
  
  try {
    const body: RenderRequest = await req.json();
    const { 
      jobId: rawJobId, scenes, audioUrl, resolution, adnId, brandColor, 
      enable_tts, voice_id, voiceover, audioEffect, googleToken, isCarousel, marketingName 
    } = body;

    const jobId = rawJobId || `job_${Date.now()}`;
    const tmpDir = path.join(baseRenderPath, jobId);
    await mkdir(tmpDir, { recursive: true });
    await runGarbageCollector(baseRenderPath);

    // 1. CARGA DINÁMICA DE ADN (JSON)
    let adnsDir = path.join(process.cwd(), 'public', 'adns');
    try {
      await stat(adnsDir);
    } catch {
      const standaloneFallback = path.join(process.cwd(), '..', '..', 'public', 'adns');
      try {
        await stat(standaloneFallback);
        adnsDir = standaloneFallback;
      } catch {}
    }

    const adnFiles = await readdir(adnsDir);
    const targetFile = adnFiles.find(f => f.startsWith(adnId || '01')) || '01_guru_hormozi.json';
    const adnConfig = JSON.parse(await readFile(path.join(adnsDir, targetFile), 'utf-8'));
    
    const adnColor = (brandColor && brandColor.startsWith('#')) ? brandColor : '#8B5CF6';
    const [width, height] = (resolution || '1080x1920').split('x').map(Number);

    // 2. GENERACIÓN DE VOCES (TTS)
    const ttsApiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_API_KEY;
    const voiceClips: string[] = [];
    let finalVoicePath: string | null = null;

    if (enable_tts && ttsApiKey) {
      const { generateSpeechMP3, getAudioDuration } = await import('@/lib/tts');
      const activeVoiceId = voice_id || adnConfig.global_fx.voiceId || 'mateo';

      if (voiceover) {
        finalVoicePath = path.join(tmpDir, `master_voice.mp3`);
        await generateSpeechMP3(voiceover, activeVoiceId, ttsApiKey, finalVoicePath);
        
        try {
          const masterDur = await getAudioDuration(finalVoicePath);
          const perSceneDur = masterDur / scenes.length;
          // Distribuir equitativamente y forzar un 'punch' de timing
          for (let i = 0; i < scenes.length; i++) {
             scenes[i].duration = perSceneDur;
          }
        } catch (e) {
          console.log("[Sync] Fallback para master voice.");
        }
      } else {
        for (let i = 0; i < scenes.length; i++) {
          const s = scenes[i];
          if (s.voiceover || s.text) {
            const filePath = path.join(tmpDir, `voice_${i}.mp3`);
            await generateSpeechMP3(s.voiceover || s.text, activeVoiceId, ttsApiKey, filePath);
            voiceClips.push(filePath);
            try {
              const audioDur = await getAudioDuration(filePath);
              scenes[i].duration = audioDur + 0.3; 
            } catch (err) { console.warn(`[Sync] Fallback duration for scene ${i}`); }
          }
        }
      }
    }

    // 3. RENDERIZADO DE PLACAS INDIVIDUALES
    const sceneClips: string[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneDuration = scene.duration || 5;
      const outputClip = path.join(tmpDir, `plate_${i}.mp4`);
      sceneClips.push(outputClip);
      
      const assembledImg = path.join(tmpDir, `img_${i}.jpg`);
      const pngImg = path.join(tmpDir, `img_${i}.png`);
      const textFile = path.join(tmpDir, `text_${i}.txt`);
      const safeUrl = scene.imageUrl || `https://placehold.co/${width}x${height}/1e293b/ffffff.jpg?text=Escena+${i+1}`;
      let imgData: Buffer;
      try {
        const urlToFetch = safeUrl.startsWith('/') ? `http://127.0.0.1:9002${safeUrl}` : safeUrl;
        const res = await fetch(urlToFetch, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        imgData = Buffer.from(await res.arrayBuffer());
      } catch (err: any) {
        console.warn(`[Render] Failed to fetch image ${safeUrl}, using fallback. Error: ${err.message}`);
        imgData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
      }
      await writeFile(assembledImg, imgData);
      
      // LÓGICA DE PROCESAMIENTO DE TEXTO (Wrap y Animación)
      const segment = scene.segment_label || 'default';
      const activeRule = { ...adnConfig.scenes_rules.default.text_styling, ...(adnConfig.scenes_rules[segment]?.text_styling || {}) };
      
      let rawText = (scene.text || '');
      if (activeRule.uppercase) rawText = rawText.toUpperCase();
      
      // LÓGICA RESPONSIVA MEJORADA: Escalar texto al ancho y prever auto-achique
      let responsiveFontsize = Math.floor(activeRule.fontsize * (width / 1080));
      const charWidthFactor = activeRule.uppercase ? 0.65 : 0.52;
      
      const words = rawText.split(' ');
      const longestWordLen = Math.max(1, ...words.map(w => w.length));
      
      // Auto-escalado hacia abajo si la palabra más larga rompería la pantalla
      const maxAllowedFont = (width * 0.9) / (longestWordLen * charWidthFactor);
      if (responsiveFontsize > maxAllowedFont) {
         responsiveFontsize = Math.floor(maxAllowedFont);
      }
      
      activeRule.fontsize = responsiveFontsize; // Para que getDrawtextFilter use el tamaño redimensionado

      // Calcular maxChars dinámicamente sin mínimos fijos que causan desbordamiento
      let maxChars = Math.floor((width * 0.9) / (responsiveFontsize * charWidthFactor));
      
      let lines = [];
      let currentLine = '';
      for (const w of words) {
        if ((currentLine + w).trim().length > maxChars && currentLine.length > 0) {
          lines.push(currentLine.trim());
          currentLine = w + ' ';
        } else {
          currentLine += w + ' ';
        }
      }
      if (currentLine) lines.push(currentLine.trim());
      const displayText = lines.join('\n');

      // Escribimos el texto preparado en el archivo.
      // NOTA: El efecto typewriter no está soportado nativamente por textfile+expansion 
      // en formato %{eif} ya que genera errores o imprime caracteres no válidos.
      // En el futuro requerirá subtítulos .ass. Por ahora, forzamos texto completo.
      let fileContent = displayText;
      await writeFile(textFile, fileContent, 'utf8');

      // PASO CRÍTICO: Convertir JPG a PNG para bypass de MJPEG/yuvj420p que crashea en Windows
      await runFfmpeg(['-i', assembledImg.replace(/\\/g, '/'), '-y', pngImg.replace(/\\/g, '/')], `conv_png_${i}`);

      const drawtext = getDrawtextFilter(adnConfig, scene, adnColor, width, height, textFile);
      const postFX = getPostProductionFilters(adnConfig, scene.segment_label);
      
      // Movimiento de Cámara: Jerarquía ADN (Segmento -> Default -> Global)
      const sceneRule = adnConfig.scenes_rules[scene.segment_label || ''] || {};
      const defaultRule = adnConfig.scenes_rules.default || {};
      const cameraName = (sceneRule.visual_fx?.camera_movement || defaultRule.visual_fx?.camera_movement || adnConfig.global_fx?.camera_movement || 'none').toLowerCase();
      
      let scaleFilter = `scale=${width*2}:${height*2}:force_original_aspect_ratio=increase,crop=${width*2}:${height*2},scale=${width}:${height},format=yuv420p`;
      
      // Mapeo de movimientos usando 'on' (output frame number) para estabilidad total con -loop 1
      if (cameraName === 'zoom_in') {
        scaleFilter += `,zoompan=z='1+(0.0007*on)':d=1:fps=30:x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':s=${width}x${height}`;
      } else if (cameraName === 'rapid_zoom_in') {
        scaleFilter += `,zoompan=z='1+(0.002*on)':d=1:fps=30:x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':s=${width}x${height}`;
      } else if (cameraName === 'zoom_out') {
        scaleFilter += `,zoompan=z='max(1.0, 1.1-(0.0007*on))':d=1:fps=30:x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':s=${width}x${height}`;
      } else if (cameraName === 'pan_right') {
        scaleFilter += `,zoompan=z=1.15:x='min(iw-iw/zoom, (on*0.8))':y='ih/2-(iw/zoom)/2':d=1:fps=30:s=${width}x${height}`;
      }

      // Dip to Black (Fade in / out)
      const fadeDuration = adnConfig.global_fx?.fade_duration !== undefined ? Number(adnConfig.global_fx.fade_duration) : 0.5;

      const finalFilters = [
        scaleFilter,
        'format=yuv420p', 
        drawtext
      ];

      if (fadeDuration > 0) {
        const fadeOutStart = Math.max(0, sceneDuration - fadeDuration);
        finalFilters.push(`fade=t=in:st=0:d=${fadeDuration}`);
        finalFilters.push(`fade=t=out:st=${fadeOutStart}:d=${fadeDuration}`);
      }
      if (postFX) finalFilters.push(postFX);

      console.log(`[Render:Plate${i}] text='${(scene.text||'').substring(0,40)}' segment='${scene.segment_label}' cam='${cameraName}'`);
      
      const inputArgs = ['-loop', '1', '-framerate', '30', '-i', pngImg.replace(/\\/g, '/')];

      await runFfmpeg([
        ...inputArgs,
        '-t', String(sceneDuration.toFixed(2)),
        '-vf', finalFilters.join(','),
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-an', '-y', outputClip.replace(/\\/g, '/')
      ], `plate_${i}`);
    }

    let audioPath = null;
    if (audioUrl) {
      try {
        const urlToFetch = audioUrl.startsWith('/') ? `http://127.0.0.1:9002${audioUrl}` : audioUrl;
        const res = await fetch(urlToFetch, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const aBuf = await res.arrayBuffer();
        audioPath = path.join(tmpDir, 'bg.mp3');
        await writeFile(audioPath, Buffer.from(aBuf));
      } catch (err: any) {
        console.warn(`[Render] Failed to fetch audioUrl: ${audioUrl}. Error: ${err.message}`);
        audioPath = null;
      }
    }

    const mode = audioEffect || adnConfig.global_fx.audioMastering_base || 'auto';
    const musicMaster = adnConfig.global_fx.audiofx?.music_mastering || { ducking_ratio: 10 };
    const safeBaseName = (marketingName || 'EvoAsset').replace(/[^a-zA-Z0-9]/g, '_');

    if (isCarousel) {
      // 4. MODO CARROUSEL: Videos Independientes por Placa
      const driveLinks: string[] = [];
      const driveIds: string[] = [];
      const downloadUrls: string[] = [];
      
      let campaignFolderId = '';
      if (googleToken) {
        const rootFolderId = await getOrCreateFolder(googleToken, 'Aplicacion EVO');
        campaignFolderId = await getOrCreateFolder(googleToken, `Pack_${safeBaseName}`, rootFolderId);
      }

      for (let i = 0; i < sceneClips.length; i++) {
        const clipPath = sceneClips[i];
        const vClip = voiceClips[i]; // Podría no existir
        const mixedPath = path.join(tmpDir, `mixed_slide_${i}.mp4`);
        const ffmpegArgs = ['-i', clipPath.replace(/\\/g, '/')];
        let hasAudio = false;

        if (audioPath && vClip) {
          ffmpegArgs.push('-stream_loop', '-1', '-i', audioPath.replace(/\\/g, '/'), '-i', vClip.replace(/\\/g, '/'), '-filter_complex', 
          `[1:a]volume=0.45[music]; [2:a]volume=2.2,highpass=f=75,asplit=2[v_trigger][v_final]; [music][v_trigger]sidechaincompress=threshold=0.1:ratio=${musicMaster.ducking_ratio}:attack=20:release=350[bg_ducked]; [bg_ducked][v_final]amix=inputs=2:duration=longest[aout]`,
          '-map', '0:v:0', '-map', '[aout]');
          hasAudio = true;
        } else if (vClip) {
          ffmpegArgs.push('-i', vClip.replace(/\\/g, '/'), '-filter_complex', '[1:a]volume=2.2,highpass=f=75[aout]', '-map', '0:v:0', '-map', '[aout]');
          hasAudio = true;
        } else if (audioPath) {
          ffmpegArgs.push('-stream_loop', '-1', '-i', audioPath.replace(/\\/g, '/'), '-filter_complex', '[1:a]volume=0.45[aout]', '-map', '0:v:0', '-map', '[aout]');
          hasAudio = true;
        }

        if (!hasAudio) {
          ffmpegArgs.push('-c:v', 'copy');
        } else {
          ffmpegArgs.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-t', String((scenes[i].duration || 5).toFixed(2)));
        }
        await runFfmpeg([...ffmpegArgs, '-y', mixedPath.replace(/\\/g, '/')]);

        const fastPath = path.join(tmpDir, `fs_slide_${i}.mp4`);
        await runFfmpeg(['-i', mixedPath.replace(/\\/g, '/'), '-c', 'copy', '-movflags', '+faststart', '-y', fastPath.replace(/\\/g, '/')]);

        if (googleToken) {
          const mainFile = await uploadToDrive(fastPath, googleToken, `${safeBaseName}_slide_${i+1}_${Date.now()}.mp4`, 'video/mp4', campaignFolderId);
          driveLinks.push(mainFile.webViewLink);
          driveIds.push(mainFile.id);
          downloadUrls.push(mainFile.webContentLink);
        }
      }
      return NextResponse.json({ success: true, webViewLink: driveLinks.join(','), driveId: driveIds.join(','), downloadUrl: downloadUrls.join(',') });

    } else {
      // 4. MODO VIDEO ÚNICO: Ensamblaje Concatenado
      const concatPath = path.join(tmpDir, 'concat.txt');
      await writeFile(concatPath, sceneClips.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
      const assembledPath = path.join(tmpDir, 'assembled.mp4');
      await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', concatPath.replace(/\\/g, '/'), '-c', 'copy', '-y', assembledPath.replace(/\\/g, '/')]);

      if (!finalVoicePath && voiceClips.length > 0) {
        finalVoicePath = path.join(tmpDir, 'full_voice.mp3');
        const voiceConcatFile = path.join(tmpDir, 'v_concat.txt');
        await writeFile(voiceConcatFile, voiceClips.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
        await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', voiceConcatFile.replace(/\\/g, '/'), '-c', 'copy', '-y', finalVoicePath.replace(/\\/g, '/')]);
      }

      const totalDuration = scenes.reduce((acc: number, s: Scene) => acc + (s.duration || 5), 0);
      const mixedPath = path.join(tmpDir, 'mixed.mp4');

      const ffmpegArgs = ['-i', assembledPath.replace(/\\/g, '/')];

      let hasAudio = false;
      if (audioPath && finalVoicePath) {
        // DUCKING SIDECHAIN COMPEX
        ffmpegArgs.push('-stream_loop', '-1', '-i', audioPath.replace(/\\/g, '/'), '-i', finalVoicePath.replace(/\\/g, '/'), '-filter_complex', 
        `[1:a]volume=0.45[music]; [2:a]volume=2.2,highpass=f=75,asplit=2[v_trigger][v_final]; [music][v_trigger]sidechaincompress=threshold=0.1:ratio=${musicMaster.ducking_ratio}:attack=20:release=350[bg_ducked]; [bg_ducked][v_final]amix=inputs=2:duration=longest[aout]`,
        '-map', '0:v:0', '-map', '[aout]');
        hasAudio = true;
      } else if (finalVoicePath) {
        ffmpegArgs.push('-i', finalVoicePath.replace(/\\/g, '/'), '-filter_complex', '[1:a]volume=2.2,highpass=f=75[aout]', '-map', '0:v:0', '-map', '[aout]');
        hasAudio = true;
      } else if (audioPath) {
        ffmpegArgs.push('-stream_loop', '-1', '-i', audioPath.replace(/\\/g, '/'), '-filter_complex', '[1:a]volume=0.45[aout]', '-map', '0:v:0', '-map', '[aout]');
        hasAudio = true;
      }

      if (!hasAudio) {
        // Fallback for single video with NO AUDIO at all to avoid FFmpeg crashing on expected audio streams
        ffmpegArgs.push('-c:v', 'copy');
      } else {
        ffmpegArgs.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-t', String(totalDuration.toFixed(2)));
      }

      await runFfmpeg([...ffmpegArgs, '-y', mixedPath.replace(/\\/g, '/')]);

      // 5. SUBIDA A DRIVE Y RESULTADO
      const finalVideoName = `${safeBaseName}_${Date.now()}.mp4`;
      const finalVideoPath = path.join(tmpDir, finalVideoName);
      await runFfmpeg(['-i', mixedPath.replace(/\\/g, '/'), '-c', 'copy', '-movflags', '+faststart', '-y', finalVideoPath.replace(/\\/g, '/')]);

      let driveLink = '', driveId = '', downloadUrl = '';
      if (googleToken) {
        const rootFolderId = await getOrCreateFolder(googleToken, 'Aplicacion EVO');
        const campaignFolderId = await getOrCreateFolder(googleToken, `Pack_${safeBaseName}`, rootFolderId);
        const mainFile = await uploadToDrive(finalVideoPath, googleToken, finalVideoName, 'video/mp4', campaignFolderId);
        driveLink = mainFile.webViewLink; driveId = mainFile.id; downloadUrl = mainFile.webContentLink;
      }

      return NextResponse.json({ success: true, webViewLink: driveLink, driveId, downloadUrl });
    }
  } catch (err: any) {
    console.error("📛 critical error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
