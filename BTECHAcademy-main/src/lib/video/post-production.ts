import path from 'path';
import fs from 'fs';

// Nueva función: Calcular filas automáticas según tamaño de fuente
function calculateRowCount(fontSize: number, height: number, safeAreaMargin: number, lineHeightRatio: number) {
  const safeTop = height * safeAreaMargin;
  const safeBottom = height * (1 - safeAreaMargin);
  const safeHeight = safeBottom - safeTop;
  const lineHeight = fontSize * lineHeightRatio;
  return Math.floor(safeHeight / lineHeight);
}

// Nueva función: Convertir fila a coordenadas FFmpeg (solo filas)
function rowToCoordinates(rowPosition: any, safeArea: any, width: number, height: number, fontSize: number) {
  const { start_row, alignment } = rowPosition;
  const { safe_area_margin, line_height_ratio } = safeArea;
  
  // Safe area calculations
  const safeTop = height * safe_area_margin;
  const safeBottom = height * (1 - safe_area_margin);
  const safeLeft = width * safe_area_margin;
  const safeRight = width * (1 - safe_area_margin);
  
  const safeHeight = safeBottom - safeTop;
  const safeWidth = safeRight - safeLeft;
  
  // Font-based spacing
  const lineHeight = fontSize * line_height_ratio;
  const totalRows = calculateRowCount(fontSize, height, safe_area_margin, line_height_ratio);
  
  // Calculate position
  let xPos, yPos;
  
  // Y position (row-based)
  yPos = safeTop + (start_row - 1) * lineHeight;
  
  // X position (alignment-based within safe area)
  switch (alignment) {
    case 'left':
      xPos = safeLeft + 20; // 20px padding from left safe area
      break;
    case 'center':
      xPos = safeLeft + safeWidth / 2;
      break;
    case 'right':
      xPos = safeRight - 20; // 20px padding from right safe area
      break;
    default:
      xPos = safeLeft + safeWidth / 2;
  }
  
  return { 
    x: Math.round(xPos), 
    y: Math.round(yPos),
    totalRows,
    lineHeight
  };
}

