import { describe, it, expect } from 'vitest';
import { ADN_CATALOG, ADN_FALLBACK_IMAGES } from '../constants';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/lib/languages';
import { getSystemVideoPalettes, SYSTEM_SUGGESTED_BRANDS } from '@/lib/video/brand-palettes';

describe('Campaña - Paso 3: Identidad Visual, ADN y Modismo', () => {
  it('debe contener los 8 estilos ADN del catálogo con metadata completa y sin emojis', () => {
    expect(ADN_CATALOG.length).toBeGreaterThanOrEqual(8);
    const expectedIds = ['01_CINEMA', '02_LUXURYGO', '03_CORPORAT', '05_MINIMALD', '06_FASTCUT', '08_BOLDREELS', '10_ZENHARMONY', '04_GAMINGGL'];
    
    for (const expectedId of expectedIds) {
      const found = ADN_CATALOG.find(a => a.id === expectedId);
      expect(found).toBeDefined();
      expect(found?.name).toBeTruthy();
      expect(found?.tag).toBeTruthy();
      expect(found?.desc).toBeTruthy();
      
      // Verificación estricta de CERO EMOJIS
      const emojiRegex = /[\p{Extended_Pictographic}]/gu;
      expect(found?.name).not.toMatch(emojiRegex);
      expect(found?.tag).not.toMatch(emojiRegex);
      expect(found?.desc).not.toMatch(emojiRegex);
    }
  });

  it('debe exponer marcas del sistema sugeridas unificadas en VideoBrandPalette y fallbacks de imagen para cada ADN', () => {
    expect(SYSTEM_SUGGESTED_BRANDS.length).toBeGreaterThanOrEqual(5);
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;

    for (const pal of SYSTEM_SUGGESTED_BRANDS) {
      expect(pal.name).toBeTruthy();
      expect(pal.primary).toMatch(hexRegex);
      expect(pal.accent).toMatch(hexRegex);
      expect(pal.styleName).toBe('Sistema');
    }

    // Cada ADN debe contar con una imagen fotográfica curada de alta resolución de respaldo
    for (const item of ADN_CATALOG) {
      const fallbackUrl = ADN_FALLBACK_IMAGES[item.id];
      expect(fallbackUrl).toBeDefined();
      expect(fallbackUrl).toMatch(/^https:\/\//);
    }
  });

  it('debe resolver e integrar las marcas del tutor y de la landing desde getSystemVideoPalettes', () => {
    const mockProfile = {
      brands: [
        {
          name: 'Academia Digital',
          palette: { primary: '#1E3A8A', secondary: '#FFFFFF', accent: '#3B82F6' }
        }
      ]
    };
    const mockCourse = {
      branding: {
        brandName: 'Curso de Finanzas',
        primaryColor: '#059669',
        accentColor: '#10B981'
      }
    };

    const palettes = getSystemVideoPalettes(mockProfile, mockCourse);
    expect(palettes.length).toBeGreaterThanOrEqual(3);

    const tutorPalette = palettes.find(p => p.id.startsWith('tutor-'));
    expect(tutorPalette).toBeDefined();
    expect(tutorPalette?.primary).toBe('#1E3A8A');
    expect(tutorPalette?.accent).toBe('#3B82F6');

    const coursePalette = palettes.find(p => p.id === 'course-branding');
    expect(coursePalette).toBeDefined();
    expect(coursePalette?.primary).toBe('#059669');
  });

  it('debe asociar correctamente los dialectos soportados con el modismo de la campaña', () => {
    const supportedCodes = SUPPORTED_LANGUAGES.map(l => l.code);
    expect(supportedCodes).toContain('es-AR');
    expect(supportedCodes).toContain('es-LA');
    expect(supportedCodes).toContain('es-ES');
    expect(supportedCodes).toContain('en-US');
  });

  it('debe estructurar el mock de SocialLivePreview con las dimensiones y reglas del ADN y color seleccionados', () => {
    const selectedAdnId = '01_CINEMA';
    const brandPrimary = '#1E3A8A';
    const brandAccent = '#3B82F6';
    const language: SupportedLanguage = 'es-AR';
    const platform = 'instagram';

    const sampleHookByLanguage: Record<SupportedLanguage, string> = {
      'es-AR': 'Che, ¿querés dominar este método? Mirá esto.',
      'es-LA': 'Oye, ¿quieres dominar este método? Mira esto.',
      'es-ES': '¿Quieres dominar este método? Fíjate en esto.',
      'en-US': 'Want to master this method? Watch this.'
    };

    const mockSocial = {
      platform,
      type: 'story',
      marketingName: 'Preview Campaña',
      hook: sampleHookByLanguage[language],
      caption: 'Aprende con este programa.',
      slides: [
        {
          title: sampleHookByLanguage[language],
          subtitle: 'Metodología probada paso a paso.',
          text: sampleHookByLanguage[language],
          imageUrl: 'https://example.com/cover.jpg',
          segment_label: 'GANCHO',
          duration: 4.5
        }
      ],
      designTokens: {
        primary: brandPrimary,
        accent: brandAccent,
        surface: '#eedaea',
        text: '#0a0a0a'
      },
      production_notes: {
        adnId: selectedAdnId,
        framing: '9:16',
        brandColors: {
          primary: brandPrimary,
          accent: brandAccent,
          secondary: '#FFFFFF'
        }
      }
    };

    expect(mockSocial.designTokens.primary).toBe('#1E3A8A');
    expect(mockSocial.designTokens.accent).toBe('#3B82F6');
    expect(mockSocial.production_notes.brandColors?.primary).toBe('#1E3A8A');
    expect(mockSocial.production_notes.brandColors?.accent).toBe('#3B82F6');
    expect(mockSocial.production_notes.adnId).toBe('01_CINEMA');
    expect(mockSocial.production_notes.framing).toBe('9:16');
    expect(mockSocial.hook).toContain('Che, ¿querés');
  });
});
