import { LandingStyle, StyleBrand, StyleTokens, TypographyVariant, ColorPalette } from './types';

const dharmaBaseTokens: StyleTokens = {
  componentRadius: '0px',
  componentBorder: 'none',
  componentShadow: '0 20px 60px rgba(0,0,0,0.14)',
  componentBg: 'transparent',
  sectionPadding: '128px',
  contentGap: '24px',
  transitionDuration: '300ms',
  themeMode: 'dark',
  extraTokens: {
    buttonStyle: 'ghost',
    buttonRadius: '8px',
    ctaShadow: '0 0 30px rgba(168,85,247,0.35)',
    sectionBgAlternate: '#110E18',
    containerMaxWidth: '1180px',
    headingWeight: '600',
    headingLetterSpacing: '0em',
    gradientOverlay: 'none',
    overlayOpacity: '0.5',
    navbarHeight: '64px',
    countdownStyle: 'boxed',
  },
};

const dharmaTypography: TypographyVariant[] = [
  { name: 'Premium Serif', headingScale: 1.2, bodyScale: 1.1, headingFont: 'Outfit', bodyFont: 'Inter' },
  { name: 'Luxury Minimal', headingScale: 1.1, bodyScale: 1.0, headingFont: 'Cormorant Garamond', bodyFont: 'Montserrat' },
  { name: 'Modern Elite', headingScale: 1.25, bodyScale: 1.05, headingFont: 'Cinzel', bodyFont: 'Lato' },
  { name: 'Sleek Sans', headingScale: 1.15, bodyScale: 1.1, headingFont: 'Syne', bodyFont: 'DM Sans' },
  { name: 'Avant Garde', headingScale: 1.3, bodyScale: 1.0, headingFont: 'Playfair Display', bodyFont: 'Raleway' },
  { name: 'Modern Serif', headingScale: 1.22, bodyScale: 1.08, headingFont: 'Crimson Text', bodyFont: 'Inter' }
];

const dharmaColorProposals: ColorPalette[] = [
  { name: 'Oro y Ébano', primary: '#000000', secondary: '#FFFFFF', accent: '#D4AF37' },
  { name: 'Plata y Obsidiana', primary: '#1A1A1A', secondary: '#F3F4F6', accent: '#C0C0C0' },
  { name: 'Vino y Crema', primary: '#4A0E17', secondary: '#FFFDD0', accent: '#8B9A46' },
  { name: 'Zafiro y Nieve', primary: '#0F2C59', secondary: '#F8F9FA', accent: '#E8C872' },
  { name: 'Bronce Imperial', primary: '#2C1810', secondary: '#F5F5DC', accent: '#CD7F32' },
  { name: 'Ívory y Rubí', primary: '#3B0A21', secondary: '#FFFCF2', accent: '#DC2626' },
  { name: 'Topacio y Humo', primary: '#0F1E3A', secondary: '#F0F4F8', accent: '#0EA5E9' },
  { name: 'Esmeralda', primary: '#064E35', secondary: '#ECFDF0', accent: '#10B981' }
];

