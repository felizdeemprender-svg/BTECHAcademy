import { LandingStyle } from './types';

export const classicStyle: LandingStyle = {
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
    { id: 'narrativeSections', name: 'Secciones Narrativas', description: 'Redacta un texto persuasivo usando el esquema problema-agitación-solución. Empatiza profundamente con la frustración del usuario, hazle sentir que entiendes su situación, y luego presenta el curso como el puente hacia la transformación deseada. OBLIGATORIO: Propón siempre exactamente 4 viñetas (bullets) al final, donde cada viñeta tenga un máximo estricto de 4 palabras.', blueprint: 'Diseño de ancho completo (Full-width), centrado. Texto contenido en un bloque estrecho para máxima legibilidad. Sin imágenes, solo tipografía destacada sobre fondo secundario o blanco puro.', required: true, isRepeatable: true, contentType: 'text' },
    { id: 'syllabus', name: 'Temario', description: 'Describe de qué trata cada etapa del programa formativo. Enfócate exclusivamente en el resultado o habilidad clave que el estudiante dominará en cada módulo, evitando ser demasiado técnico. Haz que cada módulo suene indispensable.', blueprint: 'Lista de acordeones interactivos (Collapsibles). Cada módulo tiene un título visible, y al expandir se revela el detalle y los iconos de check. Fondo blanco.', required: false, isRepeatable: false, contentType: 'text' },
    { id: 'benefits', name: 'Beneficios', description: 'Enumera ventajas emocionales y tangibles del programa. No hables de características técnicas, habla de la libertad, el crecimiento, la seguridad o el estatus que el estudiante obtendrá al lograr el objetivo. Sé directo y contundente.', blueprint: 'Grilla de 3 columnas con tarjetas (Cards). Cada tarjeta tiene fondo blanco, borde sutil, un ícono centrado en la parte superior, título en negrita y 2-3 líneas de texto.', required: false, isRepeatable: false, contentType: 'text' },
    { id: 'mentorProfile', name: 'Perfil del Mentor', description: 'Redacta la historia del mentor destacando su autoridad y cercanía. Habla de sus obstáculos superados para demostrar vulnerabilidad y conéctalos con sus grandes logros profesionales para construir confianza ciega en su método.', blueprint: 'Diseño asimétrico. Izquierda: Imagen del mentor circular o recortada. Derecha: Bloque de texto biográfico, insignias de autoridad y firma simulada al final. Fondo secundario.', required: false, isRepeatable: false, contentType: 'mixed' },
    { id: 'faqs', name: 'Preguntas Frecuentes', description: 'Anticipa las principales objeciones de compra (falta de tiempo, dinero, edad, conocimientos previos) y redacta respuestas que derriben estas creencias limitantes con lógica y empatía.', blueprint: 'Lista de tarjetas tipo bloque vertical. Título de la pregunta destacado en negrita. Respuesta debajo. Estilo minimalista con líneas separadoras en lugar de cajas cerradas.', required: false, isRepeatable: false, contentType: 'text' },
    { id: 'countdownTimer', name: 'Cuenta Regresiva', description: 'Genera urgencia real para motivar la inscripción inmediata apelando a la exclusividad o a una oportunidad por tiempo limitado.', blueprint: 'Barra fija o banner de alto impacto visual. Fondo de color acento (Accent). Texto urgente a la izquierda, reloj numérico (Días:Horas:Min:Seg) a la derecha con cajas separadas para cada dígito.', required: false, isRepeatable: false, contentType: 'mixed' },
    { id: 'bonuses', name: 'Bonuses', description: 'Describe recompensas adicionales que eliminen dudas finales. OBLIGATORIO: Presenta cada bonus enfatizando su valor visual. Propón 2 a 4 viñetas cortas si hay detalles.', blueprint: 'Tarjetas destacadas tipo "Regalo". Fondo oscuro o gradiente sutil. Mockup del recurso (imagen 3D o cover) a la izquierda, nombre del bono, descripción y su valor comercial tachado a la derecha.', required: false, isRepeatable: true, contentType: 'mixed' },
    { id: 'guarantee', name: 'Garantía', description: 'Redacta una promesa de total eliminación de riesgo. Trasmite certeza absoluta en la calidad del programa invitando a probarlo sin compromiso.', blueprint: 'Caja contenedora con estilo "Certificado". Borde resaltado, ícono de sello de garantía grande en el centro, y texto prometedor rodeándolo. Se debe percibir máxima seguridad.', required: false, isRepeatable: false, contentType: 'text' },
    { id: 'testimonials', name: 'Testimonios', description: 'Redacta historias de transformación de clientes que pasaron del punto de frustración al éxito gracias al método enseñado.', blueprint: 'Grilla masonry o carrusel horizontal. Tarjetas de opinión (Speech bubbles) con estrellas doradas arriba, foto miniatura del cliente, nombre, y la reseña en formato de cita.', required: false, isRepeatable: false, contentType: 'mixed' },
    { id: 'footer', name: 'Pie de Página', description: 'Redes sociales y disclaimer personalizado del tutor.', blueprint: 'Texto centrado, sutil y minimalista.', required: false, isRepeatable: false, contentType: 'text' },
  ],
  defaultVisibility: {
    heroVideo: true,
    narrativeSections: true,
    syllabus: true,
    benefits: true,
    mentorProfile: true,
    faqs: true,
    countdownTimer: false,
    bonuses: false,
    guarantee: false,
    testimonials: false,
    footer: true,
  },
  colorProposals: [
    { name: 'Océano', primary: '#1E40AF', secondary: '#F1F5F9', accent: '#F59E0B' },
    { name: 'Corporativo', primary: '#3B2D86', secondary: '#F8FAFC', accent: '#FACC15' },
    { name: 'Bosque', primary: '#065F46', secondary: '#ECFDF5', accent: '#10B981' },
    { name: 'Monocromo', primary: '#18181B', secondary: '#FAFAFA', accent: '#A1A1AA' },
    { name: 'Púrpura Vibrante', primary: '#7C3AED', secondary: '#F5F3FF', accent: '#D946EF' }
  ],
  aiDirectives: 'Tu objetivo es convertir visitantes en compradores. Utiliza copywriting persuasivo y estructurado (fórmulas PAS o AIDA). Dirígete al lector en segunda persona ("tú"). Mantén un tono neutro, profesional y altamente enfocado en los beneficios y resultados tangibles. Evita exageraciones emocionales; prioriza la claridad y la confianza.',
  aiWriterPersona: 'Copywriter Institucional. Tono neutro, claro y profesional. Describe el problema de forma objetiva y presenta el programa como la solución lógica y estructurada. Genera confianza mediante la claridad.'
};
