'use client';

import { use } from 'react';
import { getLandingStyle } from '@/lib/landing-styles';
import { AtomicRenderer } from '@/app/v/[id]/components/atomic-renderer';

// ---------------------------------------------------------------------------
// Contenido de muestra fiel al tipo de sección que espera el AtomicRenderer.
// Cada sección se genera desde availableSections + defaultVisibility del estilo
// para que el preview sea una reproducción real de la landing V2.
// ---------------------------------------------------------------------------

const SAMPLE_SECTIONS: Record<string, () => any> = {
  heroVideo: () => ({
    badge: 'Cupo limitado · 40% restante',
    title: 'Lanza tu negocio online en 30 días',
    subtitle: 'Sin experiencia, sin audiencia, sin presupuesto en publicidad. El método paso a paso que usaron 4.200+ estudiantes para facturar sus primeros $1.000 con un producto digital.',
    micro: '4,9/5 · 2.847 reseñas · Garantía de 14 días',
    ctaText: 'Quiero empezar ahora',
    imageUrl: 'https://picsum.photos/seed/lanza-negocio/900/1200',
    timerNote: 'El precio vuelve al doble cuando el temporizador llega a cero.',
  }),
  narrativeSections: () => ({
    kicker: 'Tu semana a semana',
    title: '3 resultados concretos en los primeros 30 días',
    content: 'No es promesa, es método: cada semana cierra con una tarea accionable y un resultado medible.',
    bullets: [
      'Tu producto digital definido: validas qué vender, a quién y por cuánto.',
      'Tu página lista y publicada: copy, diseño y prueba social en un fin de semana.',
      'Tus primeros 3 clientes: aplicas el playbook de lanzamiento orgánico sin ads.',
    ],
  }),
  syllabus: () => ({
    kicker: 'El programa',
    title: '6 módulos · 30 días · todo el método',
    bullets: [
      '**El nicho que paga**: Encuentra un problema concreto que la gente ya paga por resolver.',
      '**Tu producto en un PDF**: Estructura tu guía o curso sin saber diseño ni producción.',
      '**Landing que convierte**: El patrón exacto de las páginas que más venden en el nicho.',
      '**Lanzamiento sin audiencia**: Comunidades, colaboraciones y contenido de demostración.',
      '**Cierre y cobro**: Checkout simple, seguimiento y entrega automática del acceso.',
      '**Escalar a $1.000/mes**: Retención, ventas recurrentes y tu primera palanca de ads.',
    ],
    tagLabel: 'Semana',
    ctaText: 'Ver el programa completo',
  }),
  benefits: () => ({
    title: 'Beneficios del Programa',
    bullets: ['Acceso de por vida al material', 'Comunidad privada exclusiva', 'Soporte directo con el mentor'],
    ctaText: 'Quiero Inscribirme Ahora',
  }),
  mentorProfile: () => ({
    title: 'Sobre tu Mentor',
    content: 'Más de 10 años ayudando a emprendedores a transformar sus ideas en negocios rentables. Aprendé de la experiencia real, sin teorías vacías.',
    ctaText: 'Conocer más',
  }),
  faqs: () => ({
    kicker: 'Preguntas frecuentes',
    title: 'Antes de que te lo preguntes, respondemos',
    bullets: [
      '¿Necesito tener audiencia o seguidores?No. El módulo 4 está diseñado exactamente para lanzar sin audiencia.',
      '¿Necesito saber de diseño o programación?Para nada. Recibes plantillas listas y el método para llenarlas.',
      '¿Cuánto tiempo necesito por semana?2 a 3 horas por semana, en bloques de 15-20 minutos.',
      '¿Y si no me convence?Tienes 14 días de garantía total. Te devolvemos el 100%, sin preguntas.',
    ],
  }),
  testimonials: () => ({
    kicker: 'Prueba social',
    title: 'Ellos ya lo hicieron. El siguiente eres tú.',
    bullets: [
      'Carolina M.:Empecé con 0 seguidores y mi primer cliente llegó el día 19. Vendí mi guía a $29 y no he parado.',
      'Andrés P.:Lo mejor es que no necesité diseño ni saber de marketing. Seguí las plantillas y la landing quedó espectacular.',
      'Valentina R.:En 30 días facturé $1.020 con un kit de recetas. La comunidad me corrigió la oferta en la semana 2.',
    ],
    avatars: [
      'https://picsum.photos/seed/alumna-1/200/200',
      'https://picsum.photos/seed/alumno-2/200/200',
      'https://picsum.photos/seed/alumna-3/200/200',
    ],
    roles: ['Guía de finanzas personales', 'Curso de Excel', 'Kit de recetas saludables'],
  }),
  bonuses: () => ({
    kicker: 'Solo por esta oferta',
    title: '3 bonos que suman $327 en valor',
    content: 'Gratis con tu inscripción de hoy, antes de que la oferta expire.',
    bullets: [
      '12 plantillas de landing: Copiar y pegar: secciones de alta conversión listas para tu nicho.',
      'Scripts de venta directa: Los mensajes palabra por palabra para tu primera ronda de clientes.',
      'Comunidad privada (1 año): Acceso al grupo de alumnos con feedback directo de tus lanzamientos.',
    ],
    images: [
      'https://picsum.photos/seed/bono-plantillas/800/500',
      'https://picsum.photos/seed/bono-scripts/800/500',
      'https://picsum.photos/seed/bono-comunidad/800/500',
    ],
    oldValues: ['$97', '$120', '$110'],
    newValues: ['$0 hoy', '$0 hoy', '$0 hoy'],
    ctaText: 'Quiero los bonus',
  }),
  offerBanner: () => ({
    title: 'Oferta relámpago · 48h',
  }),
  marquee: () => ({
    bullets: ['Sin audiencia previa', 'Sin inversión en ads', 'Resultados en 30 días', 'Certificado incluido', 'Cupos limitados', 'Garantía total', 'Acceso de por vida'],
  }),
  stats: () => ({
    kicker: 'Cifras que importan',
    title: 'Esto es lo que ya hacen nuestros alumnos',
    bullets: ['4.200+ Estudiantes activos', '$1,4M Facturado en conjunto', '1.150+ Negocios lanzados', '4,9/5 Calificación promedio'],
  }),
  guarantee: () => ({
    sealText: '14 días garantía total',
    title: 'Riesgo cero. Si no te convence, te devolvemos el 100%.',
    content: 'Entra al curso, aplica el método de la semana 1 y decide. Si sientes que no es para ti, escríbenos en los primeros 14 días y te devolvemos cada dólar, sin preguntas ni letra chica.',
    ctaText: 'Probar sin riesgo',
  }),
  countdownTimer: () => ({
    title: 'Hoy es el día en que empiezas tu negocio',
    content: 'Precio normal $197. Con el código de la oferta, hoy pagas menos de un tercio y te llevas los 3 bonos.',
    ctaText: 'Inscribirme por $67',
  }),
  footer: () => ({}),
};

