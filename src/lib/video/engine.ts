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
  brandColors?: { primary?: string; secondary?: string; accent?: string; outline?: string } | null;
  onSliceProgress?: (sliceIndex: number, totalSlices: number) => Promise<void>;
  onStageProgress?: (progress: number, stage: string) => Promise<void>;
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

    console.log(`\n🎬 [Slice ${i + 1}/${slices.length}] Processing: "${slice.text.substring(0, 30)}..." | Dur: ${duration}s`);

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

    const effectiveBrandColors = req.brandColors || req.blueprint?.brandColors || adn?.brandColors;
    const assContent = generateAssFile(adn, segment, slice.text || '', slice.subtitle || '', slice.watermark || '', duration, width, height, effectiveBrandColors);
    fs.writeFileSync(assPath, assContent, 'utf-8');

    let zoomFilter = '';
    if (isV2) {
      const logic = adn.logic_segments?.[segment] || adn.logic_segments?.VALOR || {};
      const motionRule = adn.camera?.segment_rules?.[segment] || {};

      const cameraMode = motionRule.mode || logic.camera || 'cinematic_zoom';
      const intensity = motionRule.intensity || adn.global_fx?.zoom_intensity || 1.1;
      const speed = motionRule.speed || adn.global_fx?.zoom_speed || 1;
      const direction = motionRule.direction || adn.global_fx?.zoom_direction || 'center';

      console.log(`🎥 [DEBUG] Segment: ${segment} | cameraMode: ${cameraMode} | intensity: ${intensity} | speed: ${speed} | direction: ${direction}`);

      if (cameraMode === 'static' || intensity <= 1 || speed <= 0) {
        zoomFilter = `zoompan=z=1:x=0:y=0:d=1:s=${width}x${height}:fps=30`;
      } else {
        // The zoom step should allow it to reach the target intensity over the duration.
        // We use speed as a direct multiplier to the time progress.
        const effectiveZoom = (intensity - 1) * speed;
        const zoomStep = `(${effectiveZoom})*on/(${duration}*30)`;
        
        if (cameraMode === 'pan') {
          // For pan, we zoom in slightly and move the x/y coordinates over time.
          // We use intensity to determine how much we zoom in to allow panning room.
          const staticZ = Math.max(intensity, 1.1);
          const maxPanX = `(iw-iw/zoom)`;
          const maxPanY = `(ih-ih/zoom)`;
          const progress = `(on/(${duration}*30))`;
          
          if (direction === 'left') {
            zoomFilter = `zoompan=z='${staticZ}':x='${maxPanX} - ${maxPanX}*${progress}':y='ih/2-(ih/zoom)/2':d=1:s=${width}x${height}:fps=30`;
          } else if (direction === 'right') {
            zoomFilter = `zoompan=z='${staticZ}':x='${maxPanX}*${progress}':y='ih/2-(ih/zoom)/2':d=1:s=${width}x${height}:fps=30`;
          } else if (direction === 'top') {
            zoomFilter = `zoompan=z='${staticZ}':x='iw/2-(iw/zoom)/2':y='${maxPanY} - ${maxPanY}*${progress}':d=1:s=${width}x${height}:fps=30`;
          } else if (direction === 'bottom') {
            zoomFilter = `zoompan=z='${staticZ}':x='iw/2-(iw/zoom)/2':y='${maxPanY}*${progress}':d=1:s=${width}x${height}:fps=30`;
          } else {
            // Default center pan doesn't move, so it just stays zoomed
            zoomFilter = `zoompan=z='${staticZ}':x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':d=1:s=${width}x${height}:fps=30`;
          }
        } else {
          // Normal Zoom (in or out)
          if (direction === 'top') {
            zoomFilter = `zoompan=z='1+${zoomStep}':x='0':y='0':d=1:s=${width}x${height}:fps=30`;
          } else if (direction === 'bottom') {
            zoomFilter = `zoompan=z='1+${zoomStep}':x='iw-iw/zoom':y='ih-ih/zoom':d=1:s=${width}x${height}:fps=30`;
          } else {
            zoomFilter = `zoompan=z='1+${zoomStep}':x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':d=1:s=${width}x${height}:fps=30`;
          }
        }
      }
    } else {
      const gFx = (adn.global_fx || {}) as any;
      const zoom = gFx.zoom_intensity || 1.1;
      const direction = gFx.zoom_direction || 'center';
      const zStep = `(${zoom}-1)*on/(${duration}*30)`;
      if (direction === 'top') zoomFilter = `zoompan=z='1+${zStep}':x='0':y='0':d=1:s=${width}x${height}:fps=30`;
      else if (direction === 'bottom') zoomFilter = `zoompan=z='1+${zStep}':x='iw-iw/zoom':y='ih-ih/zoom':d=1:s=${width}x${height}:fps=30`;
      else zoomFilter = `zoompan=z='1+${zStep}':x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':d=1:s=${width}x${height}:fps=30`;
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

    // ── TEXT OVERLAYS VIA libass (subtitles filter) ────────────────────────
    // We use .ass files for high-fidelity text rendering (styling, shadows, etc.)
    // On Linux (Cloud Run), libass requires a correctly configured FontConfig.
    // We generate a dynamic fonts.conf that points to our absolute fonts directory.
    const fontsDir = path.join(process.cwd(), 'public', 'fonts').replace(/\\/g, '/');
    const fontsConfPath = path.join(workDir, 'fonts.conf');
    const winFontsDir = process.platform === 'win32' ? '  <dir>C:/Windows/Fonts</dir>' : '';
    const fontsConfContent = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontsDir}</dir>
  <cachedir>${path.join(workDir, 'fontscache').replace(/\\/g, '/')}</cachedir>
  <config></config>
  <dir>/usr/share/fonts</dir>
  <dir>/usr/local/share/fonts</dir>
