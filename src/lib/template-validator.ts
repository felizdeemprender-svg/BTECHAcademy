/**
 * Template Validator - Validación y Pre-conformación de Templates
 * 
 * Responsable de validar y ajustar templates para compatibilidad con APIs
 * Aplica protocolos específicos por plataforma y genera metadatos
 */

import { validateAndAdjustDesignForAPIs } from '@/lib/platform-protocols';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  adjustedColors: any;
  adjustedTypography: any;
  platformAdaptations: any;
}

export interface TemplateMetadata {
  preconformed: boolean;
  preconformedAt: string;
  validationResults: ValidationResult;
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
      designTokens,
      {
        landings: platform === 'landing',
        emails: platform === 'email',
        socials: platform === 'social',
        ads: platform === 'ads'
      }
    );
    
    console.log(`✅ Template validado para ${platform}:`, validatedDesign.colors);
    console.log(`📋 Protocolos aplicados:`, validatedDesign.validationResults);
    
    return {
      ...template,
      designTokens: validatedDesign.colors,
      typography: validatedDesign.typography,
      validationResults: validatedDesign.validationResults,
      platformAdaptations: validatedDesign.platformAdaptations,
      preconformed: true,
      preconformedAt: new Date().toISOString()
    };
    
  } catch (error: any) {
    console.error(`❌ Error validando template ${platform}:`, error);
    
    return {
      ...template,
      designTokens: designTokens,
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
 * Valida y pre-conforma múltiples templates
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
