import { LandingStyle } from './types';

export const dharmaStyle: LandingStyle = {
  id: 'dharma',
  name: 'Dharma',
  description: 'Estilo Premium para ofertas High-Ticket',
  thumbnail: '/styles/dharma-thumb.png',
  allowedSubscriptions: ['premium'],
  layout: 'grid',
  componentStyle: 'creative',
  typography: [
    { name: 'Premium Serif', headingScale: 1.2, bodyScale: 1.1, headingFont: 'Outfit', bodyFont: 'Inter' },
    { name: 'Luxury Minimal', headingScale: 1.1, bodyScale: 1.0, headingFont: 'Cormorant Garamond', bodyFont: 'Montserrat' },
    { name: 'Modern Elite', headingScale: 1.25, bodyScale: 1.05, headingFont: 'Cinzel', bodyFont: 'Lato' },
    { name: 'Sleek Sans', headingScale: 1.15, bodyScale: 1.1, headingFont: 'Syne', bodyFont: 'DM Sans' },
    { name: 'Avant Garde', headingScale: 1.3, bodyScale: 1.0, headingFont: 'Playfair Display', bodyFont: 'Raleway' }
  ],
  spacing: 'airy',
  animations: 'micro',
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
    { id: 'testimonials', name: 'Testimonios', description: 'Redacta historias de transformación de clientes que pasaron del punto de frustración al éxito gracias al método enseñado.', blueprint: 'Diseño asimétrico. Citas en tipografía Serif Itálica gigante. Nombre del cliente pequeño y elegante abajo. Sin fotos.', required: false, isRepeatable: false, contentType: 'mixed' },
    { id: 'footer', name: 'Pie de Página', description: 'Redes sociales y disclaimer personalizado del tutor.', blueprint: 'Texto centrado, sutil y minimalista.', required: false, isRepeatable: false, contentType: 'text' },
  ],
  defaultVisibility: { heroVideo: true, narrativeSections: true, syllabus: true, benefits: true, mentorProfile: true, faqs: true, countdownTimer: false, bonuses: false, guarantee: false, testimonials: false, footer: true },
  colorProposals: [
    { name: 'Oro y Ébano', primary: '#000000', secondary: '#FFFFFF', accent: '#D4AF37' },
    { name: 'Plata y Obsidiana', primary: '#1A1A1A', secondary: '#F3F4F6', accent: '#C0C0C0' },
    { name: 'Vino y Crema', primary: '#4A0E17', secondary: '#FFFDD0', accent: '#8B9A46' },
    { name: 'Zafiro y Nieve', primary: '#0F2C59', secondary: '#F8F9FA', accent: '#E8C872' },
    { name: 'Bronce Imperial', primary: '#2C1810', secondary: '#F5F5DC', accent: '#CD7F32' }
  ],
  aiDirectives: 'Eres un experto en ventas High-Ticket. Tono sofisticado, directo y persuasivo. Exclusividad ante todo.',
  aiWriterPersona: 'Copywriter High-Ticket. Escribe con autoridad, sofisticación y escasez. Presenta la oferta como un privilegio exclusivo en un tono elitista pero elegante, sin rogar por la venta.'
};
