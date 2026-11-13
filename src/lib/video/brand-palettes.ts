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
        outline: b.palette.primary
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
      outline: course.branding.primaryColor
    });
  }

  return result;
}

export function resolveVideoBrandPalette(
  paletteId?: string | null,
  customBrandColors?: { name?: string; primary?: string; secondary?: string; accent?: string; outline?: string } | null,
  profile?: any,
  course?: any
): VideoBrandPalette | null {
  if (customBrandColors?.primary) {
    return {
      id: paletteId || 'custom',
      name: customBrandColors.name || 'Personalizado',
      primary: customBrandColors.primary,
      secondary: customBrandColors.secondary || '#FFFFFF',
      accent: customBrandColors.accent || customBrandColors.primary,
      outline: customBrandColors.outline || customBrandColors.primary
    };
  }

  if (!paletteId || paletteId === 'adn') return null;

  const allPalettes = getSystemVideoPalettes(profile, course);
  const found = allPalettes.find((p) => p.id === paletteId);
  if (found) return found;

  const normalized = paletteId.toLowerCase().replace(/^(tutor-|sys-)/, '');
  return allPalettes.find((p) => p.id.includes(normalized) || p.name.toLowerCase().includes(normalized)) || null;
}
