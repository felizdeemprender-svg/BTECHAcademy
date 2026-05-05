/**
 * Content Exporter - Formateo y Exportación de Templates
 * 
 * Responsable de generar packs de exportación con metadatos de protocolos
 * Formatea contenido para diferentes plataformas y genera archivos .txt
 */

import { TemplateMetadata } from './template-validator';

export interface ExportPack {
  name: string;
  content: string;
  metadata?: any;
}

export interface ExportOptions {
  includeValidationResults?: boolean;
  includeTimestamps?: boolean;
  includeProtocolDetails?: boolean;
  baseUrl?: string;
}

/**
 * Genera contenido formateado para emails
 */
export function formatEmailContent(emails: TemplateMetadata[], options: ExportOptions = {}): string {
  return emails.map((email, index) => {
    const target = email.targetLandingIdx ?? index;
    const customUrl = email.customCtaUrl;
    let link = customUrl || `https://tu-dominio.com/api/track?pageId=PAGE_ID&v=${target}&source=email&channel=email`;
    
    if (email.landingId && email.landingId !== 'mentor') {
      const [packId, vIdx] = email.landingId.split('-');
      link = `${options.baseUrl || 'https://btechacademy-8b329.web.app'}/v/${packId}?v=${vIdx}`;
    } else if (email.landingId === 'mentor') {
      link = 'URL_DEL_MENTOR_AQUÍ';
    }
    
    let content = `VARIANTE ${index + 1}${email.preconformed ? ' (PRE-CONFORMADA)' : ''}\n`;
    content += `ASUNTO: ${email.subject || 'Sin asunto'}\n`;
    content += `LINK DE CONVERSIÓN: ${link}\n\n`;
    content += `CONTENIDO DEL EMAIL:\n`;
    content += `--------------------------------------------------\n`;
    content += `${email.body || 'Sin contenido'}\n`;
    content += `--------------------------------------------------\n`;
    
    if (options.includeValidationResults && email.validationResults) {
      content += `\n\n📋 PROTOCOLOS APLICADOS:\n`;
      content += JSON.stringify(email.validationResults, null, 2);
    }
    
    if (options.includeProtocolDetails && email.designTokens) {
      content += `\n\n🎨 COLORES AJUSTADOS:\n`;
      content += JSON.stringify(email.designTokens, null, 2);
    }
    
    return content;
  }).join('\n\n\n\n');
}

/**
 * Genera contenido formateado para redes sociales
 */
export function formatSocialContent(socials: TemplateMetadata[], options: ExportOptions = {}): string {
  return socials.map((social, index) => {
    let landingLink = social.finalLandingUrl || 'https://tu-dominio.com/v/PAGE_ID';
    
    if (social.landingId && social.landingId !== 'mentor') {
      const [packId, vIdx] = social.landingId.split('-');
      landingLink = `${options.baseUrl || 'https://btechacademy-8b329.web.app'}/v/${packId}?v=${vIdx}`;
    } else if (social.landingId === 'mentor') {
      landingLink = 'URL_DEL_MENTOR_AQUÍ';
    }
    const slidesText = social.slides?.map((slide: any, si: number) => 
      `PLACA ${si + 1}:\n[TEXTO EN IMAGEN]: ${slide.text}\n[LINK IMAGEN]: ${slide.imageUrl}`
    ).join('\n\n') || '';
    
    const audioConfig = social.production_notes?.music_url ? `[CONFIGURACIÓN DE AUDIO]:
URL: ${social.production_notes.music_url}
DURACIÓN_ORIGINAL: ${social.production_notes.music_duration}s
SINCRONIZACIÓN: Al inicio del video (0s)\n\n` : '';

    let content = `${social.marketingName?.toUpperCase() || `PACK SOCIAL ${index + 1}`}`;
    content += ` (${social.type?.toUpperCase()})${social.preconformed ? ' - PRE-CONFORMADO' : ''})\n\n`;
    content += `GANCHO: ${social.hook || 'Sin gancho'}\n\n`;
    content += `LINK DE DESTINO (PARA BOTÓN/BIO): ${landingLink}\n\n`;
    content += `CAPTION (PARA COPIAR EN REDES):\n`;
    content += `${social.caption || 'Sin caption'}\n\n`;
    content += `🔗 ${landingLink}\n\n`;
    content += `--------------------------------------------------\n\n`;
    content += `CONTENIDO PARA DISEÑO DE PLACAS:\n${slidesText}\n\n`;
    content += audioConfig;
    content += `HASHTAGS SUGERIDOS: ${(social.hashtags || []).map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')}\n`;
    
    if (options.includeValidationResults && social.validationResults) {
      content += `\n\n📋 PROTOCOLOS APLICADOS:\n`;
      content += JSON.stringify(social.validationResults, null, 2);
    }
    
    if (options.includeProtocolDetails && social.designTokens) {
      content += `\n\n🎨 COLORES AJUSTADOS:\n`;
      content += JSON.stringify(social.designTokens, null, 2);
    }
    
    return content;
  }).join('\n\n\n\n');
}

