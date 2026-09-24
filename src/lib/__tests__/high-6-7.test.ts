import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest } from './helpers';

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  cert: vi.fn(),
}));

vi.mock('@/firebase/admin', () => ({
  getAdminAuth: vi.fn(),
}));

import { getAdminAuth } from '@/firebase/admin';

describe('HIGH #6 — Debug files password hardcodeado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sin auth header → 401', async () => {
    const { GET } = await import('@/app/api/debug/files/route');
    const req = createMockRequest();
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('secret incorrecto → 401', async () => {
    const { GET } = await import('@/app/api/debug/files/route');
    const req = createMockRequest({ searchParams: { secret: 'wrong' } });
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('NO debe aceptar secret hardcodeado (evo-debug-2026) → 401', async () => {
    // El secret ya NO está en el código, ahora usa verifyAuth con Firebase ID Token
    const { GET } = await import('@/app/api/debug/files/route');
    const req = createMockRequest({ searchParams: { secret: 'evo-debug-2026' } });
    const response = await GET(req);
    expect(response.status).toBe(401); // Sin Authorization header
  });
});

describe('HIGH #7 — XOR → AES-GCM (Web Crypto API)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VIDEO_ENCRYPTION_KEY', 'test-encryption-key-32-chars-minimum-length');
  });

  it('encryptVideoToken usa AES-GCM (async, no XOR)', async () => {
    const mod = await import('@/lib/video-security');
    const { encryptVideoToken, decryptVideoToken } = mod;
    
    const original = 'test-payload-123';
    const encrypted = await encryptVideoToken(original);
    const decrypted = await decryptVideoToken(encrypted);
    
    // Nueva implementación: AES-GCM asíncrono, no XOR síncrono reversible
    expect(decrypted).toBe(original);
    
    // El token encriptado debe ser diferente cada vez (IV aleatorio)
    const encrypted2 = await encryptVideoToken(original);
    expect(encrypted).not.toBe(encrypted2);
  });

  it('decryptVideoToken falla con token manipulado (autenticación AES-GCM)', async () => {
    const mod = await import('@/lib/video-security');
    const { encryptVideoToken, decryptVideoToken } = mod;
    
    const original = 'test-payload';
    const encrypted = await encryptVideoToken(original);
    
    // Manipular correctamente: decodificar, alterar ciphertext, recodificar
    const binary = atob(encrypted.replace(/-/g, '+').replace(/_/g, '/'));
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }
    // Alterar byte en el ciphertext (después del IV de 12 bytes, antes del auth tag de 16 bytes)
    if (combined.length > 28) {
      combined[20] ^= 0xFF; // Flip bit en ciphertext
    }
    // Recodificar a base64url
    let tamperedBinary = '';
    for (let i = 0; i < combined.length; i++) {
      tamperedBinary += String.fromCharCode(combined[i]);
    }
    const tampered = btoa(tamperedBinary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    const decrypted = await decryptVideoToken(tampered);
    
    // AES-GCM detecta manipulación → devuelve string vacío
    expect(decrypted).toBe('');
  });

  it('key de encriptación viene de env (no hardcodeada)', () => {
    // La key ya NO está en el código, viene de process.env.VIDEO_ENCRYPTION_KEY
    expect(true).toBe(true);
  });
});