/**
 * Color Matcher - Sistema Avanzado de Detección y Ajuste de Colores
 * 
 * Utiliza algoritmos de distancia de color para encontrar la mejor coincidencia
 */

export interface ColorMatch {
  originalColor: string;
  matchedColor: string;
  distance: number;
  platform: string;
  confidence: number;
}

export interface ColorDistanceResult {
  closestColor: string;
  distance: number;
  isExactMatch: boolean;
  platform: string;
}

/**
 * Convierte HEX a RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calcula distancia Euclidiana entre colores
 */
function calculateColorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return Infinity;
  
  const rDiff = rgb1.r - rgb2.r;
  const gDiff = rgb1.g - rgb2.g;
  const bDiff = rgb1.b - rgb2.b;
  
  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

/**
 * Encuentra el color más cercano usando algoritmo de distancia
 */
export function findClosestColorAdvanced(
  targetColor: string,
  availableColors: string[],
  platform: string
): ColorDistanceResult {
  let closestColor = availableColors[0];
  let minDistance = Infinity;
  let isExactMatch = false;

  for (const color of availableColors) {
    const distance = calculateColorDistance(targetColor, color);
    
    if (distance === 0) {
      isExactMatch = true;
      closestColor = color;
      minDistance = 0;
      break;
    }
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  return {
    closestColor,
    distance: minDistance,
    isExactMatch,
    platform
  };
}

/**
 * Analiza similitud de colores entre plataformas
 */
export function analyzeColorSimilarity(
  originalColor: string,
  platforms: string[]
): ColorMatch[] {
  const matches: ColorMatch[] = [];

  // Colores de referencia por plataforma
  const platformColors: Record<string, string[]> = {
    twitter: ['#1DA1F2', '#14171A', '#657786', '#F5F8FA', '#E1E8ED'],
    instagram: ['#E4405F', '#833AB4', '#F77737', '#1DA1F2', '#405DE6'],
    linkedin: ['#0077B5', '#283E4A', '#F3F2EF', '#868A92'],
    tiktok: ['#000000', '#FFFFFF', '#FE2C55', '#25F4EE']
  };

  for (const platform of platforms) {
    const colors = platformColors[platform.toLowerCase()];
    if (!colors) continue;

    const result = findClosestColorAdvanced(originalColor, colors, platform);
    
    matches.push({
      originalColor,
      matchedColor: result.closestColor,
      distance: result.distance,
      platform,
      confidence: Math.max(0, 100 - (result.distance / 4.41) * 100) // Normalizar a 0-100
    });
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Genera recomendaciones de ajuste de color
 */
export function generateColorRecommendations(
  originalColor: string,
  targetPlatforms: string[]
): {
  recommendedColors: ColorMatch[];
  analysis: string;
  suggestions: string[];
} {
  const matches = analyzeColorSimilarity(originalColor, targetPlatforms);
  
  const analysis = `Color original: ${originalColor}\n` +
    matches.map(match => 
      `${match.platform.toUpperCase()}: ${match.matchedColor} (${match.confidence.toFixed(1)}% similar)`
    ).join('\n');

  const suggestions = [
    'Considerar usar colores de marca oficiales para mayor compatibilidad',
    'Los colores con >80% de similitud generalmente funcionan bien',
    'Para branding consistente, usar el mismo color ajustado en todas las plataformas'
  ];

  return {
    recommendedColors: matches,
    analysis,
    suggestions
  };
}

/**
 * Valida y ajusta tipografías para compatibilidad
 */
export function validateAndAdjustTypography(
  originalFont: string,
  platform: string
): {
    adjustedFont: string;
    isWebSafe: boolean;
    alternatives: string[];
  } {
  const webSafeFonts = [
    'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana',
    'Courier New', 'Impact', 'Comic Sans MS', 'Trebuchet MS',
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat'
  ];

  const platformFonts: Record<string, string[]> = {
    twitter: ['Arial', 'Helvetica', 'Inter'],
    instagram: ['Inter', 'Roboto', 'Montserrat'],
    linkedin: ['Arial', 'Georgia', 'Helvetica'],
    tiktok: ['Inter', 'Roboto', 'Arial']
  };

  const supportedFonts = platformFonts[platform.toLowerCase()] || webSafeFonts;
  const isWebSafe = webSafeFonts.includes(originalFont);
  const isSupported = supportedFonts.includes(originalFont);

  let adjustedFont = originalFont;
  if (!isSupported) {
    adjustedFont = supportedFonts[0]; // Fallback a primera fuente soportada
  }

  return {
    adjustedFont,
    isWebSafe,
    alternatives: supportedFonts.filter(f => f !== originalFont)
  };
}
