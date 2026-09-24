// Utilidades de seguridad para videos - AES-GCM (Web Crypto API)
// Reemplaza XOR reversible por encriptación auténtica

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Derivar key desde env (32 bytes para AES-256)
async function getEncryptionKey(): Promise<CryptoKey> {
  const rawKey = process.env.VIDEO_ENCRYPTION_KEY || '';
  if (!rawKey || rawKey.length < 32) {
    throw new Error('VIDEO_ENCRYPTION_KEY no configurada (mín 32 chars)');
  }
  
  const keyData = encoder.encode(rawKey.slice(0, 32));
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encriptar con AES-GCM (autenticado, no reversible sin key)
export async function encryptVideoToken(data: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV para AES-GCM
  const encoded = encoder.encode(data);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  
  // Combinar IV + ciphertext + authTag y codificar en base64url
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Desencriptar con AES-GCM (falla si token manipulado)
export async function decryptVideoToken(encrypted: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    
    // Decodificar base64url
    const binary = atob(
      encrypted.replace(/-/g, '+').replace(/_/g, '/')
    );
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }
    
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    return decoder.decode(decrypted);
  } catch {
    return ''; // Token inválido, manipulado o key incorrecta
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

// Generar URL segura de YouTube con token encriptado
export async function generateSecureYouTubeUrl(videoId: string, token: string): Promise<string> {
  const baseUrl = 'https://www.youtube-nocookie.com/embed/';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({
    modestbranding: '1',
    rel: '0',
    iv_load_policy: '3',
    controls: '1',
    hl: 'es',
    enablejsapi: '1',
    origin: origin,
    widgetid: '1'
  });
  
  const encryptedToken = await encryptVideoToken(token);
  params.append('token', encryptedToken);
  
  return `${baseUrl}${videoId}?${params.toString()}`;
}

// Validar token del iframe (AES-GCM: falla si manipulado)
export async function validateIframeToken(token: string): Promise<boolean> {
  try {
    const decrypted = await decryptVideoToken(token);
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
  ctx.fillText('Fastoria Video Security', 2, 2);
  
  const fingerprint = canvas.toDataURL().slice(-50);
  return fingerprint;
}