// Utilidades de seguridad para videos

// Clave de encriptación simple (en producción usar una más robusta)
const ENCRYPTION_KEY = 'btech-video-encryption-2024';

// Encriptar string simple (XOR-based para desarrollo)
export function encryptVideoToken(data: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(
      data.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    );
  }
  return btoa(result); // Base64 para hacerlo seguro para URLs
}

// Desencriptar string
export function decryptVideoToken(encrypted: string): string {
  try {
    const decoded = atob(encrypted);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return result;
  } catch {
    return '';
  }
}

// Extraer videoId de URL de YouTube de forma segura
export function extractVideoId(url: string): string | null {
  if (!url) return null;
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
    if (url.includes('embed/')) return url.split('embed/')[1].split('?')[0];
    if (url.includes('/shorts/')) return url.split('/shorts/')[1].split('?')[0];
  }
  
  return null;
}

// Generar URL segura de YouTube con token
export function generateSecureYouTubeUrl(videoId: string, token: string): string {
  const baseUrl = 'https://www.youtube-nocookie.com/embed/';
  const params = new URLSearchParams({
    modestbranding: '1',
    rel: '0',
    iv_load_policy: '3',
    controls: '1',
    hl: 'es',
    enablejsapi: '1',
    origin: window.location.origin,
    widgetid: '1'
  });
  
  // Agregar token encriptado como parámetro
  const encryptedToken = encryptVideoToken(token);
  params.append('token', encryptedToken);
  
  return `${baseUrl}${videoId}?${params.toString()}`;
}

// Validar token del iframe
export function validateIframeToken(token: string): boolean {
  try {
    const decrypted = decryptVideoToken(token);
    if (!decrypted) return false;
    
    // Verificar estructura del token (JWT simple)
    const parts = decrypted.split('.');
    return parts.length === 3;
  } catch {
    return false;
  }
}

// Generar fingerprint del navegador para validación adicional
export function generateBrowserFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'unknown';
  
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('BTECH Video Security', 2, 2);
  
  const fingerprint = canvas.toDataURL().slice(-50);
  return fingerprint;
}
