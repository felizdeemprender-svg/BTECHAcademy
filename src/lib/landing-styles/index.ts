export * from './types';

import { LandingStyle } from './types';
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
