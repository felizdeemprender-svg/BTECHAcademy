/**
 * Classic Style - Configuration only (no React hooks)
 * Este archivo contiene solo la configuración del estilo Classic sin dependencias de React
 * Puede ser importado tanto por componentes cliente como por código server-side
 */

export const CLASSIC_STYLE_CONFIG = {
  id: "classic",
  name: "Classic",
  description: "Estilo tradicional con diseño limpio y profesional, ideal para cursos académicos",
  
  // Tokens de diseño
  designTokens: {
    primary: "#2563EB", // Azul
    secondary: "#1E40AF", // Azul oscuro
    accent: "#F59E0B", // Naranja
    background: "#FFFFFF",
    text: "#111827",
    textLight: "#6B7280",
    border: "#E5E7EB",
  },
  
  // Layout del estilo
  layout: {
    hero: "centered",
    sections: "alternating",
    footer: "full-width",
  },
  
  // Secciones disponibles
  availableSections: [
    { id: "hero", name: "Hero", required: true },
    { id: "about", name: "Sobre el Curso", required: true },
    { id: "tutor", name: "Tutor", required: true },
    { id: "content", name: "Contenido", required: true, repeatable: true },
    { id: "benefits", name: "Beneficios", required: true },
    { id: "testimonials", name: "Testimonios", required: false },
    { id: "pricing", name: "Precios", required: true },
    { id: "cta", name: "Call to Action", required: true },
    { id: "social", name: "Redes Sociales", required: false },
  ],
  
  // Secciones duplicables
  repeatableSections: ["content"],
  
  // Número de secciones repetibles por defecto
  defaultSectionCount: 3,
  
  // Plantillas de prompts para la IA
  prompts: {
    hero: "Genera un hero section para un curso de {topic} con headline impactante y subheadline descriptivo",
    content: "Genera {count} secciones de contenido sobre {topic} con títulos, descripciones y bullet points",
    tutor: "Genera una sección de tutor con nombre, título, biografía y foto",
    benefits: "Genera {count} beneficios del curso {topic}",
    testimonials: "Genera {count} testimonios de estudiantes del curso {topic}",
    pricing: "Genera {count} planes de precios para el curso {topic}",
    cta: "Genera un call to action para el curso {topic}",
  },
};

// ============================================================================
// TIPOS
// ============================================================================

export type ClassicSectionType = {
  title: string;
  description: string;
  bulletPoints: string[];
  hasVideo: boolean;
  image: string;
};

export type ClassicTemplate = {
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  designTokens?: any;
  validationResults?: any;
  platformAdaptations?: any;
  sectionCount?: number;
  sections?: ClassicSectionType[];
};