function buildSections(style: any): any[] {
  if (!style?.availableSections) return [];
  const visible = style.availableSections.filter(
    (sec: any) => style.defaultVisibility?.[sec.id] || sec.required
  );
  return visible
    .map((sec: any, idx: number) => {
      const sample = SAMPLE_SECTIONS[sec.id]?.() || {};
      return { id: `${sec.id}_${idx}`, ...sample };
    });
}

export default function StylePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const style = getLandingStyle(id);

  if (!style) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="font-bold text-muted-foreground uppercase tracking-widest">Estilo no encontrado.</p>
      </div>
    );
  }

  const brand = style.brands?.[0];
  const primaryColor = brand?.palette?.primary || style.colorProposals?.[0]?.primary || '#3B2D86';
  const secondaryColor = brand?.palette?.secondary || style.colorProposals?.[0]?.secondary || '#F1F5F9';
  const accentColor = brand?.palette?.accent || style.colorProposals?.[0]?.accent || '#FACC15';
  const fontHeading = brand?.typography?.headingFont || style.typography?.[0]?.headingFont || 'Inter';
  const fontBody = brand?.typography?.bodyFont || style.typography?.[0]?.bodyFont || 'Inter';
  const styleTokens = brand?.tokens || style.tokens || {};

  const page = {
    styleId: style.id,
    landingType: 'promocion',
    price: 49990,
    activeUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    branding: { name: 'Mentor de Prueba' },
    content: {
      designTokens: {
        styleTokens,
        typography: brand?.typography || style.typography?.[0],
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
      },
      sections: buildSections(style),
    },
  };

  const mentorProfile = {
    displayName: 'Mentor de Prueba',
    profile: {
      bio: 'Mentor especializado en ayudar a emprendedores a alcanzar sus objetivos.',
      socials: { instagram: '#', linkedin: '#' },
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-warn text-warn font-bold text-center py-2 text-xs uppercase tracking-widest z-50 sticky top-0">
        MODO DE VISTA PREVIA (ESTILO: {style.name})
      </div>

      {/* Inyección de tipografía del estilo (igual que la landing real) */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=${fontHeading.replace(/\s+/g, '+')}&family=${fontBody.replace(/\s+/g, '+')}&display=swap');
        .font-headline { font-family: ${fontHeading}, sans-serif !important; }
        .font-body { font-family: ${fontBody}, sans-serif !important; }
      `}</style>

      <AtomicRenderer page={page} onPurchase={() => {}} mentorProfile={mentorProfile} />
    </div>
  );
}
