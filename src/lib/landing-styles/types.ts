export type StyleGroup = 'storytelling' | 'corporate' | 'high-ticket' | 'promo';

export const STYLE_GROUP_LABELS: Record<StyleGroup, string> = {
  storytelling: 'Storytelling',
  corporate: 'Corporativo',
  'high-ticket': 'High-Ticket',
  promo: 'Promocional',
};

export const STYLE_GROUP_COLORS: Record<StyleGroup, string> = {
  storytelling: 'bg-rose-50 text-rose-600 border-rose-200',
  corporate: 'bg-blue-50 text-blue-600 border-blue-200',
  'high-ticket': 'bg-amber-50 text-amber-600 border-amber-200',
  promo: 'bg-emerald-50 text-emerald-600 border-emerald-200',
};

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

export interface StyleTokens {
  componentRadius: string;
  componentBorder: string;
  componentShadow: string;
  componentBg: string;
  sectionPadding: string;
  contentGap: string;
  transitionDuration: string;
  themeMode: 'light' | 'dark' | 'glass';
}

export const TOKEN_LABELS: Record<keyof StyleTokens, string> = {
  componentRadius: 'Radio de componentes',
  componentBorder: 'Borde de componentes',
  componentShadow: 'Sombra de componentes',
  componentBg: 'Fondo de componentes',
  sectionPadding: 'Padding de secciones',
  contentGap: 'Gap entre elementos',
  transitionDuration: 'Duración de transiciones',
  themeMode: 'Modo visual',
};

export const TOKEN_DESCRIPTIONS: Record<keyof StyleTokens, string> = {
  componentRadius: 'border-radius en CSS',
  componentBorder: 'border en CSS (ej. "1px solid var(--border)")',
  componentShadow: 'box-shadow en CSS',
  componentBg: 'background en CSS',
  sectionPadding: 'padding-top/bottom de secciones',
  contentGap: 'gap entre elementos en grillas',
  transitionDuration: 'transition-duration en CSS',
  themeMode: 'light = claro, dark = oscuro, glass = cristal',
};

export interface StyleBrand {
  name: string;
  description?: string;
  tokens: StyleTokens;
  typography: TypographyVariant;
  palette: ColorPalette;
}

export interface LandingStyle {
  id: string;
  name: string;
  description: string;
  thumbnail: string;

  // Grupo de estilo (determina tono de escritura e intercambiabilidad de contenido)
  group: StyleGroup;

  // Niveles de suscripción permitidos para usar este estilo
  allowedSubscriptions: string[];

  // Configuración visual
  layout: 'centered' | 'split' | 'full-width' | 'grid' | 'asymmetric';
  tokens: StyleTokens;
  typography: TypographyVariant[]; // 5 variantes de tipografía para que la IA elija
  brands?: StyleBrand[]; // Variantes preempaquetadas del estilo
  
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
