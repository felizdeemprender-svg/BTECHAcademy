'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para gestionar la autenticación OAuth y el ciclo de vida de tokens de Google Drive
 * requeridos para la exportación y guardado de videos producidos.
 */
export function useGoogleDriveAuth() {
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  // 1. Cargar token persistido al montar
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('evo_google_token');
      if (savedToken && savedToken !== 'null') {
        setGoogleToken(savedToken);
      }
    } catch (e) {
      console.warn('[useGoogleDriveAuth] Fallo al leer evo_google_token desde localStorage:', e);
    }
  }, []);

  // 2. Persistir token cuando cambie
  useEffect(() => {
    if (googleToken && googleToken !== 'null') {
      try {
        localStorage.setItem('evo_google_token', googleToken);
      } catch (e) {
        console.warn('[useGoogleDriveAuth] Fallo al guardar evo_google_token en localStorage:', e);
      }
    }
  }, [googleToken]);

  // 3. Obtener o renovar token de forma segura
  const ensureGoogleToken = useCallback(async (): Promise<string | null> => {
    let storedToken: string | null = null;
    let storedExpiry: string | null = null;

    try {
      storedToken = localStorage.getItem('evo_google_token');
      storedExpiry = localStorage.getItem('evo_google_token_expiry');
    } catch (e) {
      console.warn('[useGoogleDriveAuth] Fallo al acceder a localStorage:', e);
    }

    // Los tokens de Google Drive expiran en 1 hora. Validamos con margen de seguridad.
    const isValid = storedToken && storedToken !== 'null' && storedExpiry && Date.now() < Number(storedExpiry);

    if (isValid && googleToken === storedToken) return googleToken;
    if (isValid) {
      setGoogleToken(storedToken);
      return storedToken;
    }

    // Si expiró o no existe, renovarlo transparentemente con Firebase Auth
    const { initializeFirebase } = await import('@/firebase');
    const { auth } = initializeFirebase();
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');

    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');

    if (auth.currentUser?.email) {
      provider.setCustomParameters({ login_hint: auth.currentUser.email });
    }

    try {
      const authResult = await signInWithPopup(auth, provider);
      const accessToken = GoogleAuthProvider.credentialFromResult(authResult)?.accessToken || null;

      if (accessToken) {
        setGoogleToken(accessToken);
        try {
          localStorage.setItem('evo_google_token', accessToken);
          // Guardamos expiración a los 55 minutos (3300000 ms)
          localStorage.setItem('evo_google_token_expiry', String(Date.now() + 3300000));
        } catch (e) {
          console.warn('[useGoogleDriveAuth] Fallo al almacenar nuevo token en localStorage:', e);
        }
      }
      return accessToken;
    } catch (error: any) {
      console.warn('[useGoogleDriveAuth] No se pudo renovar token de Google Drive:', error.message || error);
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Proceso cancelado. Se necesita acceso a Drive para guardar el video.');
      }
      throw new Error('No se pudo conectar con tu Google Drive de tutor.');
    }
  }, [googleToken]);

  return {
    googleToken,
    setGoogleToken,
    ensureGoogleToken
  };
}
