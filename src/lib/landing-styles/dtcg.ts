import { StyleBrand, StyleTokens, TypographyVariant, ColorPalette } from './types';

/**
 * Compatibilidad DTCG/W3C (Design Tokens) + formato propio del sistema.
 *
 * - `parseBrandFile(text)`: acepta un archivo JSON en formato DTCG/W3C (estándar)
 *   o en el formato propio de un StyleBrand del sistema. Devuelve StyleBrand[].
 * - `brandsToDTCG(brands)`: serializa los brands a un archivo .tokens.json DTCG/W3C.
 *
 * Convención DTCG: cada grupo raíz (sin prefijo `$`) es un brand. Los iconos y
 * campos desconocidos se ignoran; los tokens faltantes se completan con defaults.
 */

export const DEFAULT_BRAND_TOKENS: StyleTokens = {
  componentRadius: '6px',
  componentBorder: '1px solid var(--border)',
  componentShadow: 'none',
  componentBg: 'var(--surface)',
  sectionPadding: '96px',
  contentGap: '16px',
  transitionDuration: '150ms',
  themeMode: 'light',
};

export const DTCG_SCHEMA_URL =
  'https://design-tokens.github.io/community-group/format/draft/draft.json';

export interface BrandParseResult {
  brands: StyleBrand[];
  errors: string[];
}

interface BrandParseOutcome {
  brand: StyleBrand | null;
  errors: string[];
}

type AnyObj = Record<string, any>;

interface FlatToken {
  path: string;
  normalized: string;
  value: unknown;
  type?: string;
}

/* -------------------------------------------------------------------------- */
/* Utilidades DTCG                                                             */
/* -------------------------------------------------------------------------- */

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function valueToString(v: unknown): string {
  return v == null ? '' : String(v);
}

function normalizeColorValue(v: unknown): string {
  const s = valueToString(v).trim();
  if (/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(s)) {
    return `hsl(${s})`;
  }
  return s;
}

function prettifyKey(key: string): string {
  return key
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function flattenTokens(obj: AnyObj, prefix = '', out: FlatToken[] = []): FlatToken[] {
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (Object.prototype.hasOwnProperty.call(val, '$value')) {
        out.push({
          path: prefix ? `${prefix}.${key}` : key,
          normalized: normalize(prefix ? `${prefix}.${key}` : key),
          value: val.$value,
          type: typeof val.$type === 'string' ? val.$type : undefined,
        });
      } else {
        flattenTokens(val as AnyObj, prefix ? `${prefix}.${key}` : key, out);
      }
    }
  }
  return out;
}

export function isDTCGFile(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const obj = data as AnyObj;
  if (typeof obj.$schema === 'string') return true;
  return flattenTokens(obj).length > 0;
}

function clampThemeMode(v: string): StyleTokens['themeMode'] {
  const m = v.toLowerCase();
  return m === 'dark' || m === 'glass' ? m : 'light';
}

function clampScale(v: unknown): number {
  const n = Number(v);
  if (Number.isFinite(n)) return Math.min(3, Math.max(0.5, n));
  return 1;
}

/* -------------------------------------------------------------------------- */
/* Validación mínima de un brand (anti-basura)                                 */
/* -------------------------------------------------------------------------- */

export function isValidColorValue(v: string): boolean {
  const s = (v || '').trim();
  if (!s) return false;
  if (s.startsWith('var(') && s.endsWith(')')) return true;
  return (
    /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s) ||
    /^(hsl|hsla|rgb|rgba)\([^)]*\)$/i.test(s)
  );
}

/**
 * Verifica que un brand tenga la información mínima para ser usable:
 * nombre, los 3 colores de la paleta en formato válido y tipografías de
 * títulos/cuerpo. Devuelve la lista de errores (vacía = brand válido).
 */
export function collectBrandErrors(brand: StyleBrand | undefined | null): string[] {
  if (!brand) return ['El brand es inválido.'];
  const errors: string[] = [];
  const label = brand.name?.trim() || 'Brand sin nombre';
  if (!brand.name?.trim()) errors.push(`${label}: falta el nombre.`);
  if (!isValidColorValue(brand.palette?.primary || '')) errors.push(`${label}: falta un color primary válido (#hex, hsl()/rgb() o var(--...)).`);
  if (!isValidColorValue(brand.palette?.secondary || '')) errors.push(`${label}: falta un color secondary válido (#hex, hsl()/rgb() o var(--...)).`);
  if (!isValidColorValue(brand.palette?.accent || '')) errors.push(`${label}: falta un color accent válido (#hex, hsl()/rgb() o var(--...)).`);
  if (!brand.typography?.headingFont?.trim()) errors.push(`${label}: falta heading-font (tipografía de títulos).`);
  if (!brand.typography?.bodyFont?.trim()) errors.push(`${label}: falta body-font (tipografía de cuerpo).`);
  return errors;
}

