import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegPath from 'ffmpeg-static';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export interface EngineSlice {
  imagePath: string;
  voicePath: string | null;
  duration: number;
  text: string;
  subtitle: string;
  watermark: string;
  segment_label: string;
}

export interface EngineRequest {
  adn: any;
  blueprint: any;
  jobId: string;
  format?: 'vertical' | 'portrait' | 'square' | 'horizontal';
  workDir: string;
  slices: EngineSlice[];
  backgroundMusicUrl?: string;
}

function getFormatDimensions(adn: any, format: string, isV2: boolean): { width: number, height: number } {
  const resMap: Record<string, [number, number]> = {
    vertical: [1080, 1920],
    portrait: [1080, 1350],
    square: [1080, 1080],
    horizontal: [1920, 1080]
  };

  if (!isV2 && adn.formats && adn.formats[format]) {
    const resolution = adn.formats[format].resolution || '9:16';
    if (resolution === '9:16') return { width: 1080, height: 1920 };
    if (resolution === '4:5') return { width: 1080, height: 1350 };
    if (resolution === '1:1') return { width: 1080, height: 1080 };
    if (resolution === '16:9') return { width: 1920, height: 1080 };
  }

  const [w, h] = resMap[format] || resMap.vertical;
  return { width: w, height: h };
}

