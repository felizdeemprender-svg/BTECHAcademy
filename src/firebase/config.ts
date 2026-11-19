export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyC8Is74Io__gsvpCbrbDxo7EpY61cj1ruI',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'feliz-de-emprender.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'feliz-de-emprender',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'feliz-de-emprender.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '612058284616',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:612058284616:web:09e476dd0ce38580334e7d',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-8ZV72M87ZC'
};

if (typeof window !== 'undefined') {
  if (!firebaseConfig.apiKey) {
    console.error('[Firebase Config] CRÍTICO: No se detectó apiKey de Firebase.');
  } else {
    console.log('[Firebase Config] Inicializado con proyecto:', firebaseConfig.projectId);
  }
}