export function getDrawtextFilter(adnConfig: any, segment: string, brandColor: string, width: number, height: number, textFilePath: string) {
  const isV2 = adnConfig.version === '2.0';

  if (isV2) {
    // --- ADN 2.0 LOGIC ---
    const segmentStyle = adnConfig.typography_engine?.segment_styles?.[segment] || adnConfig.typography_engine?.segment_styles?.VALOR || {};
    const style = segmentStyle.text || {};

    const safeAreas = adnConfig.composition?.safe_areas || { top: 0.15, bottom: 0.15, sides: 0.1 };

    const resolveColorV2 = (col: string) => {
      if (!col) return 'white';
      // Soporte para transparencia en drawtext (color@alpha)
      if (col.includes('@')) {
        const [base, alpha] = col.split('@');
        return `${base.replace('#', '0x')}@${alpha}`;
      }
      return col.replace('#', '0x').replace('{brandColor}', brandColor);
    };

    const fontColor = resolveColorV2(style.primaryColor || 'white');
    const fontFile = style.fontName ? (style.fontName.endsWith('.ttf') ? style.fontName : `${style.fontName}.ttf`) : 'Inter-Black.ttf';
    
    let fontsDir = path.join(process.cwd(), 'public', 'fonts');
    const fontPath = path.join(fontsDir, fontFile).replace(/\\/g, '/');
    const safeTextPath = textFilePath.replace(/\\/g, '/');

    // Semantic Positioning 2.0
    const marginV = style.marginV || 0;
    let posX = '(w-tw)/2';
    let posY = '(h-th)/2';

    if (style.alignment === 'bottom-center' || style.alignment === 'center') {
      posY = `h*(1-${safeAreas.bottom})-th-${marginV}`;
    } else if (style.alignment === 'top-center') {
      posY = `h*${safeAreas.top}+${marginV}`;
    }

    const baseParams = `fontfile='${fontPath}':textfile='${safeTextPath}':expansion=normal:fontsize=${style.fontSize}:fontcolor=${fontColor}`;
    let filter = `drawtext=${baseParams}:x=${posX}:y=${posY}`;
    
    // FFmpeg Native Box Support
    if (style.overlay?.type === 'box') {
      const bCol = resolveColorV2(style.overlay.color || 'black@0.5');
      const bPad = style.overlay.intensity || 20;
      filter += `:box=1:boxcolor=${bCol}:boxborderw=${bPad}`;
    }

    // FFmpeg Native Shadow Support
    if (style.shadow?.depth) {
      const sCol = resolveColorV2(style.shadow.color || 'black@0.8');
      filter += `:shadowx=${style.shadow.depth}:shadowy=${style.shadow.depth}:shadowcolor=${sCol}`;
    }

    if (style.outline?.width) {
      const sCol = resolveColorV2(style.outline.color || 'black');
      filter += `:borderw=${style.outline.width}:bordercolor=${sCol}`;
    }

    return filter;
  }

  // --- LEGACY ADN 1.0 LOGIC ---
  const rules = adnConfig.scenes_rules || {};
  const activeRule = {
    ...(rules.default?.text_styling || rules.default || {}),
    ...(rules[segment]?.text_styling || {})
  };

  const resolveColor = (col: string) => {
    if (!col) return 'white';
    let cleaned = col.replace('{brandColor}', brandColor);
    if (cleaned.startsWith('#')) return cleaned.replace('#', '0x');
    return cleaned.replace('@', '\\@');
  };

  const fontColor = resolveColor(activeRule.fontcolor || 'white');
  const fontFile = activeRule.fontFamily || 'Inter-Black.ttf';
  let fontsDir = path.join(process.cwd(), 'public', 'fonts');
  const fontPath = path.join(fontsDir, fontFile).replace(/\\/g, '/').replace(/:/g, '\\:');
  const safeTextPath = textFilePath.replace(/\\/g, '/').replace(/:/g, '\\:');

  let posX: string = '(w-tw)/2';
  let posY: string = '(h-th)/2';
  
  if (activeRule.row_position && activeRule.safe_area) {
    const coords = rowToCoordinates(activeRule.row_position, activeRule.safe_area, width, height, activeRule.fontsize);
    switch (activeRule.row_position.alignment) {
      case 'left': posX = coords.x.toString(); break;
      case 'center': posX = `${coords.x}-(tw/2)`; break;
      case 'right': posX = `${coords.x}-tw`; break;
    }
    posY = coords.y.toString();
  } else {
    const sanitizeCoord = (val: string, isX: boolean) => {
      if (!val) return isX ? '(w-tw)/2' : '(h-th)/2';
      if (val === 'center') return isX ? '(w-tw)/2' : '(h-th)/2';
      return val;
    };
    posX = sanitizeCoord(activeRule.x, true);
    posY = sanitizeCoord(activeRule.y, false);
    posY = `if(lt(${posY}\\,h*0.15)\\,h*0.15\\,${posY})`;
    posY = `if(gt(${posY}\\,h*0.78)\\,h*0.78\\,${posY})`;
  }

  const baseParams = `fontfile='${fontPath}':textfile='${safeTextPath}':expansion=normal:fontsize=${activeRule.fontsize}`;
  let filter = '';
  if (activeRule.effects?.fake_3d_shadows) {
    const depth = activeRule.effects.shadow_depth || 4;
    filter += `drawtext=${baseParams}:fontcolor=black\\@0.5:x=${posX}+${Math.floor(depth / 2)}:y=${posY}+${Math.floor(depth / 2)},`;
  }
  filter += `drawtext=${baseParams}:fontcolor=${fontColor}:x=${posX}:y=${posY}`;
  if (activeRule.effects?.text_stroke) {
    const sCol = resolveColor(activeRule.effects.text_stroke.color || 'black');
    const sW = activeRule.effects.text_stroke.width || 2;
    filter += `:borderw=${sW}:bordercolor=${sCol}`;
  }
  return filter;
}

export function getPostProductionFilters(adnConfig: any, segmentLabel: string) {
  const isV2 = adnConfig.version === '2.0';

  if (isV2) {
    // --- ADN 2.0 FILTERS (Global + Segment Override) ---
    const globalFilters = adnConfig.composition?.global_filters || [];
    const segmentLogic = adnConfig.logic_segments?.[segmentLabel] || {};
    const segmentFilters = segmentLogic.visual_filters || [];
    
    // Combine global and segment filters
    const allFilters = [...globalFilters, ...segmentFilters];
    return allFilters.map((f: any) => {
      if (f.name === 'noise') {
        // Forzar sintaxis moderna para FFmpeg 6.1 (con enteros)
        const intensityStr = f.params?.match(/[\d.]+/)?.[0] || '5';
        const intensity = Math.floor(parseFloat(intensityStr) * 10) || 5;
        return `noise=alls=${intensity}:allf=t+u`;
      }
      return `${f.name}=${f.params}`;
    }).join(',');
  }

  // Para ADN v1.0, usar el global_fx del formato activo
  const gFx = adnConfig.global_fx || {};
  const sFx = (adnConfig.scenes_rules?.[segmentLabel] || adnConfig.scenes_rules?.default)?.visual_fx || {};
  const fx = { ...gFx, ...sFx };

  let filters: string[] = [];
  if (fx.sharpen) filters.push('unsharp=3:3:0.8:3:3:0.4');
  
  // Handle curves instead of colorGrade_lut
  if (fx.curves_preset && fx.curves_preset !== 'none') {
    filters.push(`curves=${fx.curves_preset}`);
  } else if (fx.curves_master) {
    filters.push(`curves=master='${fx.curves_master}'`);
  }
  
  if (fx.vignette_intensity > 0) filters.push(`vignette=PI*${fx.vignette_intensity}`);
  if (fx.grain_intensity > 0) filters.push(`noise=alls=${Math.floor(fx.grain_intensity * 10)}:allf=t+u`);

  return filters.join(',');
}
