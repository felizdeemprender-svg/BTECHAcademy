// Firebase App Hosting provides FIREBASE_WEBAPP_CONFIG as a JSON string during build and runtime.
const getAppHostingConfig = () => {
  if (typeof process !== 'undefined' && process.env.FIREBASE_WEBAPP_CONFIG) {
    try {
      return JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    } catch (e) {
      console.error('[Firebase Config] Error parsing FIREBASE_WEBAPP_CONFIG:', e);
    }
  }
  return {};
};

const appHostingConfig = getAppHostingConfig();

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || appHostingConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || appHostingConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || appHostingConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || appHostingConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || appHostingConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || appHostingConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || appHostingConfig.measurementId
};

// Diagnostic log for production debugging
if (typeof window !== 'undefined') {
  if (!firebaseConfig.apiKey) {
    console.error('[Firebase Config] CRÍTICO: No se detectó apiKey de Firebase. Verifica las variables de entorno.');
  } else {
    console.log('[Firebase Config] Inicializado correctamente con proyecto:', firebaseConfig.projectId);
  }
}
