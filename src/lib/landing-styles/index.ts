export * from './types';

import { LandingStyle, StyleBrand } from './types';
import { classicStyle } from './classic';
import { dharmaStyle } from './dharma';
import { flashSaleStyle } from './flash-sale';
import { launchCountdownStyle } from './launch-countdown';
import { corporateStyle } from './corporate';
import { techB2bStyle } from './tech-b2b';
import { executiveDarkStyle } from './executive-dark';
import { luxurySerifStyle } from './luxury-serif';
import { editorialStyle } from './editorial';
import { modernCleanStyle } from './modern-clean';

// Array exportando todos los estilos disponibles
export const LANDING_STYLES: LandingStyle[] = [
  classicStyle,
  dharmaStyle,
  flashSaleStyle,
  launchCountdownStyle,
  corporateStyle,
  techB2bStyle,
  executiveDarkStyle,
  luxurySerifStyle,
  editorialStyle,
  modernCleanStyle
];

export function getLandingStyle(id: string): LandingStyle | undefined {
  return LANDING_STYLES.find(style => style.id.toLowerCase() === id?.toLowerCase());
}

export function getDefaultLandingStyle(): LandingStyle {
  return LANDING_STYLES[0];
}

/**
 * Resuelve un brand concreto de un estilo. Si no se pasa brandName,
 * devuelve el primer brand del estilo (o null si no tiene).
 */
export function resolveStyleBrand(
  style: Pick<LandingStyle, 'brands'> | undefined,
  brandName?: string | null
): StyleBrand | null {
  const brands = style?.brands;
  if (!brands || brands.length === 0) return null;
  if (!brandName) return brands[0];
  return brands.find(b => b.name?.toLowerCase() === brandName.toLowerCase()) || brands[0];
}

/**
 * Resuelve el brand activo de un perfil de tutor (brands propios privados).
 * Acepta el objeto `profile` tal como se guarda en Firestore: `{ brands, activeBrandName }`.
 */
export function resolveProfileBrand(profile: any): StyleBrand | null {
  const ownBrands: StyleBrand[] = Array.isArray(profile?.brands) ? profile.brands : [];
  if (ownBrands.length === 0) return null;
  const active = ownBrands.find(b => b?.name === profile?.activeBrandName);
  return active || ownBrands[0] || null;
}

export interface CourseResolvedBrand {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
  brand: StyleBrand | null;
}

/**
 * Resuelve el brand completo de un curso con preponderancia absoluta sobre el tutor.
 * 
 * Regla de preponderancia:
 * 1. Brand elegido explícitamente en el curso (`override.brandName`), buscando en las marcas del tutor.
 * 2. Si el curso guardó el snapshot del brand (`override.brand`), se usa directamente.
 * 3. Si no hay marca elegida en el curso, fallback a la marca activa del perfil del tutor.
 * 4. Fallback a colores/fuentes por defecto (#3B2D86, #8B5CF6, #D8B4FE, Inter).
 */
export function resolveCourseBrand(
  override: any,
  profile: any,
  fallbackPrimary = '#3B2D86'
): CourseResolvedBrand {
  const ownBrands: StyleBrand[] = Array.isArray(profile?.brands) ? profile.brands : [];
  const activeProfileBrand = resolveProfileBrand(profile);

  let chosenBrand: StyleBrand | null = null;
  if (override?.brandName) {
    chosenBrand = ownBrands.find(b => b?.name === override.brandName) || null;
  }

  if (!chosenBrand && override?.brand && typeof override.brand === 'object') {
    chosenBrand = override.brand as StyleBrand;
  }

  const effectiveBrand = chosenBrand || activeProfileBrand;

  const primary = chosenBrand?.palette?.primary ||
    override?.primaryColor ||
    activeProfileBrand?.palette?.primary ||
    profile?.branding?.primaryColor ||
    fallbackPrimary;

  const secondary = chosenBrand?.palette?.secondary ||
    override?.secondaryColor ||
    activeProfileBrand?.palette?.secondary ||
    '#8B5CF6';

  const accent = chosenBrand?.palette?.accent ||
    override?.accentColor ||
    activeProfileBrand?.palette?.accent ||
    '#D8B4FE';

  const headingFont = chosenBrand?.typography?.headingFont ||
    override?.headingFont ||
    activeProfileBrand?.typography?.headingFont ||
    'Inter';

  const bodyFont = chosenBrand?.typography?.bodyFont ||
    override?.bodyFont ||
    activeProfileBrand?.typography?.bodyFont ||
    'Inter';

  return {
    name: chosenBrand?.name || override?.brandName || effectiveBrand?.name || 'Default',
    primary,
    secondary,
    accent,
    headingFont,
    bodyFont,
    brand: effectiveBrand,
  };
}

/**
 * Resuelve el color primario de un curso.
 * Prioridad: brand elegido explícitamente (brandingOverride.brandName) → override legacy
 * (brandingOverride.primaryColor) → brand activo del tutor → branding legacy → default.
 * `profile` es el objeto `profile` del tutor guardado en Firestore.
 */
export function resolveCoursePrimaryColor(
  override: { brandName?: string | null; primaryColor?: string | null; brand?: any } | undefined | null,
  profile: any,
  fallback = '#3B2D86'
): string {
  const resolved = resolveCourseBrand(override, profile, fallback);
  return resolved.primary;
}
