import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AtomicRenderer } from '../../atomic-renderer';

describe('AtomicRenderer Component Integration', () => {
  const basePage = {
    id: 'landing-test-1',
    styleId: 'classic',
    title: 'Masterclass en Escala de Negocios',
    price: 15000,
    oldPrice: 45000,
    branding: {
      primaryColor: '#3B2D86',
      secondaryColor: '#F8FAFC',
      name: 'Academia Pro',
    },
    content: {
      sections: [
        {
          id: 'heroVideo_1',
          title: 'Aprende a Escalar tu Negocio',
          subtitle: 'Metodología probada paso a paso',
          ctaText: 'Inscribirme ahora',
          isVisible: true,
        },
        {
          id: 'benefits_1',
          title: '¿Por qué unirte?',
          bullets: ['Acceso ilimitado', 'Soporte 24/7', 'Certificado oficial'],
          isVisible: true,
        },
        {
          id: 'faqs_1',
          title: 'Preguntas Frecuentes',
          faqs: [{ question: '¿Tiene garantía?', answer: 'Sí, 15 días' }],
          isVisible: false, // Debe ser ignorada
        },
        {
          id: 'footer_1',
          title: 'Sobre la academia',
          content: 'Formando a los líderes del futuro',
          isVisible: true,
        },
      ],
    },
  };

  const mentorProfile = {
    displayName: 'Carlos Mentor',
    profile: {
      socials: {
        linkedin: 'https://linkedin.com/in/carlos',
        instagram: 'https://instagram.com/carlos',
      },
    },
  };

  it('debe renderizar sin errores y aplicar tokens en variables CSS', () => {
    const html = renderToStaticMarkup(
      <AtomicRenderer page={basePage} onPurchase={() => {}} mentorProfile={mentorProfile} />
    );

    expect(html).toContain('--primary:#3B2D86');
    expect(html).toContain('Aprende a Escalar tu Negocio');
    expect(html).toContain('Metodología probada paso a paso');
    expect(html).toContain('Inscribirme ahora');
  });

  it('debe filtrar secciones con isVisible === false', () => {
    const html = renderToStaticMarkup(
      <AtomicRenderer page={basePage} onPurchase={() => {}} mentorProfile={mentorProfile} />
    );

    // benefits_1 está visible
    expect(html).toContain('¿Por qué unirte?');
    expect(html).toContain('Acceso ilimitado');

    // faqs_1 tiene isVisible: false
    expect(html).not.toContain('Preguntas Frecuentes');
    expect(html).not.toContain('¿Tiene garantía?');
  });

  it('debe renderizar el footer con redes sociales y disclaimer legal', () => {
    const html = renderToStaticMarkup(
      <AtomicRenderer page={basePage} onPurchase={() => {}} mentorProfile={mentorProfile} />
    );

    expect(html).toContain('<footer');
    expect(html).toContain('Sobre la academia');
    expect(html).toContain('Carlos Mentor');
    expect(html).toContain('https://linkedin.com/in/carlos');
    expect(html).toContain('Este sitio no es parte del sitio web de Meta');
    expect(html).toContain('Entorno de Aprendizaje Seguro');
  });

  it('debe inyectar automaticamente la seccion bundleGrid cuando se pasan bundleProducts', () => {
    const bundleProducts = [
      { id: 'b1', title: 'Curso Avanzado de Ventas', price: 9000 },
      { id: 'b2', title: 'Plantillas de Automatización', price: 5000 },
    ];

    const html = renderToStaticMarkup(
      <AtomicRenderer
        page={basePage}
        onPurchase={() => {}}
        mentorProfile={mentorProfile}
        bundleProducts={bundleProducts}
      />
    );

    expect(html).toContain('Curso Avanzado de Ventas');
    expect(html).toContain('Plantillas de Automatización');
  });

  it('debe renderizar correctamente bajo el estilo flash-sale con sus clases exclusivas', () => {
    const flashSalePage = {
      ...basePage,
      styleId: 'flash-sale',
      activeUntil: new Date(Date.now() + 86400000).toISOString(),
    };

    const html = renderToStaticMarkup(
      <AtomicRenderer page={flashSalePage} onPurchase={() => {}} mentorProfile={mentorProfile} />
    );

    expect(html).toContain('od-fs-btn');
    expect(html).toContain('od-fs-heading');
  });
});