${winFontsDir}
</fontconfig>`;
    fs.writeFileSync(fontsConfPath, fontsConfContent);

    const absImgPath = path.resolve(slice.imagePath).replace(/\\/g, '/');
    const absAss = path.resolve(assPath).replace(/\\/g, '/');

    // Construct the subtitles filter string with fontsdir for high-fidelity TTF font discovery
    const relAss = path.relative(process.cwd(), assPath).replace(/\\/g, '/');
    const relFontsDir = path.relative(process.cwd(), fontsDir).replace(/\\/g, '/');
    const subtitlesFilter = process.platform === 'win32'
      ? `subtitles=filename='${relAss}':fontsdir='${relFontsDir}'`
      : `subtitles=filename='${absAss}':fontsdir='${fontsDir}'`;

    const filters = [
      `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
      zoomFilter,
      postFX,
      subtitlesFilter,
      `format=yuv420p`
    ].filter(Boolean).join(',');

    const totalFrames = Math.max(Math.round(duration * 30), 1);
    const ffmpegArgs = [
      '-nostdin',
      '-loop', '1',
      '-framerate', '30',
      '-i', absImgPath,
      '-vf', filters,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '16',
      '-profile:v', 'high',
      '-level', '4.1',
      '-tune', 'stillimage',
      '-g', '60',
      '-keyint_min', '30',
      '-sc_threshold', '0',
      '-color_primaries', 'bt709',
      '-color_trc', 'bt709',
      '-colorspace', 'bt709',
      '-threads', '0',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-frames:v', totalFrames.toString(),
      '-y',
      platePath
    ];

    // Environment variables for FFmpeg to find the custom fonts.conf
    const ffmpegEnv = {
      ...process.env,
      FONTCONFIG_FILE: fontsConfPath
    };

    // Borrar archivo previo si existe para asegurar que se genera uno nuevo
    if (fs.existsSync(platePath)) {
      try { fs.unlinkSync(platePath); } catch (e) { }
    }

    if (req.onSliceProgress) {
      try {
        await req.onSliceProgress(i, slices.length);
      } catch (pErr) {
        console.warn(`[Engine V2] Error reporting slice progress:`, pErr);
      }
    }

    console.log(`🎬 [Engine V2] Rendering Slice ${i} (${totalFrames} frames) | FX: ${postFX.substring(0, 30)}... | Zoom: ${zoomFilter}`);
    await runFfmpeg(ffmpegArgs, ffmpegEnv);

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
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2', '-shortest', '-y', sliceWithAudioPath
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

  // 2. Concatenate Video Clips with XFADE Transitions and Retention Progress Bar
  if (req.onStageProgress) {
    try { await req.onStageProgress(74, 'Uniendo escenas y transiciones con FFmpeg...'); } catch {}
  }
  const videoOnlyPath = path.join(workDir, 'video_only.mp4');
  let cumulativeOffset = 0;
  const transitionOffsets: number[] = [];

  const VALID_XFADES = new Set([
    'fade', 'wipeleft', 'wiperight', 'wipeup', 'wipedown',
    'slideleft', 'slideright', 'slideup', 'slidedown',
    'circlecrop', 'rectcrop', 'distance', 'fadeblack', 'fadewhite',
    'radial', 'smoothleft', 'smoothright', 'smoothup', 'smoothdown',
    'circleopen', 'circleclose', 'vertopen', 'vertclose',
    'horzopen', 'horzclose', 'dissolve', 'pixelize',
    'diagtl', 'diagtr', 'diagbl', 'diagbr', 'hlslice', 'hrslice', 'vuslice', 'vdslice'
  ]);

  // Pre-calcular duracion total del video final
  let totalVideoDur = sceneDurations[0] || slices.reduce((acc, s) => acc + s.duration, 0);
  if (sceneClips.length > 1) {
    let tempOff = 0;
    for (let i = 1; i < sceneClips.length; i++) {
      const prevSegment = sceneLabels[i - 1];
      const prevRule = ((adn as any).motion_engine?.camera?.segment_rules?.[prevSegment] || {}) as any;
      const rawTransDuration = prevRule.transition_duration !== undefined ? prevRule.transition_duration : (adn.motion_engine?.transitions?.duration || 0.5);
      const prevDuration = sceneDurations[i - 1];
      const nextDuration = sceneDurations[i];
      const maxAllowed = Math.min(prevDuration * 0.4, nextDuration * 0.4);
      const currentTransDuration = Math.max(0.15, Math.min(rawTransDuration, maxAllowed));
      tempOff += prevDuration - currentTransDuration;
    }
    totalVideoDur = tempOff + sceneDurations[sceneClips.length - 1];
  }

  // Barra de Retencion Dinamica (Progress Bar): 6px en borde inferior
  const isVerticalFormat = (req.format || 'vertical') === 'vertical';
  const effectiveBrandColors = req.brandColors || req.blueprint?.brandColors || adn?.brandColors;
  const accentHex = (effectiveBrandColors?.accent || adn?.brandColors?.accent || '#FFD700').replace('#', '');
  const barColor = '0x' + accentHex.toUpperCase();
  const progressBarFilter = isVerticalFormat
    ? `drawbox=x=0:y=ih-6:w=iw:h=6:color=0x000000@0.35:t=fill,drawbox=x=0:y=ih-6:w='iw*t/${totalVideoDur.toFixed(3)}':h=6:color=${barColor}:t=fill`
    : '';

  if (sceneClips.length === 1) {
    const singleArgs = ['-i', sceneClips[0]];
    if (progressBarFilter) {
      singleArgs.push('-vf', progressBarFilter);
    }
    await runFfmpeg([
      ...singleArgs,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
      '-profile:v', 'high', '-level', '4.1',
      '-g', '60', '-keyint_min', '30', '-sc_threshold', '0',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-pix_fmt', 'yuv420p', '-threads', '0', '-y', videoOnlyPath
    ]);
  } else {
    console.log(`[Engine V2] Orchestrating ${sceneClips.length} clips with xfade transitions...`);
    // Prepare inputs with consistent timebase and PTS for xfade
    let filterComplex = '';
    for (let i = 0; i < sceneClips.length; i++) {
      filterComplex += `[${i}:v]settb=AVTB,setpts=PTS-STARTPTS[v_pts${i}]; `;
    }

    let lastLabel = 'v_pts0';

    for (let i = 1; i < sceneClips.length; i++) {
      const prevSegment = sceneLabels[i - 1];
      const prevRule = ((adn as any).motion_engine?.camera?.segment_rules?.[prevSegment] || {}) as any;
      const transTypeFull = prevRule.transition || (adn as any).motion_engine?.transitions?.default || 'xfade:fade';
      const cleanTrans = transTypeFull.replace('xfade:', '');
      const transType = VALID_XFADES.has(cleanTrans) ? cleanTrans : 'fade';
      const rawTransDuration = prevRule.transition_duration !== undefined ? prevRule.transition_duration : (adn.motion_engine?.transitions?.duration || 0.5);

      const prevDuration = sceneDurations[i - 1];
      const nextDuration = sceneDurations[i];
      const maxAllowed = Math.min(prevDuration * 0.4, nextDuration * 0.4);
      const currentTransDuration = Math.max(0.15, Math.min(rawTransDuration, maxAllowed));

      cumulativeOffset += prevDuration - currentTransDuration;
      transitionOffsets.push(cumulativeOffset);

      const outLabel = `v_xfade${i}`;
      filterComplex += `[${lastLabel}][v_pts${i}]xfade=transition=${transType}:duration=${currentTransDuration.toFixed(3)}:offset=${cumulativeOffset.toFixed(3)}[${outLabel}]`;

      if (i < sceneClips.length - 1) {
        filterComplex += '; ';
      }
      lastLabel = outLabel;
    }

    // Inyectar Barra de Retencion sobre el output de xfade
    if (progressBarFilter) {
      filterComplex += `; [${lastLabel}]${progressBarFilter}[v_bar_out]`;
      lastLabel = 'v_bar_out';
    }

    const inputArgs = sceneClips.flatMap(p => ['-i', p]);
    await runFfmpeg([
      ...inputArgs,
      '-filter_complex', filterComplex,
      '-map', `[${lastLabel}]`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
      '-profile:v', 'high', '-level', '4.1',
      '-g', '60', '-keyint_min', '30', '-sc_threshold', '0',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-pix_fmt', 'yuv420p', '-threads', '0', '-y', videoOnlyPath
    ]);
  }

  // Liberar RAM en Cloud Run (/tmp es tmpfs en memoria): borrar plates intermedios ya concatenados
  for (const clipPath of sceneClips) {
    try { if (fs.existsSync(clipPath)) fs.unlinkSync(clipPath); } catch {}
  }

  // 3. Concatenate Audio Clips sequentially with natural pacing (no acrossfade voice attenuation)
  if (req.onStageProgress) {
    try { await req.onStageProgress(77, 'Sincronizando locución y música...'); } catch {}
  }
  const voiceOnlyPath = path.join(workDir, 'voice_only.mp3');

  if (voiceClips.length === 1) {
    fs.copyFileSync(voiceClips[0], voiceOnlyPath);
  } else {
    let filterComplex = '';
    for (let i = 0; i < voiceClips.length; i++) {
      let targetDuration: number;
      if (i < voiceClips.length - 1) {
        const prevSegment = sceneLabels[i];
        const prevRule = ((adn as any).motion_engine?.camera?.segment_rules?.[prevSegment] || {}) as any;
        const rawTransDuration = prevRule.transition_duration !== undefined ? prevRule.transition_duration : (adn.motion_engine?.transitions?.duration || 0.5);
        const prevDuration = sceneDurations[i];
        const nextDuration = sceneDurations[i + 1] || prevDuration;
        const maxAllowed = Math.min(prevDuration * 0.4, nextDuration * 0.4);
        const currentTransDuration = Math.max(0.15, Math.min(rawTransDuration, maxAllowed));
        targetDuration = Math.max(0.1, sceneDurations[i] - currentTransDuration);
      } else {
        targetDuration = Math.max(0.1, sceneDurations[i]);
      }
      filterComplex += `[${i}:a]aresample=44100,apad,atrim=0:${targetDuration.toFixed(3)}[a_pad${i}]; `;
    }

    const padLabels = voiceClips.map((_, i) => `[a_pad${i}]`).join('');
    filterComplex += `${padLabels}concat=n=${voiceClips.length}:v=0:a=1[voice_concat]`;

    const audioInputArgs = voiceClips.flatMap(p => ['-i', p]);
    await runFfmpeg([
      ...audioInputArgs,
      '-filter_complex', filterComplex,
      '-map', '[voice_concat]',
      '-c:a', 'libmp3lame', '-y', voiceOnlyPath
    ]);
  }

  // 4. Final Mix with Soundtrack and Ducking
  if (req.onStageProgress) {
    try { await req.onStageProgress(79, 'Masterizando audio y empaquetando MP4...'); } catch {}
  }
  const finalPath = path.join(workDir, 'final_render.mp4');

  if (fs.existsSync(finalPath)) {
    try { fs.unlinkSync(finalPath); } catch (e) { }
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

  // Pista de Micro-Efectos Auditivos (SFX Whooshes) en Transiciones
  let sfxTrackPath: string | null = null;
  const whooshFile = path.join(process.cwd(), 'public', 'audio', 'sfx', 'whoosh.mp3');

  if (transitionOffsets.length > 0 && fs.existsSync(whooshFile)) {
    try {
      const generatedSfxPath = path.join(workDir, 'sfx_track.mp3');
      const sfxInputs: string[] = [];
      const sfxFilterParts: string[] = [];
      const sfxMixLabels: string[] = [];

      for (let sIdx = 0; sIdx < transitionOffsets.length; sIdx++) {
        sfxInputs.push('-i', whooshFile);
        const delayMs = Math.max(0, Math.round(transitionOffsets[sIdx] * 1000));
        sfxFilterParts.push(`[${sIdx}:a]adelay=${delayMs}|${delayMs}[sfx_del_${sIdx}]`);
        sfxMixLabels.push(`[sfx_del_${sIdx}]`);
      }

      const sfxFilter = sfxFilterParts.join('; ') + '; ' + sfxMixLabels.join('') +
        `amix=inputs=${transitionOffsets.length}:duration=first:dropout_transition=0,volume=0.25,apad,atrim=0:${totalVideoDur.toFixed(3)}[sfx_out]`;

      await runFfmpeg([
        ...sfxInputs,
        '-filter_complex', sfxFilter,
        '-map', '[sfx_out]',
        '-c:a', 'libmp3lame',
        '-y', generatedSfxPath
      ]);

      if (fs.existsSync(generatedSfxPath)) {
        sfxTrackPath = generatedSfxPath;
      }
    } catch (e) {
      console.warn('[Engine V2] No se pudo generar la pista de SFX whooshes:', e);
    }
  }

  const fadeOutDuration = 0.8;
  const fadeOutStart = Math.max(0, totalVideoDur - fadeOutDuration);

  console.log(`🎵 [Engine V2] Starting final audio/video mix (totalDur: ${totalVideoDur.toFixed(3)}s, fadeOutStart: ${fadeOutStart.toFixed(3)}s, sfx: ${!!sfxTrackPath})...`);

  const mixInputs = ['-i', videoOnlyPath, '-i', bgMusic, '-i', voiceOnlyPath];
  let filterComplexMix = '';

  if (sfxTrackPath) {
    mixInputs.push('-i', sfxTrackPath);
    filterComplexMix = `[1:a]${musicFx},afade=t=in:st=0:d=0.5[music]; [2:a]${voiceFx},adelay=200|200,aresample=44100,asplit=2[v_trigger][v_final]; [music][v_trigger]sidechaincompress=threshold=${sChain.threshold}:ratio=${sChain.ratio}:attack=${sChain.attack}:release=${sChain.release}[bg_ducked]; [bg_ducked][3:a]amix=inputs=2:duration=first[bg_sfx]; [bg_sfx][v_final]amix=inputs=2:duration=first,loudnorm=I=-14:TP=-1.0:LRA=7,afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeOutDuration}[aout]`;
  } else {
    filterComplexMix = `[1:a]${musicFx},afade=t=in:st=0:d=0.5[music]; [2:a]${voiceFx},adelay=200|200,aresample=44100,asplit=2[v_trigger][v_final]; [music][v_trigger]sidechaincompress=threshold=${sChain.threshold}:ratio=${sChain.ratio}:attack=${sChain.attack}:release=${sChain.release}[bg_ducked]; [bg_ducked][v_final]amix=inputs=2:duration=first,loudnorm=I=-14:TP=-1.0:LRA=7,afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeOutDuration}[aout]`;
  }

  const finalMixArgs = [
    ...mixInputs,
    '-filter_complex', filterComplexMix,
    '-map', '0:v:0', '-map', '[aout]',
    '-c:v', 'copy', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2', '-shortest', '-y', finalPath
  ];
  console.log(`[FFmpeg:FinalCommand] ${finalMixArgs.join(' ')}`);
  await runFfmpeg(finalMixArgs);

  console.log(`✨ [Engine V2] Final render complete! Output: ${finalPath}`);
  return finalPath;
}