export const dharmaStyle: LandingStyle = {
  id: 'dharma',
  name: 'Dharma',
  description: 'Estilo Premium para ofertas High-Ticket',
  thumbnail: '/styles/dharma-thumb.svg',
  group: 'high-ticket',
  allowedSubscriptions: ['premium'],
  layout: 'grid',
  tokens: dharmaBaseTokens,
  typography: dharmaTypography,
  brands: [
    {
      name: 'Ébano y Oro',
      description: 'Elegante y exclusivo — para mentorías de alto nivel',
      tokens: {
        componentRadius: '0px',
        componentBorder: 'none',
        componentShadow: '0 20px 60px rgba(0,0,0,0.14)',
        componentBg: 'transparent',
        sectionPadding: '128px',
        contentGap: '24px',
        transitionDuration: '300ms',
        themeMode: 'dark',
      },
      typography: { name: 'Premium Serif', headingScale: 1.2, bodyScale: 1.1, headingFont: 'Outfit', bodyFont: 'Inter' },
      palette: { name: 'Oro y Ébano', primary: '#000000', secondary: '#FFFFFF', accent: '#D4AF37' }
    },
    {
      name: 'Plata y Obsidiana',
      description: 'Frío y preciso — para programas técnicos de élite',
      tokens: {
        componentRadius: '0px',
        componentBorder: '1px solid rgba(255,255,255,0.1)',
        componentShadow: '0 0 0 1px rgba(255,255,255,0.05)',
        componentBg: 'rgba(255,255,255,0.02)',
        sectionPadding: '112px',
        contentGap: '20px',
        transitionDuration: '200ms',
        themeMode: 'dark',
      },
      typography: { name: 'Luxury Minimal', headingScale: 1.1, bodyScale: 1.0, headingFont: 'Cormorant Garamond', bodyFont: 'Montserrat' },
      palette: { name: 'Plata y Obsidiana', primary: '#1A1A1A', secondary: '#F3F4F6', accent: '#C0C0C0' }
    },
    {
      name: 'Vino y Crema',
      description: 'Cálido y lujoso — para programas de transformación profunda',
      tokens: {
        componentRadius: '4px',
        componentBorder: '1px solid rgba(212,175,55,0.3)',
        componentShadow: '0 0 0 1px rgba(212,175,55,0.1), 0 20px 60px rgba(0,0,0,0.15)',
        componentBg: 'rgba(74,14,23,0.95)',
        sectionPadding: '128px',
        contentGap: '28px',
        transitionDuration: '400ms',
        themeMode: 'dark',
      },
      typography: { name: 'Avant Garde', headingScale: 1.3, bodyScale: 1.0, headingFont: 'Playfair Display', bodyFont: 'Raleway' },
      palette: { name: 'Vino y Crema', primary: '#4A0E17', secondary: '#FFFDD0', accent: '#8B9A46' }
    },
    {
      name: 'Rubí',
      description: 'Intenso y dramático — para ofertas con fuerte carga emocional',
      tokens: {
        componentRadius: '4px',
        componentBorder: '1px solid rgba(220,38,38,0.35)',
        componentShadow: '0 0 0 1px rgba(220,38,38,0.1), 0 24px 70px rgba(54,0,17,0.3)',
        componentBg: 'rgba(54,0,17,0.9)',
        sectionPadding: '120px',
        contentGap: '26px',
        transitionDuration: '350ms',
        themeMode: 'dark',
        extraTokens: {
          buttonStyle: 'outline', buttonRadius: '6px', ctaShadow: '0 0 30px rgba(220,38,38,0.4)',
          sectionBgAlternate: '#220410', containerMaxWidth: '1180px', headingWeight: '600',
          headingLetterSpacing: '0.01em', gradientOverlay: 'none', overlayOpacity: '0.5', navbarHeight: '64px', countdownStyle: 'boxed'
        },
      },
      typography: { name: 'Luxury Minimal', headingScale: 1.1, bodyScale: 1.0, headingFont: 'Cormorant Garamond', bodyFont: 'Montserrat' },
      palette: { name: 'Ívory y Rubí', primary: '#3B0A21', secondary: '#FFFCF2', accent: '#DC2626' }
    },
    {
      name: 'Topacio Tech',
      description: 'Futurista y preciso — para mentorías técnicas de alto rendimiento',
      tokens: {
        componentRadius: '8px',
        componentBorder: '1px solid rgba(14,165,233,0.3)',
        componentShadow: '0 0 0 1px rgba(14,165,233,0.08), 0 20px 60px rgba(0,0,0,0.2)',
        componentBg: 'rgba(15,30,58,0.95)',
        sectionPadding: '112px',
        contentGap: '22px',
        transitionDuration: '250ms',
        themeMode: 'dark',
        extraTokens: {
          buttonStyle: 'outline', buttonRadius: '8px', ctaShadow: '0 0 24px rgba(14,165,233,0.4)',
          sectionBgAlternate: '#0B1E3A', containerMaxWidth: '1180px', headingWeight: '600',
          headingLetterSpacing: '-0.01em', gradientOverlay: 'none', overlayOpacity: '0.5', navbarHeight: '64px', countdownStyle: 'boxed'
        },
      },
      typography: { name: 'Sleek Sans', headingScale: 1.15, bodyScale: 1.1, headingFont: 'Syne', bodyFont: 'DM Sans' },
      palette: { name: 'Topacio y Humo', primary: '#0F1E3A', secondary: '#F0F4F8', accent: '#0EA5E9' }
    },
    {
      name: 'Esmeralda',
      description: 'Cálido y premium — para programas de bienestar y transformación',
      tokens: {
        componentRadius: '6px',
        componentBorder: '1px solid rgba(16,185,129,0.25)',
        componentShadow: '0 0 0 1px rgba(16,185,129,0.1), 0 20px 60px rgba(0,0,0,0.18)',
        componentBg: 'rgba(6,78,53,0.95)',
        sectionPadding: '120px',
        contentGap: '24px',
        transitionDuration: '320ms',
        themeMode: 'dark',
        extraTokens: {
          buttonStyle: 'filled', buttonRadius: '8px', ctaShadow: '0 0 28px rgba(16,185,129,0.35)',
          sectionBgAlternate: '#043024', containerMaxWidth: '1180px', headingWeight: '600',
          headingLetterSpacing: '0em', gradientOverlay: 'none', overlayOpacity: '0.55', navbarHeight: '64px', countdownStyle: 'boxed'
        },
      },
      typography: { name: 'Modern Serif', headingScale: 1.22, bodyScale: 1.08, headingFont: 'Crimson Text', bodyFont: 'Inter' },
      palette: { name: 'Esmeralda', primary: '#064E35', secondary: '#ECFDF0', accent: '#10B981' }
    }
  ],
  availableSections: [
    { id: 'heroVideo', name: 'Video Principal', description: 'Redacta un mensaje elitista y sofisticado. El usuario debe sentir que está accediendo a un círculo exclusivo.', blueprint: 'Diseño ultra minimalista. Video centralizado enorme sin bordes, flotando sobre un fondo completamente negro o muy oscuro. Título centrado arriba en tipografía Serif elegante.', required: true, isRepeatable: false, contentType: 'video' },
    { id: 'narrativeSections', name: 'Secciones Narrativas', description: 'Redacta con un tono de alta autoridad y elegancia. Presenta la solución no como un simple curso, sino como una mentoría transformadora. OBLIGATORIO: Propón siempre exactamente 4 viñetas (bullets) al final, donde cada viñeta tenga un máximo estricto de 4 palabras.', blueprint: 'Texto en formato "Carta del Fundador". Bloque de texto estrecho, tipografía con alto contraste, firma caligráfica al final. Alineación izquierda con márgenes generosos (Airy).', required: true, isRepeatable: true, contentType: 'mixed' },
    { id: 'syllabus', name: 'Temario', description: 'Describe el plan de estudios como un recorrido exclusivo. Usa lenguaje sofisticado (ej. "Módulo de Maestría" en lugar de "Lección 1").', blueprint: 'Grilla sobria de 2 columnas. Títulos en oro o acento metálico sobre fondo oscuro. Sin cajas cerradas, solo separadores finos de línea.', required: false, isRepeatable: false, contentType: 'text' },
    { id: 'benefits', name: 'Beneficios', description: 'Enfócate en estatus, tiempo y acceso exclusivo. Los beneficios deben sonar como privilegios de unos pocos.', blueprint: 'Diseño vertical de texto amplio. Lista minimalista con íconos vectoriales delgados y elegantes (Outline).', required: false, isRepeatable: false, contentType: 'text' },
    { id: 'mentorProfile', name: 'Perfil del Mentor', description: 'Redacta la historia del mentor destacando su autoridad absoluta y su círculo de influencia. Menos vulnerabilidad, más prestigio y trayectoria intachable.', blueprint: 'Foto en blanco y negro a sangre (Full-width bleed) a un lado. Bloque de texto sofisticado al otro lado flotando levemente superpuesto.', required: false, isRepeatable: false, contentType: 'mixed' },
    { id: 'faqs', name: 'Preguntas Frecuentes', description: 'Contesta objeciones con firmeza y elegancia. Asume que el cliente tiene el dinero pero valora su tiempo.', blueprint: 'Acordeones de texto puro. Sin fondos ni bordes, solo texto que cambia sutilmente de opacidad al abrirse.', required: false, isRepeatable: false, contentType: 'text' },
    { id: 'countdownTimer', name: 'Cuenta Regresiva', description: 'Genera urgencia real para motivar la inscripción inmediata apelando a la exclusividad o a una oportunidad por tiempo limitado.', blueprint: 'Diseño sutil. Tipografía Serif pequeña pero contrastante. No usar colores chillones, mantener la elegancia.', required: false, isRepeatable: false, contentType: 'mixed' },
    { id: 'bonuses', name: 'Bonuses', description: 'Describe recompensas adicionales que eliminen dudas finales. OBLIGATORIO: Presenta cada bonus enfatizando su valor visual. Propón 2 a 4 viñetas cortas si hay detalles.', blueprint: 'Tarjetas oscuras con imagen (Mockup) a la izquierda y texto en dorado/plata a la derecha. Efectos hover de brillo micro-animado.', required: false, isRepeatable: true, contentType: 'mixed' },
    { id: 'guarantee', name: 'Garantía', description: 'Redacta una promesa de total eliminación de riesgo. Trasmite certeza absoluta en la calidad del programa invitando a probarlo sin compromiso.', blueprint: 'Bloque de texto centrado. Ícono minimalista arriba. Texto formal y corto asegurando satisfacción.', required: false, isRepeatable: false, contentType: 'text' },
    { id: 'testimonials', name: 'Testimonios', description: 'Redacta historias de transformación de clientes que pasaron del punto de frustración al éxito gracias al método enseñado.', blueprint: 'Diseño asimétrico. Citas en tipografía Serif Itálica gigante. Nombre del cliente pequeño y elegante abajo. Sin fotos.', required: false, isRepeatable: false, contentType: 'text' },
    { id: 'footer', name: 'Pie de Página', description: 'Redes sociales y disclaimer personalizado del tutor.', blueprint: 'Texto centrado, sutil y minimalista.', required: false, isRepeatable: false, contentType: 'text' },
  ],
  defaultVisibility: { heroVideo: true, narrativeSections: true, syllabus: true, benefits: true, mentorProfile: true, faqs: true, countdownTimer: false, bonuses: false, guarantee: false, testimonials: false, footer: true },
  colorProposals: dharmaColorProposals,
  aiDirectives: 'Eres un experto en ventas High-Ticket. Tono sofisticado, directo y persuasivo. Exclusividad ante todo.',
  aiWriterPersona: 'Copywriter High-Ticket. Escribe con autoridad, sofisticación y escasez. Presenta la oferta como un privilegio exclusivo en un tono elitista pero elegante, sin rogar por la venta.'
};