/* -------------------------------------------------------------------------- */
/* Parser: grupo DTCG -> StyleBrand                                            */
/* -------------------------------------------------------------------------- */

function parseDTCGBrand(brandName: string, group: AnyObj): StyleBrand {
  const flat = flattenTokens(group);
  const tokens: Partial<StyleTokens> = {};
  const typography: Partial<TypographyVariant> = {};
  const palette: Partial<ColorPalette> = {};
  let description = '';

  if (typeof group.$description === 'string') description = group.$description;

  for (const t of flat) {
    const n = t.normalized;
    const path = t.path.toLowerCase();
    const isColor = t.type === 'color';
    const val = t.value;

    if (/(^|\.)(primary|main)$/.test(path)) { palette.primary = normalizeColorValue(val); continue; }
    if (/(^|\.)secondary$/.test(path)) { palette.secondary = normalizeColorValue(val); continue; }
    if (/(^|\.)accent$/.test(path)) { palette.accent = normalizeColorValue(val); continue; }
    if (n.includes('description')) { if (!description) description = valueToString(val); continue; }

    if (n.includes('heading') && n.includes('font')) { typography.headingFont = valueToString(val); continue; }
    if (n.includes('body') && n.includes('font')) { typography.bodyFont = valueToString(val); continue; }
    if (n.includes('heading') && n.includes('scale')) { typography.headingScale = clampScale(val); continue; }
    if (n.includes('body') && n.includes('scale')) { typography.bodyScale = clampScale(val); continue; }
    if (n.includes('typography') && n.endsWith('name')) { typography.name = valueToString(val); continue; }

    if (n.includes('radius')) { tokens.componentRadius = valueToString(val); continue; }
    if (n.includes('border')) { tokens.componentBorder = valueToString(val); continue; }
    if (n.includes('shadow')) { tokens.componentShadow = valueToString(val); continue; }
    if (n.includes('background') || n.includes('componentbg') || n.includes('surface') && isColor) {
      tokens.componentBg = valueToString(val); continue;
    }
    if (n.includes('sectionpadding') || n.includes('padding')) { tokens.sectionPadding = valueToString(val); continue; }
    if (n.includes('contentgap') || n.endsWith('gap')) { tokens.contentGap = valueToString(val); continue; }
    if (n.includes('transitionduration') || n.includes('duration')) { tokens.transitionDuration = valueToString(val); continue; }
    if (n.includes('thememode') || n.includes('mode') || n.endsWith('theme')) {
      tokens.themeMode = clampThemeMode(valueToString(val)); continue;
    }
  }

  return {
    name: brandName,
    description,
    tokens: { ...DEFAULT_BRAND_TOKENS, ...tokens },
    typography: {
      name: typography.name || 'Moderna',
      headingScale: typography.headingScale ?? 1.1,
      bodyScale: typography.bodyScale ?? 1,
      headingFont: typography.headingFont || '',
      bodyFont: typography.bodyFont || '',
    },
    palette: {
      name: palette.name || brandName,
      primary: palette.primary || '',
      secondary: palette.secondary || '',
      accent: palette.accent || '',
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Parser: formato propio del sistema (StyleBrand o arreglo)                   */
/* -------------------------------------------------------------------------- */

function parseCustomBrand(obj: AnyObj, index: number): BrandParseOutcome {
  const label = `Item ${index + 1}`;
  if (!obj || typeof obj !== 'object') return { brand: null, errors: [`${label}: no es un objeto válido.`] };
  if (typeof obj.name !== 'string' || !obj.name.trim()) return { brand: null, errors: [`${label}: falta el campo "name" (string).`] };

  const rawPalette: Partial<ColorPalette> =
    obj.palette && typeof obj.palette === 'object' ? obj.palette : {};
  const rawTypography: Partial<TypographyVariant> =
    obj.typography && typeof obj.typography === 'object' ? obj.typography : {};
  const rawTokens: Partial<StyleTokens> =
    obj.tokens && typeof obj.tokens === 'object' ? obj.tokens : {};

  const candidate: StyleBrand = {
    name: obj.name.trim(),
    description: typeof obj.description === 'string' ? obj.description : '',
    tokens: rawTokens as StyleTokens,
    typography: {
      name: rawTypography.name || '',
      headingScale: rawTypography.headingScale ?? 0,
      bodyScale: rawTypography.bodyScale ?? 0,
      headingFont: rawTypography.headingFont || '',
      bodyFont: rawTypography.bodyFont || '',
    },
    palette: {
      name: rawPalette.name || '',
      primary: rawPalette.primary || '',
      secondary: rawPalette.secondary || '',
      accent: rawPalette.accent || '',
    },
  };

  const errors = collectBrandErrors(candidate);
  if (errors.length > 0) return { brand: null, errors: errors.map(e => `${label}: ${e}`) };

  return {
    brand: {
      ...candidate,
      tokens: { ...DEFAULT_BRAND_TOKENS, ...rawTokens },
      typography: {
        name: rawTypography.name || 'Moderna',
        headingScale: clampScale(rawTypography.headingScale ?? 1.1),
        bodyScale: clampScale(rawTypography.bodyScale ?? 1),
        headingFont: rawTypography.headingFont || 'Inter',
        bodyFont: rawTypography.bodyFont || 'Inter',
      },
      palette: {
        name: rawPalette.name || candidate.name,
        primary: rawPalette.primary!,
        secondary: rawPalette.secondary!,
        accent: rawPalette.accent!,
      },
    },
    errors: [],
  };
}

/* -------------------------------------------------------------------------- */
/* API pública                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Parsea un archivo JSON de brands. Acepta DTCG/W3C o el formato propio.
 */
export function parseBrandFile(text: string): BrandParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { brands: [], errors: ['El archivo no es un JSON válido.'] };
  }

  if (!data || typeof data !== 'object') {
    return { brands: [], errors: ['El JSON debe ser un objeto o un arreglo de objetos.'] };
  }

  // Formato DTCG/W3C: cada grupo raíz (sin $) es un brand
  if (isDTCGFile(data)) {
    const root = data as AnyObj;
    const groups = Object.entries(root).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v));

    if (groups.length === 0) {
      return { brands: [], errors: ['El archivo DTCG no contiene grupos de tokens.'] };
    }

    const brands: StyleBrand[] = [];
    const errors: string[] = [];
    for (const [key, group] of groups) {
      const brand = parseDTCGBrand(prettifyKey(key), group as AnyObj);
      const brandErrors = collectBrandErrors(brand);
      if (brandErrors.length > 0) {
        errors.push(...brandErrors);
      } else {
        brands.push(brand);
      }
    }
    return { brands, errors };
  }

  // Formato propio del sistema
  const list = Array.isArray(data) ? data : [data];
  const brands: StyleBrand[] = [];
  const errors: string[] = [];
  list.forEach((item, i) => {
    const outcome = parseCustomBrand(item as AnyObj, i);
    if (outcome.brand) brands.push(outcome.brand);
    errors.push(...outcome.errors);
  });
  return { brands, errors };
}

