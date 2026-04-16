export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Diagnostic log for production debugging
if (typeof window !== 'undefined') {
  if (!firebaseConfig.apiKey) {
    console.error('[Firebase Config] CRÍTICO: No se detectó apiKey de Firebase. Verifica las variables de entorno.');
  } else {
    console.log('[Firebase Config] Inicializado correctamente con proyecto:', firebaseConfig.projectId);
  }
}