export async function renderFullVideo(req: EngineRequest): Promise<string | { success: boolean, slices: any[], message: string }> {
  const { adn, blueprint, jobId, workDir, slices } = req;
  
  console.log(`\n🚀 [Engine V2] STARTING RENDER JOB: ${jobId}`);
  console.log(`📦 Strategy: ${blueprint.concatenate_slices !== false ? 'Master Video' : 'Individual Clips'}`);
  console.log(`🧬 ADN: ${adn?.name} (${adn?.id}) | Version: ${adn?.version} | Format: ${req.format}`);
  console.log(`📋 ADN Components: motion=${!!adn.motion_engine}, typo=${!!adn.typography_engine}, camera=${!!adn.camera}, trans=${!!adn.transitions}`);
  console.log(`🎵 BG Music: ${req.backgroundMusicUrl || blueprint.background_music_url}`);
  
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });

  const isV2 = adn.version === '2.0' || Number(adn.version) === 2.0 || !!adn.motion_engine || !!adn.global_fx;
  const format = req.format || 'vertical'; 
  const { width, height } = getFormatDimensions(adn, format, isV2);

  const sceneClips: string[] = [];
  const voiceClips: string[] = [];
  const sceneDurations: number[] = [];
  const sceneLabels: string[] = [];

  // 1. Process each slice
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    const platePath = path.join(workDir, `plate_${i}.mp4`);
    const duration = slice.duration;
    
    console.log(`\n🎬 [Slice ${i+1}/${slices.length}] Processing: "${slice.text.substring(0, 30)}..." | Dur: ${duration}s`);
    
    if (slice.voicePath) {
      voiceClips.push(slice.voicePath);
    } else {
      // Create a silent audio track if missing to avoid FFmpeg crashing on audio filters
      const silentPath = path.join(workDir, `silent_${i}.mp3`);
      await runFfmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', duration.toString(), '-q:a', '9', '-acodec', 'libmp3lame', '-y', silentPath]);
      voiceClips.push(silentPath);
    }

    const segment = slice.segment_label || 'default';
    const assPath = path.join(workDir, `subs_${i}.ass`);
    
    const assContent = generateAssFile(adn, segment, slice.text || '', slice.subtitle || '', slice.watermark || '', duration, width, height);
    fs.writeFileSync(assPath, assContent, 'utf-8');

    let zoomFilter = '';
    if (isV2) {
      const logic = adn.logic_segments?.[segment] || adn.logic_segments?.VALOR || {};
      const motionRule = adn.camera?.segment_rules?.[segment] || {};
      
      const cameraMode = motionRule.mode || logic.camera || 'cinematic_zoom';
      const intensity = motionRule.intensity || adn.global_fx?.zoom_intensity || 1.1;
      const speed = motionRule.speed || adn.global_fx?.zoom_speed || 1;
      const direction = motionRule.direction || adn.global_fx?.zoom_direction || 'center';
      
      if (cameraMode === 'static' || intensity <= 1 || speed <= 0) {
        zoomFilter = `zoompan=z=1:x=0:y=0:d=1:s=${width}x${height}`;
      } else {
        const zoomStep = `(${intensity}-1)*on/(${duration}*30*${1/speed})`;
        if (direction === 'top') {
          zoomFilter = `zoompan=z='1+${zoomStep}':x='0':y='0':d=1:s=${width}x${height}`;
        } else if (direction === 'bottom') {
          zoomFilter = `zoompan=z='1+${zoomStep}':x='iw-iw/zoom':y='ih-ih/zoom':d=1:s=${width}x${height}`;
        } else {
          zoomFilter = `zoompan=z='1+${zoomStep}':x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':d=1:s=${width}x${height}`;
        }
      }
    } else {
      const gFx = (adn.global_fx || {}) as any;
      const zoom = gFx.zoom_intensity || 1.1;
      const direction = gFx.zoom_direction || 'center';
      const zStep = `(${zoom}-1)*on/(${duration}*30)`;
      if (direction === 'top') zoomFilter = `zoompan=z='1+${zStep}':x='0':y='0':d=1:s=${width}x${height}`;
      else if (direction === 'bottom') zoomFilter = `zoompan=z='1+${zStep}':x='iw-iw/zoom':y='ih-ih/zoom':d=1:s=${width}x${height}`;
      else zoomFilter = `zoompan=z='1+${zStep}':x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':d=1:s=${width}x${height}`;
    }

    let postFX = '';
    if (isV2) {
      const globalFilters = adn.composition?.global_filters || [];
      const segmentLogic = (adn.logic_segments?.[segment] || {}) as any;
      const segmentFilters = segmentLogic.visual_filters || [];
      
      const gFx = (adn.global_fx || {}) as any;
      const autoFilters = [];
      
      const curvesPresetMap: Record<string, string> = {
        'neutral': 'linear_contrast',
        'none': 'none',
        'vintage': 'vintage',
        'color_negative': 'color_negative',
        'cross_process': 'cross_process',
        'increase_contrast': 'increase_contrast',
        'vibrant': 'strong_contrast',
        'skin_tones': 'medium_contrast',
        'cool': 'color_negative',
        'warm': 'vintage'
      };
      
      if (gFx.curves_preset && gFx.curves_preset !== 'none') {
        const ffmpegPreset = curvesPresetMap[gFx.curves_preset] || 'linear_contrast';
        autoFilters.push({ name: 'curves', params: `preset=${ffmpegPreset}` });
      }
      if (gFx.vignette_intensity > 0) autoFilters.push({ name: 'vignette', params: `PI*${gFx.vignette_intensity}` });
      if (gFx.grain_intensity > 0) autoFilters.push({ name: 'noise', params: `alls=${Math.floor(gFx.grain_intensity * 30)}:allf=t+u` });
      if (gFx.sharpen && gFx.sharpen_intensity > 0) autoFilters.push({ name: 'unsharp', params: `5:5:${gFx.sharpen_intensity}:5:5:0.0` });
      if (gFx.letterbox) autoFilters.push({ name: 'drawbox', params: `y=0:h=ih/10:color=black:t=fill,drawbox=y=ih-ih/10:h=ih/10:color=black:t=fill` });

      const allFilters = [...autoFilters, ...globalFilters, ...segmentFilters];
      postFX = allFilters.map((f: any) => {
        if (f.name === 'curves' && f.params && !f.params.includes('=')) {
          return `curves=preset=${f.params}`;
        }
        return `${f.name}=${f.params}`;
      }).join(',');
    } else {
      const gFx = (adn.global_fx || {}) as any;
      postFX = `unsharp=5:5:${(gFx.sharpen_intensity || 0)}:5:5:0.0,vignette=PI*${(gFx.vignette_intensity || 0)},noise=alls=${Math.floor((gFx.grain_intensity || 0) * 30)}:allf=t+u`;
    }

    // On Linux (Cloud Run) we must use the absolute path for the libass subtitles filter.
    const absImgPath = path.resolve(slice.imagePath).replace(/\\/g, '/');
    const fontsDir = path.join(process.cwd(), 'public', 'fonts').replace(/\\/g, '/');
    
    // Construct the subtitles filter string carefully for cross-platform compatibility.
    // On Linux (Cloud Run), we need absolute paths and the fontsdir parameter.
    let subtitlesFilter: string;
    const absAss = path.resolve(assPath).replace(/\\/g, '/');
    if (process.platform === 'win32') {
      const relAss = path.relative(process.cwd(), assPath).replace(/\\/g, '/');
      subtitlesFilter = `subtitles='${relAss}'`;
    } else {
      // libass filter syntax: subtitles=filename='path':fontsdir='path'
      // We escape the path if it contains special characters, but usually /tmp is safe.
      subtitlesFilter = `subtitles=filename='${absAss}':fontsdir='${fontsDir}'`;
    }

    const filters = [
      `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
      zoomFilter,
      postFX,
      subtitlesFilter,
      `format=yuv420p`
    ].filter(Boolean).join(',');

    const totalFrames = Math.max(Math.round(duration * 30), 1);
    const ffmpegArgs = [
      '-loop', '1',
      '-framerate', '30',
      '-i', absImgPath,
      '-vf', filters,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-threads', '0',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-frames:v', totalFrames.toString(),
      '-y',
      platePath
    ];

    // Borrar archivo previo si existe para asegurar que se genera uno nuevo
    if (fs.existsSync(platePath)) {
      try { fs.unlinkSync(platePath); } catch (e) {}
    }

    console.log(`🎬 [Engine V2] Rendering Slice ${i} (${totalFrames} frames) | FX: ${postFX.substring(0, 30)}...`);
    console.log(`[FFmpeg:Command] ${ffmpegArgs.join(' ')}`);
    await runFfmpeg(ffmpegArgs);

    if (blueprint.concatenate_slices === false) {
      const sliceWithAudioPath = path.join(workDir, `final_slice_${i}.mp4`);
      const isSmoke = req.jobId.includes('smoke');
      let bgMusic = req.backgroundMusicUrl || blueprint.background_music_url || (adn as any).audio_settings?.background_music_url;
      
      // Si es smoke test o no hay URL, usamos un silencio local para no depender de la red
      if (isSmoke || !bgMusic || bgMusic.startsWith('http')) {
        const silentPath = path.join(workDir, `silent_${i}.mp3`);
        if (!fs.existsSync(silentPath)) {
          await runFfmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', duration.toString(), '-q:a', '9', '-acodec', 'libmp3lame', '-y', silentPath]);
        }
        bgMusic = silentPath;
      }
      
      const aEngine = (adn.audio_engine || {}) as any;
      const sChain = aEngine.sidechain || { threshold: 0.1, ratio: 1.25, attack: 20, release: 350 };
      const musicVol = adn.audio_engine?.music_volume || (adn as any).audio_settings?.music_volume || 0.3;
      const voiceVol = adn.audio_engine?.voice_volume || (adn as any).audio_settings?.voice_volume || 1.0;

      await runFfmpeg([
        '-i', platePath,
        '-i', bgMusic,
        '-i', voiceClips[i],
        '-filter_complex',
        `[1:a]volume=${musicVol},afade=t=in:st=0:d=0.5[music]; [2:a]volume=${voiceVol},adelay=200|200,aresample=44100,asplit=2[v_trigger][v_final]; [music][v_trigger]sidechaincompress=threshold=${sChain.threshold}:ratio=${sChain.ratio}:attack=${sChain.attack}:release=${sChain.release}[bg_ducked]; [bg_ducked][v_final]amix=inputs=2:duration=first[aout]`,
        '-map', '0:v:0', '-map', '[aout]',
        '-c:v', 'copy', '-c:a', 'aac', '-shortest', '-y', sliceWithAudioPath
      ]);
      sceneClips.push(sliceWithAudioPath);
    } else {
      sceneClips.push(platePath);
    }

    sceneDurations.push(duration);
    sceneLabels.push(segment);
  }

  if (blueprint.concatenate_slices === false) {
    console.log(`✅ [Engine V2] Individual render complete. Returning ${sceneClips.length} clips.`);
    return {
      success: true,
      slices: sceneClips.map((p, idx) => ({
        segment: sceneLabels[idx],
        path: p
      })),
      message: "Individual slices rendered successfully with audio."
    };
  }

  // 2. Concatenate Video Clips with XFADE Transitions
  const videoOnlyPath = path.join(workDir, 'video_only.mp4');
  
  if (sceneClips.length === 1) {
    await runFfmpeg(['-i', sceneClips[0], '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', videoOnlyPath]);
  } else {
    console.log(`[Engine V2] Orchestrating ${sceneClips.length} clips with xfade transitions...`);
    // Prepare inputs with consistent timebase and PTS for xfade
    let filterComplex = '';
    for (let i = 0; i < sceneClips.length; i++) {
      filterComplex += `[${i}:v]settb=AVTB,setpts=PTS-STARTPTS[v_pts${i}]; `;
    }

    let lastLabel = 'v_pts0';
    let cumulativeOffset = 0;

    for (let i = 1; i < sceneClips.length; i++) {
      const prevSegment = sceneLabels[i-1];
      const prevRule = ((adn as any).motion_engine?.camera?.segment_rules?.[prevSegment] || {}) as any;
      const transTypeFull = prevRule.transition || (adn as any).motion_engine?.transitions?.default || 'xfade:fade';
      const transType = transTypeFull.replace('xfade:', '');
      const currentTransDuration = prevRule.transition_duration !== undefined ? prevRule.transition_duration : (adn.motion_engine?.transitions?.duration || 0.5);
      
      const prevDuration = sceneDurations[i-1];
      cumulativeOffset += prevDuration - currentTransDuration;
      
      const outLabel = `v_xfade${i}`;
      filterComplex += `[${lastLabel}][v_pts${i}]xfade=transition=${transType}:duration=${currentTransDuration}:offset=${cumulativeOffset.toFixed(3)}[${outLabel}]`;
      
      if (i < sceneClips.length - 1) {
        filterComplex += '; ';
      }
      lastLabel = outLabel;
    }

    const inputArgs = sceneClips.flatMap(p => ['-i', p]);
    await runFfmpeg([
      ...inputArgs,
      '-filter_complex', filterComplex,
      '-map', `[${lastLabel}]`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', videoOnlyPath
    ]);
  }

  // 3. Concatenate Audio Clips with ACROSSFADE
  const voiceOnlyPath = path.join(workDir, 'voice_only.mp3');
  
  if (voiceClips.length === 1) {
    fs.copyFileSync(voiceClips[0], voiceOnlyPath);
  } else {
    let audioFilter = '';
    let lastAudioLabel = '0:a';
    for (let i = 1; i < voiceClips.length; i++) {
      const prevSegment = sceneLabels[i-1];
      const prevRule = ((adn as any).motion_engine?.camera?.segment_rules?.[prevSegment] || {}) as any;
      const currentTransDuration = prevRule.transition_duration !== undefined ? prevRule.transition_duration : (adn.motion_engine?.transitions?.duration || 0.5);
      
      const outLabel = `a${i}`;
      audioFilter += `[${lastAudioLabel}][${i}:a]acrossfade=d=${currentTransDuration}:curve1=exp:curve2=exp[${outLabel}]`;
      
      if (i < voiceClips.length - 1) audioFilter += '; ';
      lastAudioLabel = outLabel;
    }

    const audioInputArgs = voiceClips.flatMap(p => ['-i', p]);
    await runFfmpeg([
      ...audioInputArgs,
      '-filter_complex', audioFilter,
      '-map', `[${lastAudioLabel}]`,
      '-c:a', 'libmp3lame', '-y', voiceOnlyPath
    ]);
  }

  // 4. Final Mix with Soundtrack and Ducking
  const finalPath = path.join(workDir, 'final_render.mp4');
  
  if (fs.existsSync(finalPath)) {
    try { fs.unlinkSync(finalPath); } catch (e) {}
  }

  const isSmokeFinal = req.jobId.includes('smoke');
  let bgMusic = req.backgroundMusicUrl || blueprint.background_music_url || (adn as any).audio_settings?.background_music_url;

  if (!bgMusic || bgMusic.startsWith('http')) {
      const silentPath = path.join(workDir, `silent_final.mp3`);
      const totalDur = slices.reduce((acc, s) => acc + s.duration, 0);
      if (!fs.existsSync(silentPath)) {
        await runFfmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', totalDur.toString(), '-q:a', '9', '-acodec', 'libmp3lame', '-y', silentPath]);
      }
      bgMusic = silentPath;
  }
  const aEngine = (adn.audio_engine || {}) as any;
  const sChain = aEngine.sidechain || { threshold: 0.1, ratio: 1.25, attack: 20, release: 350 };
  const musicVol = adn.audio_engine?.music_volume || (adn as any).audio_settings?.music_volume || 0.3;
  const voiceVol = adn.audio_engine?.voice_volume || (adn as any).audio_settings?.voice_volume || 1.0;
  
  const voiceFx = aEngine.voice_fx || `volume=${voiceVol}`;
  const musicFx = aEngine.music_fx || `volume=${musicVol}`;

  console.log(`🎵 [Engine V2] Starting final audio/video mix...`);
  const finalMixArgs = [
    '-i', videoOnlyPath,
    '-i', bgMusic,
    '-i', voiceOnlyPath,
    '-filter_complex',
    `[1:a]${musicFx},afade=t=in:st=0:d=0.5[music]; [2:a]${voiceFx},adelay=200|200,aresample=44100,asplit=2[v_trigger][v_final]; [music][v_trigger]sidechaincompress=threshold=${sChain.threshold}:ratio=${sChain.ratio}:attack=${sChain.attack}:release=${sChain.release}[bg_ducked]; [bg_ducked][v_final]amix=inputs=2:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`,
    '-map', '0:v:0', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '0', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-ar', '44100', '-y', finalPath
  ];
  console.log(`[FFmpeg:FinalCommand] ${finalMixArgs.join(' ')}`);
  await runFfmpeg(finalMixArgs);

  console.log(`✨ [Engine V2] Final render complete! Output: ${finalPath}`);
  return finalPath;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    // Prefer the GPL binary (with libass for subtitles) downloaded at build time.
    // Falls back to ffmpeg-static if the custom binary is missing.
    const customBin = path.join(process.cwd(), 'node_modules', 'custom-ffmpeg-build', 'ffmpeg');
    const staticExt = process.platform === 'win32' ? '.exe' : '';
    const staticBin = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', `ffmpeg${staticExt}`);
    let resolvedFfmpeg: string | null = ffmpegPath;
    if (fs.existsSync(customBin)) {
      resolvedFfmpeg = customBin;
    } else if (!resolvedFfmpeg || !fs.existsSync(resolvedFfmpeg)) {
      resolvedFfmpeg = staticBin;
    }
    console.log(`[FFmpeg Binary] Using: ${resolvedFfmpeg}`);
    const proc = spawn(resolvedFfmpeg!, args);
    let lastLog = Date.now();

    proc.stderr.on('data', (data: any) => {
      const line = data.toString();
      if (line.includes('frame=') && Date.now() - lastLog < 1000) return;
      if (line.includes('frame=')) {
        const match = line.match(/frame=\s*(\d+)\s*fps=\s*([\d.]+)\s*time=\s*([\d:.]+)/);
        if (match) {
          process.stdout.write(`\r⏳ Progress: Frame ${match[1]} | FPS: ${match[2]} | Time: ${match[3]}`);
          lastLog = Date.now();
        }
      } else if (line.toLowerCase().includes('error')) {
        console.log(`\n❌ [FFmpeg Error] ${line.trim()}`);
      }
    });

    proc.on('close', (code: any) => {
      process.stdout.write('\n');
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg failed with code ${code}`));
    });
  });
}