function runFfmpeg(args: string[], envOverrides: any = {}): Promise<void> {
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

    const safeArgs = args.includes('-nostdin') ? args : ['-nostdin', ...args];
    const proc = spawn(resolvedFfmpeg!, safeArgs, {
      env: { ...process.env, ...envOverrides },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    proc.on('error', (err) => {
      console.error('[FFmpeg Process Error]', err);
      reject(err);
    });

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
      } else {
        const isBenign = line.includes('Error opening memory font') || line.includes('Fontconfig warning');
        if (line.toLowerCase().includes('error') && !isBenign) {
          console.log(`\n❌ [FFmpeg Error] ${line.trim()}`);
        }
        if (line.includes('fontselect') || line.toLowerCase().includes('subtitle') || isBenign) {
          console.log(`\n🔍 [FFmpeg FontLog] ${line.trim()}`);
        }
      }
    });

    proc.on('close', (code: any) => {
      process.stdout.write('\n');
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg failed with code ${code}`));
    });
  });
}

export function resolveAssFontDescriptor(
  rawFont: string,
  styleBold?: boolean | number,
  styleItalic?: boolean | number
): { fontName: string; bold: number; italic: number } {
  const fontFile = (rawFont || '').trim();
  const lower = fontFile.toLowerCase();

  let family = 'Inter';
  let isBold = styleBold ? 1 : 0;
  let isItalic = styleItalic ? 1 : 0;

  switch (lower) {
    case 'inter-black.ttf':
    case 'inter-black':
      family = 'Inter Black';
      isBold = 0;
      break;
    case 'inter-extrabold.ttf':
    case 'inter-extrabold':
      family = 'Inter ExtraBold';
      isBold = 0;
      break;
    case 'inter-bold.ttf':
    case 'inter-bold':
      family = 'Inter';
      isBold = 1;
      break;
    case 'inter-semibold.ttf':
    case 'inter-semibold':
      family = 'Inter SemiBold';
      isBold = 0;
      break;
    case 'inter-medium.ttf':
    case 'inter-medium':
      family = 'Inter Medium';
      isBold = 0;
      break;
    case 'inter-light.ttf':
    case 'inter-light':
      family = 'Inter Light';
      isBold = 0;
      break;
    case 'inter-regular.ttf':
    case 'inter-regular':
    case 'inter':
      family = 'Inter';
      break;
    case 'impact.ttf':
    case 'impact':
      family = 'Impact';
      break;
    case 'trebucbd.ttf':
    case 'trebuchet':
    case 'trebuchet ms':
      family = 'Trebuchet MS';
      isBold = 1;
      break;
    case 'georgia.ttf':
    case 'georgia':
      family = 'Georgia';
      break;
    case 'calibri.ttf':
    case 'calibri':
      family = 'Calibri';
      break;
    case 'arialbd.ttf':
    case 'arial-bold':
      family = 'Arial';
      isBold = 1;
      break;
    case 'arial.ttf':
    case 'arial':
      family = 'Arial';
      break;
    default: {
      const clean = fontFile.replace(/\.ttf$/i, '').replace(/[-_]/g, ' ');
      family = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
  }

  return { fontName: family, bold: isBold, italic: isItalic };
}

export function splitKineticPhrase(text: string, duration: number): { text: string; start: number; end: number; isSecondBlock?: boolean }[] {
  const clean = text.trim();
  if (duration < 2.5) {
    return [{ text: clean, start: 0, end: duration }];
  }

  // 1. Check if newline exists (literal \n or escaped string \n)
  if (clean.includes('\n') || clean.includes('\\n')) {
    const parts = clean.split(/\r?\n|\\n/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const splitTime = Math.round(Math.max(1.0, Math.min(duration - 1.0, duration * 0.5)) * 100) / 100;
      return [
        { text: parts[0], start: 0, end: splitTime },
        { text: parts.slice(1).join(' '), start: splitTime, end: duration, isSecondBlock: true }
      ];
    }
  }

  // 2. Check if two emphasis pairs exist (*word1* ... *word2*)
  const asteriskMatches = [...clean.matchAll(/\*([^*]+)\*/g)];
  if (asteriskMatches.length >= 2) {
    const firstEnd = asteriskMatches[0].index! + asteriskMatches[0][0].length;
    const secondStart = asteriskMatches[1].index!;
    const inBetween = clean.substring(firstEnd, secondStart);
    const punctMatch = inBetween.search(/[.,!?:;\-\–]/);
    let splitCharIdx: number;
    if (punctMatch !== -1) {
      splitCharIdx = firstEnd + punctMatch + 1;
    } else {
      const spaceMatch = inBetween.search(/\s+/);
      splitCharIdx = spaceMatch !== -1 ? firstEnd + spaceMatch + 1 : Math.round((firstEnd + secondStart) / 2);
    }
    const part1 = clean.substring(0, splitCharIdx).trim();
    const part2 = clean.substring(splitCharIdx).trim();
    if (part1 && part2) {
      const ratio = part1.length / (part1.length + part2.length);
      const splitTime = Math.round(duration * Math.max(0.35, Math.min(0.65, ratio)) * 100) / 100;
      return [
        { text: part1, start: 0, end: splitTime },
        { text: part2, start: splitTime, end: duration, isSecondBlock: true }
      ];
    }
  }

  const words = clean.split(/\s+/);
  if (words.length < 2) {
    return [{ text: clean, start: 0, end: duration }];
  }

  // 3. Check punctuation near middle (between 25% and 75% of words)
  let midWord = Math.ceil(words.length / 2);
  const minIdx = Math.max(1, Math.floor(words.length * 0.25));
  const maxIdx = Math.min(words.length - 1, Math.ceil(words.length * 0.75));
  
  for (let i = minIdx; i <= maxIdx; i++) {
    const w = words[i - 1];
    if (/[.,!?:;]$/.test(w)) {
      midWord = i;
      break;
    }
  }

  // Ensure midWord does not break an ongoing *emphasis*
  const textBefore = words.slice(0, midWord).join(' ');
  const asteriskCount = (textBefore.match(/\*/g) || []).length;
  if (asteriskCount % 2 !== 0) {
    const nextClose = words.findIndex((w, idx) => idx >= midWord && w.includes('*'));
    if (nextClose !== -1 && nextClose < words.length) {
      midWord = nextClose + 1;
    } else {
      const prevOpen = words.slice(0, midWord).map(w => w.includes('*')).lastIndexOf(true);
      if (prevOpen > 0) midWord = prevOpen;
    }
  }

  if (midWord <= 0 || midWord >= words.length) {
    return [{ text: clean, start: 0, end: duration }];
  }

  const part1 = words.slice(0, midWord).join(' ').trim();
  const part2 = words.slice(midWord).join(' ').trim();
  
  const wordRatio = midWord / words.length;
  const splitTime = Math.round(duration * Math.max(0.35, Math.min(0.65, wordRatio)) * 100) / 100;

  return [
    { text: part1, start: 0, end: splitTime },
    { text: part2, start: splitTime, end: duration, isSecondBlock: true }
  ];
}

export function generateAssFile(
  adn: any,
  segment: string,
  text: string,
  subtitle: string,
  watermarkText: string,
  duration: number,
  width: number,
  height: number,
  brandColors?: { primary?: string; secondary?: string; accent?: string; outline?: string } | null
): string {
  const isV2 = adn.version === '2.0' || Number(adn.version) === 2.0;
  let titleStyle: any = {};
  let subStyle: any = {};
  let markStyle: any = {};

  if (isV2) {
    const tEngine = (adn.typography_engine || {}) as any;
    const styles = tEngine.segment_styles?.[segment] || tEngine.segment_styles?.VALOR || {};
    titleStyle = { ...(styles.text || {}) };
    subStyle = { ...(styles.subtitle || {}) };
    markStyle = { ...(styles.watermark || {}) };
  } else {
    const rules = (adn as any).scenes_rules || {};
    titleStyle = { ...(rules.default?.text_styling || {}), ...(rules[segment]?.text_styling || {}) };
    subStyle = { fontSize: (titleStyle.fontSize || 80) * 0.6 };
    markStyle = { fontSize: 55, primaryColor: '#FFFFFF@0.7', alignment: 'bottom-right' };
  }

  // Aplicar paleta de brand a los colores si está configurada (sin alterar fuentes para FFmpeg)
  if (brandColors?.primary) {
    titleStyle.primaryColor = brandColors.primary;
    if (brandColors.secondary) {
      subStyle.primaryColor = brandColors.secondary;
    }
    if (brandColors.accent) {
      markStyle.primaryColor = `${brandColors.accent}@0.85`;
    }
    if (brandColors.outline) {
      if (titleStyle.outline) {
        titleStyle.outline = { ...titleStyle.outline, color: brandColors.outline };
      }
      if (subStyle.outline) {
        subStyle.outline = { ...subStyle.outline, color: brandColors.outline };
      }
    }
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

  const resolveInlineAssColor = (col?: string | null): string => {
    if (!col) return '';
    let cleanHex = col;
    if (col.includes('@')) {
      cleanHex = col.split('@')[0];
    }
    const hex = cleanHex.replace('#', '');
    if (hex.length === 6) {
      const r = hex.substring(0, 2);
      const g = hex.substring(2, 4);
      const b = hex.substring(4, 6);
      return `&H${b}${g}${r}&`;
    }
    return '';
  };

  const applyKineticEmphasisToAss = (
    rawText: string,
    basePrimaryHex: string | null | undefined,
    accentHex: string | null | undefined,
    outlineHex?: string | null | undefined
  ): string => {
    if (!rawText) return '';
    const inlineBase = resolveInlineAssColor(basePrimaryHex || '#FFFFFF');
    const inlineAccent = resolveInlineAssColor(accentHex || '#FFD700');
    const inlineOutl = outlineHex ? resolveInlineAssColor(outlineHex) : null;
    const outlTag = inlineOutl ? `\\3c${inlineOutl}` : '';

    return rawText.replace(/\*([^*]+)\*/g, (_, word) => {
      return `{\\1c${inlineAccent}${outlTag}}${word}{\\1c${inlineBase}${outlTag}}`;
    });
  };

  const resolveStyle = (s: any, type: 'title' | 'sub' | 'mark') => {
    const primaryColor = resolveAssColor(s.primaryColor || '#FFFFFF');
    let shadowColor = '&H00000000';
    let shadowDepth = 0;
    let shadowBlur = 0;
    if (s.shadow) {
      shadowDepth = s.shadow.depth || 0;
      shadowBlur = s.shadow.blur || (shadowDepth > 0 ? 1.2 : 0);
      const baseShadowCol = s.shadow.color || '#000000';
      const shadowAlpha = s.shadow.alpha !== undefined ? s.shadow.alpha : 0.8;
      shadowColor = resolveAssColor(`${baseShadowCol}@${shadowAlpha}`);
    }

    const fontSize = s.fontSize || (type === 'sub' ? 45 : type === 'mark' ? 30 : 80);
    const rawFont = s.fontName || (type === 'title' ? 'Inter-Black.ttf' : 'Inter-Bold.ttf');
    const fontDesc = resolveAssFontDescriptor(rawFont, s.bold, s.italic);
    const fontName = fontDesc.fontName;

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

    const marginV = s.marginV || Math.round(height * (type === 'sub' ? 0.08 : type === 'mark' ? 0.04 : 0.15));
    const marginL = s.marginH || s.marginL || Math.round(width * 0.07);
    const marginR = s.marginH || s.marginR || Math.round(width * 0.07);

    let borderStyle = 1;
    let outlineWidth = 0;
    let outlineColor = '&H00000000';
    let outlineBlur = 0;

    if (s.badge?.enabled || s.box || (s.overlay && (s.overlay.type === 'box' || s.overlay.type === 'solid' || s.overlay.type === 'pill'))) {
      borderStyle = 3;
      const boxColor = s.badge?.color || s.overlay?.color || '#000000';
      const boxAlpha = s.badge?.alpha !== undefined ? s.badge.alpha : (s.overlay?.intensity !== undefined ? s.overlay.intensity : 0.65);
      outlineColor = resolveAssColor(`${boxColor}@${boxAlpha}`);
      outlineWidth = s.badge?.padding || s.boxborderw || 8;
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
      bold: fontDesc.bold, italic: fontDesc.italic,
      letterSpacing: s.letterSpacing || 0, scaleX: s.scaleX || 100, scaleY: s.scaleY || 100,
      uppercase: s.uppercase === true
    };
  };

  const t = resolveStyle(titleStyle, 'title');
  const sub = resolveStyle(subStyle, 'sub');
  const mark = resolveStyle(markStyle, 'mark');

  // --- SEGURIDAD: LÍMITES VERTICALES Y ESCALADO DINÁMICO ---
  const safeAreaHeight = height - (height * 0.15) * 2; // 15% top, 15% bottom limit
  const availableWidth = width - (t.marginL + t.marginR);
  
  // Calcular líneas de título estimadas
  const titleCharWidth = t.fontSize * 0.55;
  const titleCharsPerLine = Math.max(1, Math.floor(availableWidth / titleCharWidth));
  let titleLines = 0;
  const cleanTitle = text.replace(/\*/g, '').replace(/\\N/g, '\n').replace(/\\n/g, '\n');
  for (const line of cleanTitle.split('\n')) {
     titleLines += Math.max(1, Math.ceil(line.length / titleCharsPerLine));
  }
  let estimatedTitleHeight = titleLines * t.fontSize * 1.2;

  // Calcular líneas de subtítulo estimadas
  let estimatedSubHeight = 0;
  if (subtitle) {
    const subAvailableWidth = width - (sub.marginL + sub.marginR);
    const subCharWidth = sub.fontSize * 0.55;
    const subCharsPerLine = Math.max(1, Math.floor(subAvailableWidth / subCharWidth));
    let subLines = 0;
    const cleanSub = subtitle.replace(/\*/g, '').replace(/\\N/g, '\n').replace(/\\n/g, '\n');
    for (const line of cleanSub.split('\n')) {
       subLines += Math.max(1, Math.ceil(line.length / subCharsPerLine));
    }
    estimatedSubHeight = subLines * sub.fontSize * 1.2;
    
    // Prevención de Overlap (Subtitle empuja al Title hacia arriba en formatos horizontales/cuadrados)
    if (t.assAlignment === 1 || t.assAlignment === 2 || t.assAlignment === 3) {
      const subTopEdge = sub.marginV + estimatedSubHeight;
      const gap = Math.round(height * 0.02); // Gap proporcional
      const requiredTitleMargin = subTopEdge + gap;
      if (t.marginV < requiredTitleMargin) {
        t.marginV = Math.round(requiredTitleMargin);
      }
    }
  }

  // Comprobar desbordamiento total y aplicar escalado de emergencia (Shrink to fit)
  const totalHeightNeeded = estimatedTitleHeight + estimatedSubHeight + (t.marginV - sub.marginV);
  if (totalHeightNeeded > safeAreaHeight) {
    const scaleFactor = Math.max(0.6, safeAreaHeight / totalHeightNeeded); // Máximo achica un 40%
    t.fontSize = Math.round(t.fontSize * scaleFactor);
    if (subtitle) {
      sub.fontSize = Math.round(sub.fontSize * scaleFactor);
    }
    console.log(`⚠️ [Engine] Texto desborda límites (${totalHeightNeeded}px > ${safeAreaHeight}px). Reduciendo tamaño de fuente al ${Math.round(scaleFactor * 100)}%`);
  }
  // --- FIN SEGURIDAD ---

  let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
ScaledBorderAndShadow: yes
WrapStyle: 1

[v4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,${t.fontName},${t.fontSize},${t.primaryColor},&H0000FFFF,${t.outlineColor},${t.shadowColor},${t.bold},${t.italic},0,0,${t.scaleX},${t.scaleY},${t.letterSpacing},0,${t.borderStyle},${t.outlineWidth},${t.shadowDepth},${t.assAlignment},${t.marginL},${t.marginR},${t.marginV},1
Style: Subtitle,${sub.fontName},${sub.fontSize},${sub.primaryColor},&H0000FFFF,${sub.outlineColor},${sub.shadowColor},${sub.bold},${sub.italic},0,0,${sub.scaleX},${sub.scaleY},${sub.letterSpacing},0,${sub.borderStyle},${sub.outlineWidth},${sub.shadowDepth},${sub.assAlignment},${sub.marginL},${sub.marginR},${sub.marginV},1
Style: Watermark,${mark.fontName},${mark.fontSize},${mark.primaryColor},&H0000FFFF,${mark.outlineColor},${mark.shadowColor},${mark.bold},${mark.italic},0,0,${mark.scaleX},${mark.scaleY},${mark.letterSpacing},0,${mark.borderStyle},${mark.outlineWidth},${mark.shadowDepth},${mark.assAlignment},${mark.marginL},${mark.marginR},${mark.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const getAssAnimationTags = (animationName: string, durationSec: number): string => {
    if (!animationName) return '';
    const durMs = Math.round(durationSec * 1000);
    
    switch (animationName.toLowerCase()) {
      case 'cinema_fade':
      case 'fade':
        return '\\fad(400,400)';
      case 'cinema_fade_out':
        return '\\fad(0,600)';
      case 'cinema_zoom':
        return `\\fscx90\\fscy90\\t(0,${durMs},\\fscx110\\fscy110)`;
      case 'kinetic_pop':
      case 'cinema_bounce':
      case 'cinema_pulse':
      case 'pop':
        return '\\fscx0\\fscy0\\t(0,250,\\fscx115\\fscy115)\\t(250,400,\\fscx100\\fscy100)';
      case 'cinema_glow':
        return '\\fad(300,300)\\blur2';
      case 'cinema_slide':
        return '\\fad(450,450)';
      case 'cinema_end':
        return '\\fad(0,800)';
      default:
        return '';
    }
  };

  const rawTitle = t.uppercase ? text.toUpperCase() : text;
  const blocks = splitKineticPhrase(rawTitle, duration);

  for (const block of blocks) {
    const blockDur = block.end - block.start;
    const blockAnim = block.isSecondBlock
      ? '\\fscx92\\fscy92\\t(0,180,\\fscx100\\fscy100)\\fad(80,150)'
      : getAssAnimationTags(titleStyle.animation, blockDur);

    let titleColorTags = '';
    if (brandColors?.primary) {
      const inlinePrim = resolveInlineAssColor(brandColors.primary);
      const inlineOutl = resolveInlineAssColor(brandColors.outline || brandColors.accent || brandColors.primary);
      if (inlinePrim) titleColorTags += `\\1c${inlinePrim}`;
      if (inlineOutl && t.borderStyle !== 3) titleColorTags += `\\3c${inlineOutl}`;
    }
    const titleOverrides = (blockAnim || titleColorTags)
      ? `{${titleColorTags}${blockAnim}}`
      : '';

    const finalBlockText = applyKineticEmphasisToAss(
      block.text,
      brandColors?.primary || titleStyle.primaryColor || '#FFFFFF',
      brandColors?.accent || titleStyle.accentColor || '#FFD700',
      t.borderStyle !== 3 ? (brandColors?.outline || brandColors?.accent || brandColors?.primary) : undefined
    );
    ass += `Dialogue: 0,${formatDuration(block.start)},${formatDuration(block.end)},Title,,0,0,0,,${titleOverrides}${finalBlockText}\n`;
  }

  const rawSub = sub.uppercase ? subtitle.toUpperCase() : subtitle;
  const subAnim = getAssAnimationTags(subStyle.animation, duration);
  let subColorTags = '';
  if (brandColors?.secondary || brandColors?.primary) {
    const inlineSub = resolveInlineAssColor(brandColors.secondary || brandColors.primary);
    if (inlineSub) subColorTags += `\\1c${inlineSub}`;
  }
  const subOverrides = (subAnim || subColorTags)
    ? `{${subColorTags}${subAnim}}`
    : '';
  if (rawSub) {
    const finalSub = applyKineticEmphasisToAss(
      rawSub,
      brandColors?.secondary || brandColors?.primary || subStyle.primaryColor || '#E5E5E5',
      brandColors?.accent || '#FFD700',
      undefined
    );
    ass += `Dialogue: 1,0:00:00.00,${formatDuration(duration)},Subtitle,,0,0,0,,${subOverrides}${finalSub}\n`;
  }

  const finalMark = mark.uppercase ? watermarkText.toUpperCase() : watermarkText;
  const markAnim = getAssAnimationTags(markStyle.animation, duration);
  let markColorTags = '';
  if (brandColors?.accent || brandColors?.primary) {
    const inlineMark = resolveInlineAssColor(brandColors.accent || brandColors.primary);
    if (inlineMark) markColorTags += `\\1c${inlineMark}`;
  }
  const markOverrides = (markAnim || markColorTags) ? `{${markColorTags}${markAnim}}` : '';
  if (finalMark) {
    ass += `Dialogue: 0,0:00:00.00,${formatDuration(duration)},Watermark,,0,0,0,,${markOverrides}${finalMark}\n`;
  }

  return ass;
}