/**
 * Serializa los brands a un objeto JSON DTCG/W3C (.tokens.json).
 */
export function brandsToDTCG(brands: StyleBrand[]): string {
  const root: AnyObj = {
    $schema: DTCG_SCHEMA_URL,
    $description: 'Brands exportados como Design Tokens (DTCG/W3C). Cada grupo raíz es un brand.',
  };

  for (const brand of brands) {
    root[brand.name] = {
      $description: brand.description || undefined,
      color: {
        primary: { $value: brand.palette.primary, $type: 'color' },
        secondary: { $value: brand.palette.secondary, $type: 'color' },
        accent: { $value: brand.palette.accent, $type: 'color' },
      },
      typography: {
        name: { $value: brand.typography.name, $type: 'string' },
        'heading-font': { $value: brand.typography.headingFont, $type: 'fontFamily' },
        'body-font': { $value: brand.typography.bodyFont, $type: 'fontFamily' },
        'heading-scale': { $value: brand.typography.headingScale, $type: 'number' },
        'body-scale': { $value: brand.typography.bodyScale, $type: 'number' },
      },
      components: {
        radius: { $value: brand.tokens.componentRadius, $type: 'dimension' },
        border: { $value: brand.tokens.componentBorder, $type: 'border' },
        shadow: { $value: brand.tokens.componentShadow, $type: 'shadow' },
        background: { $value: brand.tokens.componentBg, $type: 'color' },
      },
      layout: {
        'section-padding': { $value: brand.tokens.sectionPadding, $type: 'dimension' },
        'content-gap': { $value: brand.tokens.contentGap, $type: 'dimension' },
        'transition-duration': { $value: brand.tokens.transitionDuration, $type: 'duration' },
      },
      theme: {
        mode: { $value: brand.tokens.themeMode, $type: 'string' },
      },
    };
  }

  return JSON.stringify(root, null, 2);
}