/**
 * Genera contenido formateado para anuncios
 */
export function formatAdsContent(ads: TemplateMetadata[], options: ExportOptions = {}): string {
  return ads.map((ad, index) => {
    let landingLink = 'https://tu-dominio.com/v/PAGE_ID';
    
    if (ad.landingId && ad.landingId !== 'mentor') {
      const [packId, vIdx] = ad.landingId.split('-');
      landingLink = `${options.baseUrl || 'https://btechacademy-8b329.web.app'}/v/${packId}?v=${vIdx}`;
    } else if (ad.landingId === 'mentor') {
      landingLink = 'URL_DEL_MENTOR_AQUÍ';
    }

    let content = `CONJUNTO DE ANUNCIOS ${index + 1}${ad.preconformed ? ' - PRE-CONFORMADO' : ''}\n\n`;
    content += `LINK DE DESTINO: ${landingLink}\n\n`;
    content += `TITULARES SUGERIDOS:\n`;
    content += `${(ad.headlines || []).map((h, hi) => `${hi + 1}. ${h}`).join('\n')}\n\n`;
    content += `DESCRIPCIONES:\n`;
    content += `${(ad.descriptions || []).map((d, di) => `D${di + 1}. ${d}`).join('\n')}\n\n`;
    content += `KEYWORDS SEO: ${(ad.keywords || []).join(', ')}\n`;
    
    if (options.includeValidationResults && ad.validationResults) {
      content += `\n\n📋 PROTOCOLOS APLICADOS:\n`;
      content += JSON.stringify(ad.validationResults, null, 2);
    }
    
    if (options.includeProtocolDetails && ad.designTokens) {
      content += `\n\n🎨 COLORES AJUSTADOS:\n`;
      content += JSON.stringify(ad.designTokens, null, 2);
    }
    
    return content;
  }).join('\n\n\n\n');
}

/**
 * Genera packs de exportación completos
 */
export function generateExportPacks(
  emails: TemplateMetadata[],
  socials: TemplateMetadata[],
  ads: TemplateMetadata[],
  options: ExportOptions = {}
): ExportPack[] {
  const defaultOptions = {
    includeValidationResults: true,
    includeTimestamps: true,
    includeProtocolDetails: true,
    ...options
  };
  
  return [
    {
      name: 'emails',
      content: formatEmailContent(emails, defaultOptions),
      metadata: {
        count: emails.length,
        type: 'email',
        exportedAt: new Date().toISOString()
      }
    },
    {
      name: 'social',
      content: formatSocialContent(socials, defaultOptions),
      metadata: {
        count: socials.length,
        type: 'social',
        exportedAt: new Date().toISOString()
      }
    },
    {
      name: 'ads',
      content: formatAdsContent(ads, defaultOptions),
      metadata: {
        count: ads.length,
        type: 'ads',
        exportedAt: new Date().toISOString()
      }
    }
  ];
}
