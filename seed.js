const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

// Hardcoded styles from landing-styles.ts for the seed
const styles = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'El estilo original, balanceado y profesional',
    thumbnail: '/styles/classic-thumb.png',
    allowedSubscriptions: ['free', 'pro', 'premium'],
    layout: 'centered',
    componentStyle: 'borders',
    typography: [
      { name: 'Moderna', headingScale: 1.1, bodyScale: 1, headingFont: 'Inter', bodyFont: 'Inter' },
      { name: 'Elegante', headingScale: 1.2, bodyScale: 1, headingFont: 'Playfair Display', bodyFont: 'Lora' },
      { name: 'Audaz', headingScale: 1.15, bodyScale: 1.05, headingFont: 'Montserrat', bodyFont: 'Open Sans' },
      { name: 'Geométrica', headingScale: 1.0, bodyScale: 0.95, headingFont: 'Poppins', bodyFont: 'Roboto' },
      { name: 'Creativa', headingScale: 1.2, bodyScale: 1.1, headingFont: 'Outfit', bodyFont: 'Nunito' }
    ],
    spacing: 'balanced',
    animations: 'minimal',
    availableSections: [
      { id: 'heroVideo', name: 'Video Principal', description: 'Redacta un titular impactante y persuasivo que ataque el mayor dolor del cliente, seguido de un texto secundario que presente la solución como la única opción lógica. La llamada a la acción debe ser imperativa y enfocada al beneficio inmediato.', blueprint: 'Diseño en 2 columnas (Split). Izquierda: Título grande, subtítulo y Botón CTA primario. Derecha: Contenedor de Video (aspect-video) con sombra definida. Fondo: Color primario del estilo.', required: true, isRepeatable: false, contentType: 'video' },
      { id: 'narrativeSections', name: 'Secciones Narrativas', description: 'Redacta un texto persuasivo usando el esquema problema-agitación-solución. Empatiza profundamente con la frustración del usuario, hazle sentir que entiendes su situación, y luego presenta el curso como el puente hacia la transformación deseada.', blueprint: 'Diseño de ancho completo (Full-width), centrado. Texto contenido en un bloque estrecho para máxima legibilidad. Sin imágenes, solo tipografía destacada sobre fondo secundario o blanco puro.', required: true, isRepeatable: true, contentType: 'text' },
      { id: 'syllabus', name: 'Temario', description: 'Describe de qué trata cada etapa del programa formativo. Enfócate exclusivamente en el resultado o habilidad clave que el estudiante dominará en cada módulo, evitando ser demasiado técnico. Haz que cada módulo suene indispensable.', blueprint: 'Lista de acordeones interactivos (Collapsibles). Cada módulo tiene un título visible, y al expandir se revela el detalle y los iconos de check. Fondo blanco.', required: false, isRepeatable: false, contentType: 'text' },
      { id: 'benefits', name: 'Beneficios', description: 'Enumera ventajas emocionales y tangibles del programa. No hables de características técnicas, habla de la libertad, el crecimiento, la seguridad o el estatus que el estudiante obtendrá al lograr el objetivo. Sé directo y contundente.', blueprint: 'Grilla de 3 columnas con tarjetas (Cards). Cada tarjeta tiene fondo blanco, borde sutil, un ícono centrado en la parte superior, título en negrita y 2-3 líneas de texto.', required: false, isRepeatable: false, contentType: 'text' },
      { id: 'mentorProfile', name: 'Perfil del Mentor', description: 'Redacta la historia del mentor destacando su autoridad y cercanía. Habla de sus obstáculos superados para demostrar vulnerabilidad y conéctalos con sus grandes logros profesionales para construir confianza ciega en su método.', blueprint: 'Diseño asimétrico. Izquierda: Imagen del mentor circular o recortada. Derecha: Bloque de texto biográfico, insignias de autoridad y firma simulada al final. Fondo secundario.', required: false, isRepeatable: false, contentType: 'mixed' },
      { id: 'faqs', name: 'Preguntas Frecuentes', description: 'Anticipa las principales objeciones de compra (falta de tiempo, dinero, edad, conocimientos previos) y redacta respuestas que derriben estas creencias limitantes con lógica y empatía.', blueprint: 'Lista de tarjetas tipo bloque vertical. Título de la pregunta destacado en negrita. Respuesta debajo. Estilo minimalista con líneas separadoras en lugar de cajas cerradas.', required: false, isRepeatable: false, contentType: 'text' },
      { id: 'countdownTimer', name: 'Cuenta Regresiva', description: 'Genera urgencia real para motivar la inscripción inmediata apelando a la exclusividad o a una oportunidad por tiempo limitado.', blueprint: 'Barra fija o banner de alto impacto visual. Fondo de color acento (Accent). Texto urgente a la izquierda, reloj numérico (Días:Horas:Min:Seg) a la derecha con cajas separadas para cada dígito.', required: false, isRepeatable: false, contentType: 'interactive' },
      { id: 'bonuses', name: 'Bonuses', description: 'Describe recompensas adicionales que eliminen dudas finales. Redacta el valor de cada regalo y cómo actúa como acelerador o seguro de éxito para el programa principal.', blueprint: 'Tarjetas destacadas tipo "Regalo". Fondo oscuro o gradiente sutil. Mockup del recurso (imagen 3D o cover) a la izquierda, nombre del bono, descripción y su valor comercial tachado a la derecha.', required: false, isRepeatable: true, contentType: 'text' },
      { id: 'guarantee', name: 'Garantía', description: 'Redacta una promesa de total eliminación de riesgo. Trasmite certeza absoluta en la calidad del programa invitando a probarlo sin compromiso.', blueprint: 'Caja contenedora con estilo "Certificado". Borde resaltado, ícono de sello de garantía grande en el centro, y texto prometedor rodeándolo. Se debe percibir máxima seguridad.', required: false, isRepeatable: false, contentType: 'text' },
      { id: 'testimonials', name: 'Testimonios', description: 'Redacta historias de transformación de clientes que pasaron del punto de frustración al éxito gracias al método enseñado.', blueprint: 'Grilla masonry o carrusel horizontal. Tarjetas de opinión (Speech bubbles) con estrellas doradas arriba, foto miniatura del cliente, nombre, y la reseña en formato de cita.', required: false, isRepeatable: false, contentType: 'mixed' },
    ],
    defaultVisibility: { heroVideo: true, narrativeSections: true, syllabus: true, benefits: true, mentorProfile: true, faqs: true, countdownTimer: false, bonuses: false, guarantee: false, testimonials: false },
    colorProposals: [
      { name: 'Océano', primary: '#1E40AF', secondary: '#F1F5F9', accent: '#F59E0B' },
      { name: 'Corporativo', primary: '#3B2D86', secondary: '#F8FAFC', accent: '#FACC15' },
      { name: 'Bosque', primary: '#065F46', secondary: '#ECFDF5', accent: '#10B981' },
      { name: 'Monocromo', primary: '#18181B', secondary: '#FAFAFA', accent: '#A1A1AA' },
      { name: 'Púrpura Vibrante', primary: '#7C3AED', secondary: '#F5F3FF', accent: '#D946EF' }
    ],
    aiDirectives: 'Tu objetivo es convertir visitantes en compradores. Utiliza copywriting persuasivo (fórmulas PAS o AIDA). Escribe siempre en segunda persona del singular ("tú"), manteniendo un tono profesional, empático y orientado a resultados concretos. Evita frases vacías; sé específico. NO incluyas directivas de diseño o tamaño en el texto generado.'
  },
  {
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
      { id: 'narrativeSections', name: 'Secciones Narrativas', description: 'Redacta con un tono de alta autoridad y elegancia. Presenta la solución no como un simple curso, sino como una mentoría transformadora.', blueprint: 'Texto en formato "Carta del Fundador". Bloque de texto estrecho, tipografía con alto contraste, firma caligráfica al final. Alineación izquierda con márgenes generosos (Airy).', required: true, isRepeatable: true, contentType: 'text' },
      { id: 'syllabus', name: 'Temario', description: 'Describe el plan de estudios como un recorrido exclusivo. Usa lenguaje sofisticado (ej. "Módulo de Maestría" en lugar de "Lección 1").', blueprint: 'Grilla sobria de 2 columnas. Títulos en oro o acento metálico sobre fondo oscuro. Sin cajas cerradas, solo separadores finos de línea.', required: false, isRepeatable: false, contentType: 'text' },
      { id: 'benefits', name: 'Beneficios', description: 'Enfócate en estatus, tiempo y acceso exclusivo. Los beneficios deben sonar como privilegios de unos pocos.', blueprint: 'Diseño vertical de texto amplio. Lista minimalista con íconos vectoriales delgados y elegantes (Outline).', required: false, isRepeatable: false, contentType: 'text' },
      { id: 'mentorProfile', name: 'Perfil del Mentor', description: 'Redacta la historia del mentor destacando su autoridad absoluta y su círculo de influencia. Menos vulnerabilidad, más prestigio y trayectoria intachable.', blueprint: 'Foto en blanco y negro a sangre (Full-width bleed) a un lado. Bloque de texto sofisticado al otro lado flotando levemente superpuesto.', required: false, isRepeatable: false, contentType: 'mixed' },
      { id: 'faqs', name: 'Preguntas Frecuentes', description: 'Contesta objeciones con firmeza y elegancia. Asume que el cliente tiene el dinero pero valora su tiempo.', blueprint: 'Acordeones de texto puro. Sin fondos ni bordes, solo texto que cambia sutilmente de opacidad al abrirse.', required: false, isRepeatable: false, contentType: 'text' },
      { id: 'countdownTimer', name: 'Cuenta Regresiva', description: 'Genera urgencia real para motivar la inscripción inmediata apelando a la exclusividad o a una oportunidad por tiempo limitado.', blueprint: 'Diseño sutil. Tipografía Serif pequeña pero contrastante. No usar colores chillones, mantener la elegancia.', required: false, isRepeatable: false, contentType: 'interactive' },
      { id: 'bonuses', name: 'Bonuses', description: 'Describe recompensas adicionales que eliminen dudas finales. Redacta el valor de cada regalo y cómo actúa como acelerador o seguro de éxito para el programa principal.', blueprint: 'Tarjetas oscuras con texto en dorado/plata. Efectos hover de brillo micro-animado.', required: false, isRepeatable: true, contentType: 'text' },
      { id: 'guarantee', name: 'Garantía', description: 'Redacta una promesa de total eliminación de riesgo. Trasmite certeza absoluta en la calidad del programa invitando a probarlo sin compromiso.', blueprint: 'Bloque de texto centrado. Ícono minimalista arriba. Texto formal y corto asegurando satisfacción.', required: false, isRepeatable: false, contentType: 'text' },
      { id: 'testimonials', name: 'Testimonios', description: 'Redacta historias de transformación de clientes que pasaron del punto de frustración al éxito gracias al método enseñado.', blueprint: 'Diseño asimétrico. Citas en tipografía Serif Itálica gigante. Nombre del cliente pequeño y elegante abajo. Sin fotos.', required: false, isRepeatable: false, contentType: 'mixed' },
    ],
    defaultVisibility: { heroVideo: true, narrativeSections: true, syllabus: true, benefits: true, mentorProfile: true, faqs: true, countdownTimer: false, bonuses: false, guarantee: false, testimonials: false },
    colorProposals: [
      { name: 'Oro y Ébano', primary: '#000000', secondary: '#FFFFFF', accent: '#D4AF37' },
      { name: 'Plata y Obsidiana', primary: '#1A1A1A', secondary: '#F3F4F6', accent: '#C0C0C0' },
      { name: 'Vino y Crema', primary: '#4A0E17', secondary: '#FFFDD0', accent: '#8B9A46' },
      { name: 'Zafiro y Nieve', primary: '#0F2C59', secondary: '#F8F9FA', accent: '#E8C872' },
      { name: 'Bronce Imperial', primary: '#2C1810', secondary: '#F5F5DC', accent: '#CD7F32' }
    ],
    aiDirectives: 'Eres un experto en ventas High-Ticket. Tono sofisticado, directo y persuasivo. Exclusividad ante todo.'
  }
];

async function seed() {
  const batch = db.batch();
  for (const style of styles) {
    const docRef = db.collection('landingStyles').doc(style.id);
    batch.set(docRef, { ...style, createdAt: new Date().toISOString() });
  }
  await batch.commit();
  console.log('Seeded successfully.');
}

seed().catch(console.error);
