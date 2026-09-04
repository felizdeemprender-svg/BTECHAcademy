export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyD7srVAfI5ZtES_-5Syblh1z9_lHIj_gVk',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'btechacademy-8b329.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'btechacademy-8b329',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'btechacademy-8b329.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '493585665928',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:493585665928:web:8cf8b7523790d81099343d',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-FE870RV1MM'
};

if (typeof window !== 'undefined') {
  if (!firebaseConfig.apiKey) {
    console.error('[Firebase Config] CRÍTICO: No se detectó apiKey de Firebase.');
  } else {
    console.log('[Firebase Config] Inicializado con proyecto:', firebaseConfig.projectId);
  }
}
