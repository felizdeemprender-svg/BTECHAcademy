import { StyleBrand } from '@/lib/landing-styles';

export interface VideoBrandPalette {
  id: string;
  name: string;
  styleName?: string;
  primary: string;
  secondary: string;
  accent: string;
  outline?: string;
}

/**
 * Obtiene las paletas de Brand disponibles para el video:
 * 1. ADN Original (por defecto del preset visual de video)
 * 2. Brands configurados por el tutor en su perfil (profile.profile.brands, profile.brands o profile.myBrands)
 * 3. Branding del curso si está definido
 */
export function getSystemVideoPalettes(profile?: any, course?: any): VideoBrandPalette[] {
  const result: VideoBrandPalette[] = [];

  // 1. ADN Original
  result.push({
    id: 'adn',
    name: 'ADN Original (Preset)',
    primary: '',
    secondary: '',
    accent: ''
  });

  // 2. Brands propios configurados por el tutor en su perfil
  const userBrands: StyleBrand[] = Array.isArray(profile?.profile?.brands)
    ? profile.profile.brands
    : Array.isArray(profile?.brands)
    ? profile.brands
    : Array.isArray(profile?.myBrands)
    ? profile.myBrands
    : [];

  // Soporte para marca única configurada en el perfil
  if (userBrands.length === 0) {
    const singleBrand = profile?.profile?.brand || profile?.brand;
    if (singleBrand?.palette?.primary) {
      userBrands.push(singleBrand);
    }
  }

  // Soporte para color primario de marca individual en el perfil
  if (userBrands.length === 0 && (profile?.profile?.primaryColor || profile?.primaryColor)) {
    const col = profile?.profile?.primaryColor || profile?.primaryColor;
    userBrands.push({
      name: profile?.displayName || 'Mi Marca',
      palette: { primary: col, secondary: '#FFFFFF', accent: col }
    } as any);
  }

  userBrands.forEach((b) => {
    if (b?.palette?.primary) {
      result.push({
        id: `tutor-${(b.name || 'marca').toLowerCase().replace(/\s+/g, '_')}`,
        name: `${b.name || 'Marca'} (Mi Marca)`,
        styleName: 'Mi Marca',
        primary: b.palette.primary,
        secondary: b.palette.secondary || '#FFFFFF',
        accent: b.palette.accent || b.palette.primary,
        outline: '#000000'
      });
    }
  });

  // 3. Branding del curso si está definido y no está ya en la lista
  if (course?.branding?.primaryColor) {
    const courseBrandName = course.branding.brandName || course.title || 'Curso';
    result.push({
      id: 'course-branding',
      name: `${courseBrandName} (Branding del Curso)`,
      styleName: 'Curso',
      primary: course.branding.primaryColor,
      secondary: '#FFFFFF',
      accent: course.branding.primaryColor,
      outline: '#000000'
    });
  }

  return result;
}

export const SYSTEM_SUGGESTED_BRANDS: VideoBrandPalette[] = [
  { id: 'sys-purple', name: 'Púrpura Imperial', styleName: 'Sistema', primary: '#760464', secondary: '#eedaea', accent: '#A21CAF', outline: '#000000' },
  { id: 'sys-indigo', name: 'Índigo Tech', styleName: 'Sistema', primary: '#4F46E5', secondary: '#EEF2FF', accent: '#6366F1', outline: '#000000' },
  { id: 'sys-emerald', name: 'Esmeralda Growth', styleName: 'Sistema', primary: '#059669', secondary: '#ECFDF5', accent: '#10B981', outline: '#000000' },
  { id: 'sys-amber', name: 'Ámbar Impacto', styleName: 'Sistema', primary: '#D97706', secondary: '#FFFBEB', accent: '#F59E0B', outline: '#000000' },
  { id: 'sys-sapphire', name: 'Zafiro Profundo', styleName: 'Sistema', primary: '#0284C7', secondary: '#F0F9FF', accent: '#38BDF8', outline: '#000000' },
  { id: 'sys-coral', name: 'Coral Energético', styleName: 'Sistema', primary: '#E11D48', secondary: '#FFF1F2', accent: '#F43F5E', outline: '#000000' },
  { id: 'sys-graphite', name: 'Grafito Neutro', styleName: 'Sistema', primary: '#1E293B', secondary: '#F8FAFC', accent: '#475569', outline: '#000000' }
];

