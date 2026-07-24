/**
 * Sistema de Estilos Visuales para Landings
 * Define 5 estilos visuales con configuración detallada de layout, componentes, tipografía, etc.
 */

export interface LandingStyleSection {
  id: string;
  name: string;
  description: string;
  required: boolean;
  contentType: 'text' | 'video' | 'image' | 'mixed' | 'interactive';
}

export interface LandingStyle {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  
  // Configuración visual
  layout: 'centered' | 'split' | 'full-width' | 'grid' | 'asymmetric';
  componentStyle: 'borders' | 'shadows' | 'minimal' | 'defined' | 'creative';
  typography: {
    headingScale: number; // 0.8 - 1.5
    bodyScale: number; // 0.9 - 1.2
    headingFont: string;
    bodyFont: string;
  };
  spacing: 'compact' | 'balanced' | 'generous' | 'airy';
  animations: 'none' | 'minimal' | 'hover' | 'micro';
  
  // Secciones disponibles en este estilo
  availableSections: LandingStyleSection[];
  
  // Configuración de visibilidad por defecto
  defaultVisibility: Record<string, boolean>;
  
  // Propuestas de color (basadas en colores del wish)
  colorProposals: {
    primary: string[];
    secondary: string[];
    accent: string[];
  };
  
  // Directivas para la IA
  aiDirectives: string;
}

export const LANDING_STYLES: LandingStyle[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'El estilo original, balanceado y profesional',
    thumbnail: '/styles/classic-thumb.png',
    layout: 'centered',
    componentStyle: 'borders',
    typography: { 
      headingScale: 1.1, 
      bodyScale: 1, 
      headingFont: 'Inter', 
      bodyFont: 'Inter' 
    },
    spacing: 'balanced',
    animations: 'minimal',
    availableSections: [
      { id: 'heroVideo', name: 'Video Principal', description: 'Hero con video de ventas', required: true, contentType: 'video' },
      { id: 'narrativeSections', name: 'Secciones Narrativas', description: 'Texto persuasivo del curso', required: true, contentType: 'text' },
      { id: 'syllabus', name: 'Temario', description: 'Contenido del programa', required: false, contentType: 'text' },
      { id: 'benefits', name: 'Beneficios', description: 'Ventajas del curso', required: false, contentType: 'text' },
      { id: 'mentorProfile', name: 'Perfil del Mentor', description: 'Información del tutor', required: false, contentType: 'mixed' },
      { id: 'faqs', name: 'Preguntas Frecuentes', description: 'Objeciones comunes', required: false, contentType: 'text' },
      { id: 'countdownTimer', name: 'Cuenta Regresiva', description: 'Urgencia con countdown', required: false, contentType: 'interactive' },
      { id: 'bonuses', name: 'Bonuses', description: 'Bonuses del curso', required: false, contentType: 'text' },
      { id: 'guarantee', name: 'Garantía', description: 'Garantía destacada', required: false, contentType: 'text' },
      { id: 'testimonials', name: 'Testimonios', description: 'Casos de éxito', required: false, contentType: 'mixed' },
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
    },
    colorProposals: {
      primary: ['#3B2D86', '#2563EB', '#1E40AF'],
      secondary: ['#F1F5F9', '#F8FAFC', '#E2E8F0'],
      accent: ['#FACC15', '#FBBF24', '#F59E0B']
    },
    aiDirectives: 'Usa un tono profesional y equilibrado. Layout centrado con componentes tradicionales.'
  }
];

// Helper function para obtener un estilo por ID
export function getLandingStyle(styleId: string): LandingStyle | undefined {
  return LANDING_STYLES.find(style => style.id === styleId);
}

// Helper function para obtener el estilo por defecto (Classic)
export function getDefaultLandingStyle(): LandingStyle {
  return LANDING_STYLES[0];
}
