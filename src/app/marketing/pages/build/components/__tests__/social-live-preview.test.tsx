import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SocialLivePreview, resolveCssFont } from '../SocialLivePreview';

describe('SocialLivePreview — Integridad de Tipografías y Colores de Presets', () => {
  const mockAdnTitanPro = {
    id: '09_TITANPRO',
    name: 'Titan Pro',
    typography_engine: {
      segment_styles: {
        GANCHO: {
          text: {
            fontName: 'BebasNeue-Regular.ttf',
            fontSize: 110,
            primaryColor: '#FFFFFF@1.0',
            bold: false,
            uppercase: true,
            accentColor: '#F59E0B'
          },
          subtitle: {
            fontName: 'Inter-SemiBold.ttf',
            fontSize: 44,
            primaryColor: '#F1F5F9@1.0',
            bold: false,
            italic: false
          }
        }
      }
    }
  };

  const mockAdnLuxury = {
    id: '02_LUXURYGO',
    name: 'Luxury Gold',
    typography_engine: {
      segment_styles: {
        GANCHO: {
          text: {
            fontName: 'georgia.ttf',
            fontSize: 88,
            primaryColor: '#FFD700@1.0',
            bold: true,
            uppercase: true,
            accentColor: '#D4AF37'
          },
          subtitle: {
            fontName: 'calibri.ttf',
            fontSize: 44,
            primaryColor: '#FEF08A@1.0',
            bold: false,
            italic: true
          }
        }
      }
    }
  };

  it('debe inyectar reglas @font-face enlazadas con los archivos TrueType locales en public/fonts/', () => {
    const social = {
      platform: 'instagram',
      type: 'story',
      hook: 'Texto de prueba',
      production_notes: { adnId: '09_TITANPRO', brandPaletteId: 'adn' }
    };

    const html = renderToStaticMarkup(
      <SocialLivePreview social={social} adn={mockAdnTitanPro} />
    );

    expect(html).toContain('@font-face');
    expect(html).toContain('/fonts/BebasNeue-Regular.ttf');
    expect(html).toContain('/fonts/Montserrat.ttf');
    expect(html).toContain('/fonts/impact.ttf');
    expect(html).toContain('/fonts/georgia.ttf');
    expect(html).toContain('/fonts/Inter-Black.ttf');
  });

  it('debe aplicar la tipografia fisica correcta segun el ADN activo en el titulo y subtitulo', () => {
    // 1. Titan Pro: Bebas Neue
    const socialTitan = {
      platform: 'instagram',
      type: 'story',
      hook: 'GANCHO IMPACTANTE',
      slides: [{ title: 'GANCHO IMPACTANTE', subtitle: 'Subtitulo explicativo', segment_label: 'GANCHO' }],
      production_notes: { adnId: '09_TITANPRO', brandPaletteId: 'adn' }
    };
    const htmlTitan = renderToStaticMarkup(
      <SocialLivePreview social={socialTitan} adn={mockAdnTitanPro} />
    );
    expect(htmlTitan).toContain('ADN-BebasNeue');
    expect(htmlTitan).toContain('Bebas Neue');

    // 2. Luxury Gold: Georgia en titulo y Calibri con font-style italic en subtitulo
    const socialLuxury = {
      platform: 'instagram',
      type: 'story',
      hook: 'TITULO DE LUJO',
      slides: [{ title: 'TITULO DE LUJO', subtitle: 'Elegancia pura', segment_label: 'GANCHO' }],
      production_notes: { adnId: '02_LUXURYGO', brandPaletteId: 'adn' }
    };
    const htmlLuxury = renderToStaticMarkup(
      <SocialLivePreview social={socialLuxury} adn={mockAdnLuxury} />
    );
    expect(htmlLuxury).toContain('ADN-Georgia');
    expect(htmlLuxury).toContain('ADN-Calibri');
    expect(htmlLuxury).toContain('font-style:italic');
  });

  it('debe limpiar sintaxis @alpha y aplicar colores nativos del ADN cuando brandPaletteId es "adn"', () => {
    const socialLuxury = {
      platform: 'instagram',
      type: 'story',
      hook: 'El verdadero *LUJO* es libertad',
      slides: [{ title: 'El verdadero *LUJO* es libertad', subtitle: 'Exclusividad garantizada', segment_label: 'GANCHO' }],
      production_notes: {
        adnId: '02_LUXURYGO',
        brandPaletteId: 'adn'
      }
    };

    const html = renderToStaticMarkup(
      <SocialLivePreview social={socialLuxury} adn={mockAdnLuxury} />
    );

    // El color primario #FFD700@1.0 debe quedar limpio como #FFD700 (sin @1.0 en el CSS)
    expect(html).toContain('color:#FFD700');
    expect(html).not.toContain('color:#FFD700@1.0');

    // El subtitulo #FEF08A@1.0 debe quedar limpio como #FEF08A
    expect(html).toContain('color:#FEF08A');
    expect(html).not.toContain('color:#FEF08A@1.0');

    // El acento en la palabra destacada *LUJO* debe tomar el acento nativo del ADN (#D4AF37)
    expect(html).toContain('color:#D4AF37');
  });

  it('debe aplicar la paleta del preset seleccionado del sistema (ej: sys-purple) a titulo, enfasis y boton', () => {
    const socialPreset = {
      platform: 'instagram',
      type: 'story',
      hook: 'Estrategia con *RESULTADOS* reales',
      slides: [{ title: 'Estrategia con *RESULTADOS* reales', subtitle: 'Metodologia probada', segment_label: 'GANCHO' }],
      production_notes: {
        adnId: '09_TITANPRO',
        brandPaletteId: 'sys-purple',
        brandColors: {
          name: 'Púrpura Imperial',
          primary: '#760464',
          secondary: '#eedaea',
          accent: '#A21CAF',
          outline: '#000000'
        }
      }
    };

    const html = renderToStaticMarkup(
      <SocialLivePreview social={socialPreset} adn={mockAdnTitanPro} />
    );

    // Titulo con color primario del preset
    expect(html).toContain('color:#760464');

    // Subtitulo con color secundario del preset
    expect(html).toContain('color:#eedaea');

    // Palabra enfatizada (*RESULTADOS*) con acento del preset
    expect(html).toContain('color:#A21CAF');

    // Boton inferior con color de acento o primario del preset
    expect(html).toContain('background-color:#A21CAF');
  });

  it('debe resolver paletas del sistema sugeridas aun si brandColors viene omitido en production_notes', () => {
    const socialNoColors = {
      platform: 'instagram',
      type: 'story',
      hook: 'Crecimiento *EXPONENCIAL* garantizado',
      slides: [{ title: 'Crecimiento *EXPONENCIAL* garantizado', subtitle: 'Aprende hoy', segment_label: 'GANCHO' }],
      production_notes: {
        adnId: '09_TITANPRO',
        brandPaletteId: 'sys-emerald'
      }
    };

    const html = renderToStaticMarkup(
      <SocialLivePreview social={socialNoColors} adn={mockAdnTitanPro} />
    );

    // Debe resolver sys-emerald: primary = #059669, accent = #10B981, secondary = #ECFDF5
    expect(html).toContain('color:#059669');
    expect(html).toContain('color:#10B981');
    expect(html).toContain('color:#ECFDF5');
  });
});
