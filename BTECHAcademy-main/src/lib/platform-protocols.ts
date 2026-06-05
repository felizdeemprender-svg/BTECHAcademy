/**
 * Platform Protocols - Validación y Ajuste para APIs Externas
 * 
 * Responsable de validar y ajustar diseños para compatibilidad con APIs de proveedores
 */

export interface PlatformValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  adjustedColors: any;
  adjustedTypography: any;
  platformAdaptations: any;
}

export interface PlatformSpec {
  name: string;
  api: string;
  supportedColors: string[];
  supportedFormats: string[];
  colorRestrictions: {
    primary?: string[];
    accent?: string[];
    secondary?: string[];
  };
  formatRestrictions: {
    aspectRatio?: string[];
    maxSize?: string;
    minSize?: string;
  };
}

const PLATFORM_SPECS: Record<string, PlatformSpec> = {
  twitter: {
    name: 'X (Twitter)',
    api: 'v2',
    supportedColors: ['#1DA1F2', '#14171A', '#657786', '#F5F8FA', '#E1E8ED'],
    supportedFormats: ['square', 'landscape'],
    colorRestrictions: {
      primary: ['#1DA1F2', '#14171A'], // Solo colores oficiales de Twitter
      accent: ['#1DA1F2'] // Solo azul de Twitter
    },
    formatRestrictions: {
      aspectRatio: ['1:1', '16:9'],
      maxSize: '5MB',
      minSize: '400x400'
    }
  },
  instagram: {
    name: 'Instagram',
    api: 'Graph API',
    supportedColors: ['#E4405F', '#833AB4', '#F77737', '#1DA1F2', '#405DE6'],
    supportedFormats: ['square', 'portrait', 'landscape', 'story'],
    colorRestrictions: {
      primary: ['#E4405F', '#833AB4', '#F77737'], // Colores de marca Instagram
      accent: ['#E4405F', '#833AB4', '#F77737', '#1DA1F2', '#405DE6']
    },
    formatRestrictions: {
      aspectRatio: ['1:1', '4:5', '16:9', '9:16'],
      maxSize: '30MB',
      minSize: '640x640'
    }
  },
  linkedin: {
    name: 'LinkedIn',
    api: 'v2',
    supportedColors: ['#0077B5', '#283E4A', '#F3F2EF', '#868A92'],
    supportedFormats: ['square', 'landscape'],
    colorRestrictions: {
      primary: ['#0077B5', '#283E4A'], // Azul LinkedIn y gris oscuro
      accent: ['#0077B5'] // Solo azul LinkedIn
    },
    formatRestrictions: {
      aspectRatio: ['1:1', '16:9'],
      maxSize: '10MB',
      minSize: '1200x627'
    }
  },
  tiktok: {
    name: 'TikTok',
    api: 'Business API',
    supportedColors: ['#000000', '#FFFFFF', '#FE2C55', '#25F4EE'],
    supportedFormats: ['portrait', 'story'],
    colorRestrictions: {
      primary: ['#000000', '#FFFFFF'], // Solo blanco y negro
      accent: ['#FE2C55', '#25F4EE'] // Colores de marca TikTok
    },
    formatRestrictions: {
      aspectRatio: ['9:16'],
      maxSize: '100MB',
      minSize: '540x960'
    }
  }
};

/**
 * Valida si un color es compatible con una plataforma específica
 */
function validateColor(color: string, platform: string, colorType: 'primary' | 'accent' | 'secondary' = 'primary'): boolean {
  const spec = PLATFORM_SPECS[platform.toLowerCase()];
  if (!spec || !spec.colorRestrictions[colorType]) return true;
  
  return spec.colorRestrictions[colorType].includes(color.toUpperCase());
}

/**
 * Encuentra el color más cercano compatible
 */
function findClosestCompatibleColor(color: string, platform: string, colorType: 'primary' | 'accent' | 'secondary' = 'primary'): string {
  const spec = PLATFORM_SPECS[platform.toLowerCase()];
  if (!spec || !spec.colorRestrictions[colorType]) return color;
  
  // Si el color ya es compatible, devolverlo
  if (spec.colorRestrictions[colorType].includes(color.toUpperCase())) {
    return color;
  }
  
  // Devolver el primer color compatible como fallback
  return spec.colorRestrictions[colorType][0];
}

/**
 * Genera reporte de validación para una plataforma
 */
