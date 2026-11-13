import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getSystemVideoPalettes, resolveVideoBrandPalette } from '../brand-palettes';
import { generateAssFile, splitKineticPhrase, resolveAssFontDescriptor } from '../engine';
import { resolveCssFont } from '@/app/marketing/pages/build/components/SocialLivePreview';

describe('System Brand Palettes & FFmpeg ASS Colors', () => {
  it('debe listar únicamente marcas configuradas por el tutor en su perfil y branding de curso (sin styles globales)', () => {
    const profile = {
      brands: [
        {
          name: 'Mi Academia Digital',
          palette: { primary: '#FF1493', secondary: '#FFFFFF', accent: '#FFD700' }
        }
      ]
    };
    const course = {
      branding: {
        brandName: 'Curso Pro',
        primaryColor: '#00FA9A'
      }
    };

    const palettes = getSystemVideoPalettes(profile, course);
    expect(palettes.length).toBe(3);

    const adnPreset = palettes.find(p => p.id === 'adn');
    expect(adnPreset).toBeDefined();
    expect(adnPreset?.name).toContain('ADN Original');

    const tutorBrand = palettes.find(p => p.id.includes('mi_academia_digital'));
    expect(tutorBrand).toBeDefined();
    expect(tutorBrand?.primary).toBe('#FF1493');

    const courseBrand = palettes.find(p => p.id === 'course-branding');
    expect(courseBrand).toBeDefined();
    expect(courseBrand?.primary).toBe('#00FA9A');

    const classicBrand = palettes.find(p => p.id.includes('sys-classic'));
    expect(classicBrand).toBeUndefined();
  });

  it('debe resolver paletas correctamente por id o coincidencia con las marcas del tutor', () => {
    const profile = {
      brands: [
        {
          name: 'Tutor Brand',
          palette: { primary: '#9400D3', secondary: '#F8F8FF', accent: '#00FFFF' }
        }
      ]
    };

    const resolvedTutor = resolveVideoBrandPalette('tutor-tutor_brand', null, profile);
    expect(resolvedTutor).toBeDefined();
    expect(resolvedTutor?.primary).toBe('#9400D3');

    const customBrand = resolveVideoBrandPalette('custom', { primary: '#123456' });
    expect(customBrand).toBeDefined();
    expect(customBrand?.primary).toBe('#123456');
  });

  it('debe inyectar códigos ASS directos (\\1c y \\3c) y formatear énfasis cinético (*palabra*) con el color de acento', () => {
    const mockAdn = {
      version: '2.0',
      typography_engine: {
        segment_styles: {
          GANCHO: {
            text: {
              fontName: 'Inter-Black.ttf',
              fontSize: 90,
              primaryColor: '#FFFFFF',
              box: true
            },
            outline: {
              color: '#FFD700',
              width: 3
            }
          }
        }
      }
    };

    const brandColors = {
      primary: '#FF1493', // Deep Pink -> BGR: 93 14 FF (&H9314FF&)
      secondary: '#FFFFFF',
      accent: '#00FFFF',  // Cyan -> BGR: FF FF 00 (&HFFFF00&)
      outline: '#10B981'  // BGR: 81 B9 10 (&H81B910&)
    };

    const assContent = generateAssFile(
      mockAdn,
      'GANCHO',
      'Aprende a *VENDER* rapido',
      'Subtitulo con *IMPACTO*',
      'Watermark',
      5,
      1080,
      1920,
      brandColors
    );

    // 1. Debe incluir color base de la marca
    expect(assContent).toContain('\\1c&H9314FF&');

    // 2. Énfasis cinético: palabra VENDER coloreada en color de acento Cyan (&HFFFF00&) y luego volviendo a base
    expect(assContent).toContain('\\1c&HFFFF00&');
    expect(assContent).toContain('VENDER');

    // 3. Subtítulo con IMPACTO también formateado
    expect(assContent).toContain('IMPACTO');
  });

  it('debe configurar BorderStyle=3 (Opaque Box / Pill) cuando el ADN tenga badge o box activo', () => {
    const mockAdnWithBadge = {
      version: '2.0',
      typography_engine: {
        segment_styles: {
          GANCHO: {
            text: {
              fontName: 'Inter-Black.ttf',
              fontSize: 90,
              badge: {
                enabled: true,
                style: 'pill',
                color: '#000000',
                alpha: 0.7,
                padding: 10
              }
            }
          }
        }
      }
    };

    const assContent = generateAssFile(
      mockAdnWithBadge,
      'GANCHO',
      'Texto con fondo de contraste',
      '',
      '',
      5,
      1080,
      1920,
      null
    );

    // En el estilo Title debe tener BorderStyle=3
    expect(assContent).toMatch(/Style: Title,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,3,/);
  });

  it('todos los ADNs oficiales en public/adns deben apuntar a fuentes TTF que existan físicamente', () => {
    const adnsDir = path.join(process.cwd(), 'public', 'adns');
    const fontsDir = path.join(process.cwd(), 'public', 'fonts');

    const adnDirs = ['01_CINEMA', '02_LUXURYGO', '03_CORPORAT', '04_GAMINGGL', '05_MINIMALD', '06_FASTCUT', '07_VINTAGEV'];

    for (const adnId of adnDirs) {
      const typPath = path.join(adnsDir, adnId, 'typography.json');
      expect(fs.existsSync(typPath)).toBe(true);

      const json = JSON.parse(fs.readFileSync(typPath, 'utf8'));
      const gancho = json.segment_styles?.GANCHO || json.segment_styles?.VALOR;
      expect(gancho).toBeDefined();

      const fontName = gancho.text?.fontName;
      expect(fontName).toBeDefined();

      const fontFile = path.join(fontsDir, fontName);
      expect(fs.existsSync(fontFile)).toBe(true);
    }
  });

  it('debe dividir frases en micro-bloques cinéticos para Reels/TikTok por salto de línea, doble asterisco o ritmo temporal', () => {
    // 1. Frase de 1 sola palabra o escena ultra-corta (< 2.5s): 1 solo bloque
    const singleWord = splitKineticPhrase('¡Bienvenidos!', 5);
    expect(singleWord.length).toBe(1);
    expect(singleWord[0].start).toBe(0);
    expect(singleWord[0].end).toBe(5);

    const fastScene = splitKineticPhrase('Esta es una frase', 2.0);
    expect(fastScene.length).toBe(1);

    // 2. Frase con 2 palabras a resaltar (*palabra1* ... *palabra2*): debe dividirse exactamente entre ambas
    const dualEmphasis = splitKineticPhrase('Aprende a *FACTURAR* el *DOBLE* cada mes', 5);
    expect(dualEmphasis.length).toBe(2);
    expect(dualEmphasis[0].text).toContain('*FACTURAR*');
    expect(dualEmphasis[1].text).toContain('*DOBLE*');
    expect(dualEmphasis[1].isSecondBlock).toBe(true);

    // 3. Frase con salto de línea explícito (\n)
    const newlinePhrase = splitKineticPhrase('Atención emprendedor:\n*EMPIEZA HOY*', 4);
    expect(newlinePhrase.length).toBe(2);
    expect(newlinePhrase[0].text).toBe('Atención emprendedor:');
    expect(newlinePhrase[1].text).toBe('*EMPIEZA HOY*');

    // 4. Frase de varias palabras en escena de 5s
    const longPhrase = splitKineticPhrase('Descubre cómo triplicar tus ventas este mes', 5);
    expect(longPhrase.length).toBe(2);
    expect(longPhrase[0].end).toBe(longPhrase[1].start);
  });

  it('generateAssFile debe renderizar múltiples líneas Dialogue cuando el título califica para micro-bloques cinéticos', () => {
    const mockAdn = {
      version: '2.0',
      typography_engine: {
        segment_styles: {
          GANCHO: {
            text: { fontName: 'Inter-Black.ttf', fontSize: 80, primaryColor: '#FFFFFF' }
          }
        }
      }
    };

    const ass = generateAssFile(
      mockAdn,
      'GANCHO',
      'Descubre cómo triplicar ventas con este *MÉTODO PRO*',
      'Subtítulo',
      '',
      5,
      1080,
      1920,
      { primary: '#FFFFFF', accent: '#FFD700' }
    );

    // Debe contener al menos 2 eventos Dialogue de Title
    const titleDialogues = ass.split('\n').filter(line => line.startsWith('Dialogue:') && line.includes(',Title,'));
    expect(titleDialogues.length).toBe(2);

    // El segundo bloque debe arrancar después de 0 y terminar en 5s con kinetic pop
    expect(titleDialogues[1]).toMatch(/Dialogue: 0,0:00:0[1-3]\.[0-9]{2},0:00:05\.00,Title,/);
    expect(titleDialogues[1]).toContain('fscx92');
  });

  it('todos los ADNs oficiales deben tener transiciones xfade válidas y optimizadas en motion.json', () => {
    const VALID_XFADES = new Set([
      'fade', 'wipeleft', 'wiperight', 'wipeup', 'wipedown',
      'slideleft', 'slideright', 'slideup', 'slidedown',
      'circlecrop', 'rectcrop', 'distance', 'fadeblack', 'fadewhite',
      'radial', 'smoothleft', 'smoothright', 'smoothup', 'smoothdown',
      'circleopen', 'circleclose', 'vertopen', 'vertclose',
      'horzopen', 'horzclose', 'dissolve', 'pixelize',
      'diagtl', 'diagtr', 'diagbl', 'diagbr', 'hlslice', 'hrslice', 'vuslice', 'vdslice'
    ]);

    const adnsDir = path.join(process.cwd(), 'public', 'adns');
    const adnDirs = ['01_CINEMA', '02_LUXURYGO', '03_CORPORAT', '04_GAMINGGL', '05_MINIMALD', '06_FASTCUT', '07_VINTAGEV'];

    for (const adnId of adnDirs) {
      const motionPath = path.join(adnsDir, adnId, 'motion.json');
      expect(fs.existsSync(motionPath)).toBe(true);

      const motion = JSON.parse(fs.readFileSync(motionPath, 'utf8'));
      expect(motion.transitions).toBeDefined();

      const defTrans = motion.transitions.default?.replace('xfade:', '');
      expect(VALID_XFADES.has(defTrans)).toBe(true);
      expect(motion.transitions.duration).toBeGreaterThan(0.1);
      expect(motion.transitions.duration).toBeLessThanOrEqual(1.5);

      if (motion.camera?.segment_rules) {
        for (const [seg, rule] of Object.entries<any>(motion.camera.segment_rules)) {
          if (rule.transition) {
            const segTrans = rule.transition.replace('xfade:', '');
            expect(VALID_XFADES.has(segTrans)).toBe(true);
          }
        }
      }
    }
  });

  it('resolveAssFontDescriptor debe mapear archivos TTF a familias y pesos reales para libass (sin colapsar a Arial o Inter Regular)', () => {
    // 1. Cinema: Inter-Black.ttf -> familia 'Inter Black' con bold=0 (el archivo ya es Black)
    const cinema = resolveAssFontDescriptor('Inter-Black.ttf');
    expect(cinema.fontName).toBe('Inter Black');
    expect(cinema.bold).toBe(0);

    // 2. Luxury: georgia.ttf -> 'Georgia'
    const luxury = resolveAssFontDescriptor('georgia.ttf');
    expect(luxury.fontName).toBe('Georgia');

    // 3. Gaming: trebucbd.ttf -> 'Trebuchet MS' con bold=1
    const gaming = resolveAssFontDescriptor('trebucbd.ttf');
    expect(gaming.fontName).toBe('Trebuchet MS');
    expect(gaming.bold).toBe(1);

    // 4. FastCut: impact.ttf -> 'Impact'
    const fastcut = resolveAssFontDescriptor('impact.ttf');
    expect(fastcut.fontName).toBe('Impact');

    // 5. Vintage: arialbd.ttf -> 'Arial' con bold=1
    const vintage = resolveAssFontDescriptor('arialbd.ttf');
    expect(vintage.fontName).toBe('Arial');
    expect(vintage.bold).toBe(1);
  });

  it('generateAssFile debe inyectar la familia tipográfica real en Style: Title para cada ADN modular', () => {
    const makeAdn = (fontName: string) => ({
      version: '2.0',
      typography_engine: {
        segment_styles: {
          GANCHO: {
            text: { fontName, fontSize: 90, primaryColor: '#FFFFFF' }
          }
        }
      }
    });

    // Luxury debe escribir Georgia en la cabecera ASS
    const assLuxury = generateAssFile(makeAdn('georgia.ttf'), 'GANCHO', 'Texto de lujo', '', '', 5, 1080, 1920, null);
    expect(assLuxury).toContain('Style: Title,Georgia,90,');

    // FastCut debe escribir Impact en la cabecera ASS
    const assFast = generateAssFile(makeAdn('impact.ttf'), 'GANCHO', 'Texto rapido', '', '', 5, 1080, 1920, null);
    expect(assFast).toContain('Style: Title,Impact,90,');

    // Gaming debe escribir Trebuchet MS con Bold=1
    const assGaming = generateAssFile(makeAdn('trebucbd.ttf'), 'GANCHO', 'Nivel experto', '', '', 5, 1080, 1920, null);
    expect(assGaming).toMatch(/Style: Title,Trebuchet MS,90,[^,]+,[^,]+,[^,]+,[^,]+,1,/);
  });

  it('resolveCssFont debe mapear tipografías a familias y pesos CSS distintivos para la vista previa en vivo', () => {
    const luxuryCss = resolveCssFont('georgia.ttf');
    expect(luxuryCss.fontFamily).toContain('Georgia');
    expect(luxuryCss.fontFamily).toContain('serif');

    const fastCutCss = resolveCssFont('impact.ttf');
    expect(fastCutCss.fontFamily).toContain('Impact');
    expect(fastCutCss.fontWeight).toBe('900');

    const gamingCss = resolveCssFont('trebucbd.ttf');
    expect(gamingCss.fontFamily).toContain('Trebuchet MS');

    const cinemaCss = resolveCssFont('Inter-Black.ttf');
    expect(cinemaCss.fontWeight).toBe('900');

    const bebasCss = resolveCssFont('BebasNeue-Regular.ttf');
    expect(bebasCss.fontFamily).toContain('Bebas Neue');

    const montserratCss = resolveCssFont('Montserrat.ttf');
    expect(montserratCss.fontFamily).toContain('Montserrat');
    expect(montserratCss.fontWeight).toBe('900');
  });

  it('todos los 9 ADNs oficiales deben existir y tener typography.json con profundidad 3D', () => {
    const adnsDir = path.join(process.cwd(), 'public', 'adns');
    const adnDirs = ['01_CINEMA', '02_LUXURYGO', '03_CORPORAT', '04_GAMINGGL', '05_MINIMALD', '06_FASTCUT', '07_VINTAGEV', '08_BOLDREELS', '09_TITANPRO'];

    for (const adnId of adnDirs) {
      const typPath = path.join(adnsDir, adnId, 'typography.json');
      expect(fs.existsSync(typPath)).toBe(true);
      const typData = JSON.parse(fs.readFileSync(typPath, 'utf-8'));
      const ganchoText = typData.segment_styles?.GANCHO?.text;
      expect(ganchoText).toBeDefined();
      expect(ganchoText.shadow.depth).toBeGreaterThanOrEqual(4);
    }
  });

  it('debe existir el archivo SFX de transicion whoosh.mp3 para xfade', () => {
    const sfxPath = path.join(process.cwd(), 'public', 'audio', 'sfx', 'whoosh.mp3');
    expect(fs.existsSync(sfxPath)).toBe(true);
    const stat = fs.statSync(sfxPath);
    expect(stat.size).toBeGreaterThan(1000);
  });
});
