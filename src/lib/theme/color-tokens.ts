const HSL_TRIPLET_RE = /^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function rgbUnitToHslChannels(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  const d = max - min;
  if (d > 1e-6) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Converts a 3-digit or 6-digit hex color string into space-separated HSL channels.
 */
export function hexToHsl(hex: string): string {
  const clean = hex.trim();
  let r = 0;
  let g = 0;
  let b = 0;
  if (clean.length === 4) {
    r = parseInt(clean[1] + clean[1], 16);
    g = parseInt(clean[2] + clean[2], 16);
    b = parseInt(clean[3] + clean[3], 16);
  } else if (clean.length === 7) {
    r = parseInt(clean.substring(1, 3), 16);
    g = parseInt(clean.substring(3, 5), 16);
    b = parseInt(clean.substring(5, 7), 16);
  }
  return rgbUnitToHslChannels(r / 255, g / 255, b / 255);
}

/**
 * Converts a CSS Color 4 `oklch(L C H)` string into space-separated HSL channels (`H S% L%`).
 */
export function oklchToHsl(value: string): string | undefined {
  const match = value
    .trim()
    .match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.%]+)?\s*\)$/i);
  if (!match) return undefined;

  const rawL = match[1];
  const L = rawL.endsWith('%') ? parseFloat(rawL) / 100 : parseFloat(rawL);
  const C = parseFloat(match[2]);
  const H = parseFloat(match[3]);
  if (!Number.isFinite(L) || !Number.isFinite(C) || !Number.isFinite(H)) return undefined;

  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const linR = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const linG = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const linB = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const toGamma = (c: number) => {
    const clamped = clamp01(c);
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  return rgbUnitToHslChannels(toGamma(linR), toGamma(linG), toGamma(linB));
}

/**
 * Normalizes any supported CSS color token (`H S% L%`, `hsl(...)`, `#hex`, `rgb(...)`, `oklch(...)`)
 * into Tailwind-compatible space-separated HSL channels (`H S% L%`), or `undefined` if invalid.
 */
export function toHslChannels(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (HSL_TRIPLET_RE.test(trimmed)) {
    return trimmed.replace(/\s+/g, ' ');
  }

  const hslMatch = trimmed.match(/^hsl\(\s*([\d.]+)[,\s]+([\d.]+%)[,\s]+([\d.]+%)(?:\s*[,/]\s*[\d.%]+)?\s*\)$/i);
  if (hslMatch) {
    return `${hslMatch[1]} ${hslMatch[2]} ${hslMatch[3]}`;
  }

  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return hexToHsl(trimmed);
  }

  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:\s*[,/]\s*[\d.%]+)?\s*\)$/i);
  if (rgbMatch) {
    return rgbUnitToHslChannels(
      clamp01(Number(rgbMatch[1]) / 255),
      clamp01(Number(rgbMatch[2]) / 255),
      clamp01(Number(rgbMatch[3]) / 255),
    );
  }

  if (/^oklch\(/i.test(trimmed)) {
    return oklchToHsl(trimmed);
  }

  return undefined;
}

