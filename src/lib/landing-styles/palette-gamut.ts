export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function channelToHex(c: number): string {
  return Math.round(Math.min(255, Math.max(0, c)))
    .toString(16)
    .padStart(2, '0');
}

function rgbToHex(rgb: Rgb): string {
  return `#${channelToHex(rgb.r)}${channelToHex(rgb.g)}${channelToHex(rgb.b)}`;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

export const WHITE: Rgb = { r: 255, g: 255, b: 255 };
export const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/**
 * Genera una gama de 11 tonos para un color: 5 tintas → base → 5 sombras.
 * Útil para mostrar el rango completo de variaciones que el brand puede usar.
 */
export function expandColorGamut(hex: string, tintSteps = 5, shadeSteps = 5): string[] {
  const base = hexToRgb(hex);
  if (!base) return [];
  const tintFactor = [0.85, 0.65, 0.45, 0.25, 0.1];
  const shadeFactor = [0.15, 0.3, 0.5, 0.7, 0.85];

  const tints = tintFactor.map((t) => rgbToHex(mix(WHITE, base, t)));
  const shades = shadeFactor.map((t) => rgbToHex(mix(BLACK, base, t)));

  return [...tints.slice(0, tintSteps), hex.trim(), ...shades.slice(0, shadeSteps)];
}

/**
 * Muestra legible de un token CSS para el detalle (evita valores largos).
 */
export function tokenSummary(value: string | undefined, max = 40): string {
  if (!value) return '—';
  const v = value.trim();
  return v.length > max ? `${v.slice(0, max)}…` : v;
}