/**
 * Obtiene todas las paletas de video disponibles unificadas:
 * 1. ADN Original (Preset nativo)
 * 2. Marcas del tutor configuradas en su perfil
 * 3. Branding del curso si existe
 * 4. Marcas sugeridas del sistema (alternativas cromáticas)
 */
export function getAllVideoBrandPalettes(profile?: any, course?: any): VideoBrandPalette[] {
  const basePalettes = getSystemVideoPalettes(profile, course);
  const existingIds = new Set(basePalettes.map(p => p.id));
  const suggestedToAdd = SYSTEM_SUGGESTED_BRANDS.filter(p => !existingIds.has(p.id));
  return [...basePalettes, ...suggestedToAdd];
}

/**
 * Convierte cualquier formato de color (FFmpeg hex@alpha, white@alpha, rgb, etc.)
 * a una sintaxis CSS válida (hex o rgba) compatible con todos los navegadores.
 */
export function cleanCssColor(colorStr?: string | null, fallback: string = ''): string {
  if (!colorStr) return fallback;
  const trimmed = colorStr.trim();
  if (!trimmed) return fallback;

  if (trimmed.includes('{brandColor}')) {
    return fallback || '#760464';
  }

  if (trimmed.includes('@')) {
    const [col, alpha] = trimmed.split('@');
    const numAlpha = parseFloat(alpha);
    const validAlpha = isNaN(numAlpha) ? 1 : Math.max(0, Math.min(1, numAlpha));

    if (col.toLowerCase() === 'white') {
      return validAlpha >= 1 ? '#FFFFFF' : `rgba(255, 255, 255, ${validAlpha})`;
    }
    if (col.toLowerCase() === 'black') {
      return validAlpha >= 1 ? '#000000' : `rgba(0, 0, 0, ${validAlpha})`;
    }

    const hexMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(col);
    if (hexMatch) {
      if (validAlpha >= 1) {
        return `#${hexMatch[1]}${hexMatch[2]}${hexMatch[3]}`;
      }
      const r = parseInt(hexMatch[1], 16);
      const g = parseInt(hexMatch[2], 16);
      const b = parseInt(hexMatch[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${validAlpha})`;
    }
    return col;
  }

  return trimmed;
}

export function resolveVideoBrandPalette(
  paletteId?: string | null,
  customBrandColors?: { name?: string; primary?: string; secondary?: string; accent?: string; outline?: string } | null,
  profile?: any,
  course?: any
): VideoBrandPalette | null {
  // 1. Si se solicita 'adn' (preset nativo), se devuelve null para delegar en la tipografía del ADN
  if (paletteId === 'adn') {
    return null;
  }

  // 2. Si viene un ID específico (que no sea 'custom'), buscar en catálogo unificado
  if (paletteId && paletteId !== 'custom') {
    const allPalettes = getAllVideoBrandPalettes(profile, course);
    const found = allPalettes.find((p) => p.id === paletteId);
    if (found) return found;

    const normalized = paletteId.toLowerCase().replace(/^(tutor-|sys-)/, '');
    const partialMatch = allPalettes.find((p) => p.id.includes(normalized) || p.name.toLowerCase().includes(normalized));
    if (partialMatch) return partialMatch;
  }

  // 3. Si es 'custom' o no se encontró en catálogo, pero vienen colores personalizados válidos:
  if (customBrandColors?.primary) {
    return {
      id: paletteId || 'custom',
      name: customBrandColors.name || 'Personalizado',
      primary: customBrandColors.primary,
      secondary: customBrandColors.secondary || '#FFFFFF',
      accent: customBrandColors.accent || customBrandColors.primary,
      outline: customBrandColors.outline || '#000000'
    };
  }

  return null;
}
