export * from './types';

import { LandingStyle, StyleBrand } from './types';
import { classicStyle } from './classic';
import { dharmaStyle } from './dharma';

// Array exportando todos los estilos disponibles
export const LANDING_STYLES: LandingStyle[] = [
  classicStyle,
  dharmaStyle
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

/**
 * Resuelve el color primario de un curso.
 * Prioridad: brand elegido explícitamente (brandingOverride.brandName) → override legacy
 * (brandingOverride.primaryColor) → brand activo del tutor → branding legacy → default.
 * `profile` es el objeto `profile` del tutor guardado en Firestore.
 */
export function resolveCoursePrimaryColor(
  override: { brandName?: string | null; primaryColor?: string | null } | undefined | null,
  profile: any,
  fallback = '#3B2D86'
): string {
  const ownBrands: StyleBrand[] = Array.isArray(profile?.brands) ? profile.brands : [];
  const activeBrand = resolveProfileBrand(profile);
  if (override?.brandName) {
    const chosen = ownBrands.find(b => b?.name === override.brandName);
    return chosen?.palette?.primary || activeBrand?.palette?.primary || override?.primaryColor || fallback;
  }
  if (override?.primaryColor) return override.primaryColor;
  return activeBrand?.palette?.primary || profile?.branding?.primaryColor || fallback;
}
