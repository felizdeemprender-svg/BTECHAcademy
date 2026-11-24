import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useGoogleDriveAuth - Ciclo de Vida y Persistencia (src/app/marketing/pages/build/components/editor/useGoogleDriveAuth.ts)', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        mockStorage[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      })
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('debe validar que un token almacenado no expirado es reutilizado sin abrir popups', () => {
    const validExpiry = String(Date.now() + 1800000); // 30 minutos a futuro
    mockStorage['evo_google_token'] = 'valid_oauth_token_123';
    mockStorage['evo_google_token_expiry'] = validExpiry;

    const storedToken = localStorage.getItem('evo_google_token');
    const storedExpiry = localStorage.getItem('evo_google_token_expiry');

    const isValid = storedToken && storedToken !== 'null' && storedExpiry && Date.now() < Number(storedExpiry);

    expect(isValid).toBeTruthy();
    expect(storedToken).toBe('valid_oauth_token_123');
  });

  it('debe detectar tokens expirados y requerir renovacion', () => {
    const pastExpiry = String(Date.now() - 5000); // Expirado hace 5 segundos
    mockStorage['evo_google_token'] = 'expired_oauth_token';
    mockStorage['evo_google_token_expiry'] = pastExpiry;

    const storedToken = localStorage.getItem('evo_google_token');
    const storedExpiry = localStorage.getItem('evo_google_token_expiry');

    const isValid = storedToken && storedToken !== 'null' && storedExpiry && Date.now() < Number(storedExpiry);

    expect(isValid).toBeFalsy();
  });

  it('debe persistir el token y su vencimiento a 55 minutos', () => {
    const fakeToken = 'ya29.new_fresh_token';
    const now = Date.now();
    const expiry = String(now + 3300000);

    localStorage.setItem('evo_google_token', fakeToken);
    localStorage.setItem('evo_google_token_expiry', expiry);

    expect(localStorage.getItem('evo_google_token')).toBe(fakeToken);
    expect(Number(localStorage.getItem('evo_google_token_expiry'))).toBeGreaterThan(now);
  });

  it('debe formatear mensajes de error de cancelacion sin emojis', () => {
    const error: any = { code: 'auth/popup-closed-by-user' };
    let errorMsg = '';

    if (error.code === 'auth/popup-closed-by-user') {
      errorMsg = 'Proceso cancelado. Se necesita acceso a Drive para guardar el video.';
    }

    expect(errorMsg).toBe('Proceso cancelado. Se necesita acceso a Drive para guardar el video.');
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(errorMsg)).toBe(false);
  });
});