export function generateAssFile(adn: any, segment: string, text: string, subtitle: string, watermarkText: string, duration: number, width: number, height: number): string {
  const isV2 = adn.version === '2.0' || Number(adn.version) === 2.0;
  let titleStyle: any = {};
  let subStyle: any = {};
  let markStyle: any = {};
  
  if (isV2) {
    const tEngine = (adn.typography_engine || {}) as any;
    const styles = tEngine.segment_styles?.[segment] || tEngine.segment_styles?.VALOR || {};
    titleStyle = styles.text || {};
    subStyle = styles.subtitle || {};
    markStyle = styles.watermark || {};
  } else {
    const rules = (adn as any).scenes_rules || {};
    titleStyle = { ...(rules.default?.text_styling || {}), ...(rules[segment]?.text_styling || {}) };
    subStyle = { fontSize: (titleStyle.fontSize || 80) * 0.6 };
    markStyle = { fontSize: 24, primaryColor: '#FFFFFF@0.5', alignment: 'bottom-right' };
  }

  const resolveAssColor = (col: string) => {
    if (!col) return '&H00FFFFFF';
    if (col.startsWith('&H')) return col;
    let opacity = 0; 
    let cleanHex = col;
    if (col.includes('@')) {
      const parts = col.split('@');
      cleanHex = parts[0];
      const alpha = parseFloat(parts[1]);
      opacity = Math.round((1 - alpha) * 255);
    }
    const hex = cleanHex.replace('#', '');
    if (hex.length === 6) {
      const r = hex.substring(0, 2);
      const g = hex.substring(2, 4);
      const b = hex.substring(4, 6);
      const alphaHex = opacity.toString(16).padStart(2, '0').toUpperCase();
      return `&H${alphaHex}${b}${g}${r}`;
    }
    return '&H00FFFFFF';
  };

  const resolveStyle = (s: any, type: 'title' | 'sub' | 'mark') => {
    const primaryColor = resolveAssColor(s.primaryColor || '#FFFFFF');
    let shadowColor = '&H00000000';
    let shadowDepth = 0;
    let shadowBlur = 0;
    if (s.shadow) {
      shadowDepth = s.shadow.depth || 0;
      shadowBlur = s.shadow.blur || 0;
      const baseShadowCol = s.shadow.color || '#000000';
      const shadowAlpha = s.shadow.alpha !== undefined ? s.shadow.alpha : 0.8;
      shadowColor = resolveAssColor(`${baseShadowCol}@${shadowAlpha}`);
    }

    const fontSize = s.fontSize || (type === 'sub' ? 45 : type === 'mark' ? 30 : 80);
    const rawFont = s.fontName || 'Arial';
    // Map TTF filenames to their internal font family names (as libass expects them)
    const fontNameMap: Record<string, string> = {
      'Inter-Black.ttf': 'Inter',
      'arialbd.ttf': 'Arial Bold',
      'calibri.ttf': 'Calibri',
      'georgia.ttf': 'Georgia',
      'impact.ttf': 'Impact',
      'trebucbd.ttf': 'Trebuchet MS Bold',
    };
    const fontName = fontNameMap[rawFont] || rawFont.replace('.ttf', '').replace(/-/g, ' ');

    let assAlignment = 2;
    const align = (s.alignment || (type === 'mark' ? 'right' : 'center')).toLowerCase();
    
    if (align.includes('top')) {
      if (align.includes('left')) assAlignment = 7;
      else if (align.includes('right')) assAlignment = 9;
      else assAlignment = 8;
    } else {
      if (align.includes('left')) assAlignment = 1;
      else if (align.includes('right')) assAlignment = 3;
      else assAlignment = 2;
    }

    const marginV = s.marginV || (type === 'sub' ? 120 : type === 'mark' ? 50 : 280);
    const marginL = s.marginH || s.marginL || 50;
    const marginR = s.marginH || s.marginR || 50;

    let borderStyle = 1; 
    let outlineWidth = 0;
    let outlineColor = '&H00000000';
    let outlineBlur = 0;

    if (s.overlay && (s.overlay.type === 'box' || s.overlay.type === 'solid' || s.overlay.type === 'pill')) {
      borderStyle = 3;
      const boxColor = s.overlay.color || '#000000';
      const boxAlpha = s.overlay.intensity !== undefined ? s.overlay.intensity : 0.5;
      outlineColor = resolveAssColor(`${boxColor}@${boxAlpha}`);
    } else if (s.outline) {
      outlineWidth = s.outline.width || 2;
      outlineBlur = s.outline.blur || 0;
      const baseOutlineCol = s.outline.color || '#000000';
      const outlineAlpha = s.outline.alpha !== undefined ? s.outline.alpha : 1.0;
      outlineColor = resolveAssColor(`${baseOutlineCol}@${outlineAlpha}`);
    }
    
    return {
      fontName, fontSize, primaryColor, outlineColor, shadowColor, assAlignment, marginV, marginL, marginR,
      outlineWidth, borderStyle, shadowDepth, shadowBlur, outlineBlur,
      bold: s.bold ? 1 : 0, italic: s.italic ? 1 : 0,
      letterSpacing: s.letterSpacing || 0, scaleX: s.scaleX || 100, scaleY: s.scaleY || 100,
      uppercase: s.uppercase === true
    };
  };

  const t = resolveStyle(titleStyle, 'title');
  const sub = resolveStyle(subStyle, 'sub');
  const mark = resolveStyle(markStyle, 'mark');

  let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
ScaledBorderAndShadow: yes

[v4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,${t.fontName},${t.fontSize},${t.primaryColor},&H0000FFFF,${t.outlineColor},${t.shadowColor},${t.bold},${t.italic},0,0,${t.scaleX},${t.scaleY},${t.letterSpacing},0,${t.borderStyle},${t.outlineWidth},${t.shadowDepth},${t.assAlignment},${t.marginL},${t.marginR},${t.marginV},1
Style: Subtitle,${sub.fontName},${sub.fontSize},${sub.primaryColor},&H0000FFFF,${sub.outlineColor},${sub.shadowColor},${sub.bold},${sub.italic},0,0,${sub.scaleX},${sub.scaleY},${sub.letterSpacing},0,${sub.borderStyle},${sub.outlineWidth},${sub.shadowDepth},${sub.assAlignment},${sub.marginL},${sub.marginR},${sub.marginV},1
Style: Watermark,${mark.fontName},${mark.fontSize},${mark.primaryColor},&H0000FFFF,${mark.outlineColor},${mark.shadowColor},${mark.bold},${mark.italic},0,0,${mark.scaleX},${mark.scaleY},${mark.letterSpacing},0,${mark.borderStyle},${mark.outlineWidth},${mark.shadowDepth},${mark.assAlignment},${mark.marginL},${mark.marginR},${mark.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const finalTitle = t.uppercase ? text.toUpperCase() : text;
  const titleBlur = t.shadowBlur > 0 ? `{\\blur${t.shadowBlur}}` : '';
  ass += `Dialogue: 0,0:00:00.00,${formatDuration(duration)},Title,,0,0,0,,${titleBlur}${finalTitle}\n`;

  const finalSub = sub.uppercase ? subtitle.toUpperCase() : subtitle;
  const subBlur = sub.shadowBlur > 0 ? `{\\blur${sub.shadowBlur}}` : '';
  const subOutlineBlur = sub.outlineBlur > 0 ? `{\\be${sub.outlineBlur}}` : '';
  if (finalSub) {
    ass += `Dialogue: 1,0:00:00.00,${formatDuration(duration)},Subtitle,,0,0,0,,${subBlur}${subOutlineBlur}${finalSub}\n`;
  }

  const finalMark = mark.uppercase ? watermarkText.toUpperCase() : watermarkText;
  if (finalMark) {
    ass += `Dialogue: 0,0:00:00.00,${formatDuration(duration)},Watermark,,0,0,0,,${finalMark}\n`;
  }

  return ass;
}
