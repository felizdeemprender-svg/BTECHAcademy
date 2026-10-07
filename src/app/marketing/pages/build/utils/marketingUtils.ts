/**
 * @fileOverview Utilidades centralizadas para la lógica de marketing y redes sociales.
 * Aquí residen las reglas de negocio sobre resoluciones, cleaning de perfiles y nomenclatura.
 */

export type SocialResolution = '1080x1920' | '1080x1350' | '1080x1080';

/**
 * Retorna la resolución óptima según plataforma y tipo de activo.
 */
export function getSocialResolution(platform: string, type: string): SocialResolution {
  if (platform === 'tiktok' || type === 'story') {
    return '1080x1920';
  }
  if (['instagram', 'twitter', 'linkedin'].includes(platform)) {
    return '1080x1350';
  }
  return '1080x1080';
}

/**
 * Limpia un handle de red social (ej: extract 'usuario' de 'https://ig.com/usuario' o '@usuario').
 */
export function cleanSocialHandle(rawHandle: string): string | null {
  if (!rawHandle || typeof rawHandle !== 'string') return null;
  
  let handle = rawHandle.trim().replace('@', '');
  
  if (handle.includes('http')) {
    // Extraer el último segmento de la URL
    handle = handle.split('/').filter(Boolean).pop() || '';
    // Limpiar posibles parámetros de búsqueda (?ref=...)
    if (handle.includes('?')) {
      handle = handle.split('?')[0];
    }
  }
  
  return handle || null;
}

/**
 * Retorna las etiquetas y badges apropiados para cada tipo de formato.
 */
export function getPlatformLabels(type: string) {
  switch (type) {
    case 'carousel':
      return {
        title: 'Edición de Placas / Slides',
        badge: 'SLIDES',
        isDocument: false
      };
    case 'document':
      return {
        title: 'Maquetación de Documento PDF',
        badge: 'PÁGINAS',
        isDocument: true
      };
    default:
      return {
        title: 'Edición de Escenas de Video',
        badge: 'ESCENAS',
        isDocument: false
      };
  }
}
