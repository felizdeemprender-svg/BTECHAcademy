/**
 * Template Validator - Validación y Pre-conformación de Templates
 * 
 * Responsable de validar y ajustar templates para compatibilidad con APIs
 * Aplica protocolos específicos por plataforma y genera metadatos
 */

import { validateAndAdjustDesignForAPIs } from '@/lib/platform-protocols';

export interface PlatformValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  adjustedColors: any;
  adjustedTypography: any;
  platformAdaptations: any;
  colors?: any;           // ✅ AGREGADO: Para compatibilidad con código existente
  validationResults?: any;  // ✅ AGREGADO: Para compatibilidad con código existente
  typography?: any;        // ✅ AGREGADO: Para compatibilidad con código existente
}

export interface TemplateMetadata {
  preconformed: boolean;
  preconformedAt: string;
  validationResults: PlatformValidationResult;
  videoConfig?: {
    presetId: string;
    resolution: string;
    fps: number;
    audioMood: string;
    sceneCount: number;
  };
  designTokens: any;
  // Propiedades de templates
  targetLandingIdx?: number;
  customCtaUrl?: string;
  subject?: string;
  body?: string;
  finalLandingUrl?: string;
  slides?: { text: string; imageUrl: string }[];
  marketingName?: string;
  type?: string;
  hook?: string;
  caption?: string;
  hashtags?: string[];
  headlines?: string[];
  descriptions?: string[];
  keywords?: string[];
  landingId?: string;
  production_notes?: { music_url?: string; music_duration?: number };
}

/**
 * Valida y pre-conforma un template individual
 */
export async function validateAndPreconformTemplate(
  template: any,
  designTokens: any = {},
  platform: string = 'general'
): Promise<TemplateMetadata> {
  console.log(`🔍 Validando template para ${platform}:`, template);
  
  try {
    // Aplicar validación y ajuste según plataforma
    const validatedDesign = await validateAndAdjustDesignForAPIs(
      designTokens,
      designTokens,  // ✅ CORRECCIÓN: Usar el mismo designTokens, no undefined
      {
        landings: platform === 'landing',
        emails: platform === 'email',
        socials: platform === 'social',
        ads: platform === 'ads'
      }
    );
    
    console.log(`✅ Template validado para ${platform}:`, validatedDesign.adjustedColors);
    console.log(`📋 Protocolos aplicados:`, validatedDesign);
    
    return {
      ...template,
      designTokens: validatedDesign.adjustedColors || designTokens, // ✅ CORRECCIÓN: Usar adjustedColors
      typography: validatedDesign.adjustedTypography,
      validationResults: validatedDesign,
      platformAdaptations: validatedDesign.platformAdaptations,
      preconformed: true,
      preconformedAt: new Date().toISOString()
    };
    
  } catch (error: any) {
    console.error(`❌ Error validando template ${platform}:`, error);
    
    return {
      ...template,
      designTokens: designTokens,  // ✅ CORRECCIÓN: Devolver los designTokens originales si hay error
      typography: {},
      validationResults: {
        isValid: false,
        errors: [error.message],
        warnings: []
      },
      platformAdaptations: {},
      preconformed: false,
      preconformedAt: new Date().toISOString()
    };
  }
}

/**
 * Valida y pre-conforma templates de Twitter
 */
export async function validateTwitterTemplates(
  templates: any[],
  designTokens: any = {}
): Promise<TemplateMetadata[]> {
  console.log(`🐦 Validando ${templates.length} templates de Twitter...`);
  
  return await Promise.all(
    templates.map((template: any) => 
      validateAndPreconformTemplate(template, designTokens, 'twitter')
    )
  );
}

/**
 * Valida y pre-conforma templates de Instagram
 */
export async function validateInstagramTemplates(
  templates: any[],
  designTokens: any = {}
): Promise<TemplateMetadata[]> {
  console.log(`📷 Validando ${templates.length} templates de Instagram...`);
  
  return await Promise.all(
    templates.map((template: any) => 
      validateAndPreconformTemplate(template, designTokens, 'instagram')
    )
  );
}

/**
 * Valida y pre-conforma templates de LinkedIn
 */
export async function validateLinkedInTemplates(
  templates: any[],
  designTokens: any = {}
): Promise<TemplateMetadata[]> {
  console.log(`💼 Validando ${templates.length} templates de LinkedIn...`);
  
  return await Promise.all(
    templates.map((template: any) => 
      validateAndPreconformTemplate(template, designTokens, 'linkedin')
    )
  );
}

/**
 * Valida y pre-conforma templates de TikTok
 */
export async function validateTikTokTemplates(
  templates: any[],
  designTokens: any = {}
): Promise<TemplateMetadata[]> {
  console.log(`🎵 Validando ${templates.length} templates de TikTok...`);
  
  return await Promise.all(
    templates.map((template: any) => 
      validateAndPreconformTemplate(template, designTokens, 'tiktok')
    )
  );
}

/**
 * Valida y pre-conforma templates de Ads
 */
export async function validateAdsTemplates(
  templates: any[],
  designTokens: any = {}
): Promise<TemplateMetadata[]> {
  console.log(`📢 Validando ${templates.length} templates de Ads...`);
  
  return await Promise.all(
    templates.map((template: any) => 
      validateAndPreconformTemplate(template, designTokens, 'ads')
    )
  );
}

/**
 * Valida y pre-conforma múltiples templates (LEGADO - Mantener compatibilidad)
 */
export async function validateAndPreconformTemplates(
  templates: any[],
  designTokensMap: any[] = [],
  platforms: string[] = []
): Promise<{ [key: string]: TemplateMetadata[] }> {
  console.log('🚀 Iniciando validación masiva de templates...');
  
  const results: { [key: string]: TemplateMetadata[] } = {};
  
  // Validar cada tipo de template
  for (let i = 0; i < templates.length; i++) {
    const platform = platforms[i] || 'general';
    const designTokens = designTokensMap[i] || {};
    
    results[platform] = await Promise.all(
      templates[i].map((template: any, index: number) => 
        validateAndPreconformTemplate(template, designTokens, platform)
      )
    );
  }
  
  console.log('🎯 Validación masiva completada');
  return results;
}
