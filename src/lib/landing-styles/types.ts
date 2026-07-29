export interface LandingStyleSection {
  id: string;
  name: string;
  description: string;
  blueprint: string; // Detalles de la disposición de objetos (UI/Layout) para que la IA entienda la estructura visual
  required: boolean;
  isRepeatable?: boolean; // Permite al tutor instanciar esta sección múltiples veces
  contentType: 'text' | 'video' | 'image' | 'mixed' | 'interactive';
}

export interface TypographyVariant {
  name: string;
  headingScale: number; // 0.8 - 1.5
  bodyScale: number; // 0.9 - 1.2
  headingFont: string;
  bodyFont: string;
}

export interface ColorPalette {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

export interface LandingStyle {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  
  // Niveles de suscripción permitidos para usar este estilo
  allowedSubscriptions: string[];

  // Configuración visual
  layout: 'centered' | 'split' | 'full-width' | 'grid' | 'asymmetric';
  componentStyle: 'borders' | 'shadows' | 'minimal' | 'defined' | 'creative';
  typography: TypographyVariant[]; // 5 variantes de tipografía para que la IA elija
  spacing: 'compact' | 'balanced' | 'generous' | 'airy';
  animations: 'none' | 'minimal' | 'hover' | 'micro';
  
  // Secciones disponibles en este estilo
  availableSections: LandingStyleSection[];
  
  // Configuración de visibilidad por defecto
  defaultVisibility: Record<string, boolean>;
  
  // Propuestas de color (basadas en colores del wish)
  colorProposals: ColorPalette[]; // 5 paletas predefinidas para este estilo
  
  // Directivas para la IA
  aiDirectives: string;

  /**
   * Descripción expuesta al usuario sobre quién escribe y cómo (ej. "Tono cálido en primera persona")
   */
  aiWriterPersona: string;
}