function generateValidationReport(platform: string, originalColors: any): {
  errors: string[];
  warnings: string[];
  recommendations: string[];
} {
  const spec = PLATFORM_SPECS[platform.toLowerCase()];
  if (!spec) {
    return {
      errors: [`Plataforma ${platform} no reconocida`],
      warnings: [],
      recommendations: ['Verificar el nombre de la plataforma']
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Validar colores primarios
  if (originalColors.primary && !validateColor(originalColors.primary, platform, 'primary')) {
    errors.push(`Color primario "${originalColors.primary}" no soportado en ${spec.name}`);
    recommendations.push(`Usar colores primarios oficiales: ${spec.colorRestrictions.primary?.join(', ')}`);
  }

  // Validar colores de acento
  if (originalColors.accent && !validateColor(originalColors.accent, platform, 'accent')) {
    errors.push(`Color acento "${originalColors.accent}" no soportado en ${spec.name}`);
    recommendations.push(`Considerar colores de acento compatibles: ${spec.colorRestrictions.accent?.join(', ')}`);
  }

  // Advertencias generales
  if (originalColors.secondary && !validateColor(originalColors.secondary, platform, 'secondary')) {
    warnings.push(`Color secundario "${originalColors.secondary}" puede tener compatibilidad limitada`);
  }

  // Recomendaciones específicas por plataforma
  if (platform.toLowerCase() === 'twitter') {
    recommendations.push('Usar formato cuadrado (1:1) para mejor compatibilidad');
    recommendations.push('Evitar degradados complejos, preferir colores sólidos');
  } else if (platform.toLowerCase() === 'instagram') {
    recommendations.push('Considerar formato vertical (4:5) para mayor engagement');
    recommendations.push('Usar colores vibrantes que destaquen en el feed');
  } else if (platform.toLowerCase() === 'linkedin') {
    recommendations.push('Mantener diseño profesional y minimalista');
    recommendations.push('Usar formato horizontal (16:9) para banners');
  }

  return { errors, warnings, recommendations };
}

/**
 * Valida y ajusta diseños para compatibilidad con APIs de plataformas
 */
export async function validateAndAdjustDesignForAPIs(
  originalColors: any,
  originalTypography: any,
  platforms: {
    landings?: boolean;
    emails?: boolean;
    socials?: boolean;
    ads?: boolean;
  }
): Promise<PlatformValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const adjustedColors = { ...originalColors };
  const adjustedTypography = { ...originalTypography };
  const platformAdaptations: any = {};

  // Validación para redes sociales
  if (platforms.socials) {
    const socialPlatforms = ['twitter', 'instagram', 'linkedin', 'tiktok'];
    
    socialPlatforms.forEach(platform => {
      const report = generateValidationReport(platform, originalColors);
      
      if (report.errors.length > 0) {
        errors.push(`❌ ${platform.toUpperCase()}\nAPI: ${PLATFORM_SPECS[platform].api}\nFormatos: ${PLATFORM_SPECS[platform].supportedFormats.length}\n• ${report.errors.join('\n• ')}`);
      }
      
      if (report.warnings.length > 0) {
        warnings.push(`⚠️ ${platform.toUpperCase()}\n• ${report.warnings.join('\n• ')}`);
      }
      
      if (report.recommendations.length > 0) {
        warnings.push(`💡 ${platform.toUpperCase()}\nRecomendaciones:\n→ ${report.recommendations.join('\n→ ')}`);
      }

      // Ajustar colores para compatibilidad
      platformAdaptations[platform] = {
        adjustedColors: {
          primary: findClosestCompatibleColor(originalColors.primary || '', platform, 'primary'),
          accent: findClosestCompatibleColor(originalColors.accent || '', platform, 'accent'),
          secondary: findClosestCompatibleColor(originalColors.secondary || '', platform, 'secondary')
        },
        supportedFormats: PLATFORM_SPECS[platform].supportedFormats,
        apiVersion: PLATFORM_SPECS[platform].api
      };
    });
  }

  // Validación para landings (generalmente más flexibles)
  if (platforms.landings) {
    // Las landings usualmente no tienen restricciones estrictas de color
    platformAdaptations.landings = {
      flexible: true,
      recommendations: [
        'Mantener coherencia con marca',
        'Optimizar para dispositivos móviles',
        'Usar colores accesibles (WCAG)'
      ]
    };
  }

  // Validación para emails
  if (platforms.emails) {
    // Los emails tienen restricciones de compatibilidad con clientes de correo
    platformAdaptations.emails = {
      supportedFonts: ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana'],
      colorLimitations: 'Evitar依赖 de transparencias complejas',
      recommendations: [
        'Usar fuentes web-safe',
        'Incluir fallback fonts',
        'Probar en múltiples clientes de correo'
      ]
    };
  }

  // Validación para ads
  if (platforms.ads) {
    platformAdaptations.ads = {
      platforms: ['meta_ads', 'google_ads'],
      requirements: {
        meta: ['Texto claro', 'Imagen alta calidad', 'CTA visible'],
        google: ['Palabras clave relevantes', 'Landing page funcional', 'Segmentación clara']
      }
    };
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    adjustedColors,
    adjustedTypography,
    platformAdaptations
  };
}

/**
 * Obtiene especificaciones de una plataforma
 */
export function getPlatformSpec(platform: string): PlatformSpec | null {
  return PLATFORM_SPECS[platform.toLowerCase()] || null;
}

/**
 * Lista todas las plataformas soportadas
 */
export function getSupportedPlatforms(): string[] {
  return Object.keys(PLATFORM_SPECS);
}
