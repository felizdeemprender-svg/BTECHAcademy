import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';

export function getAdminApp() {
  if (getApps().length > 0) return getApp();

  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  
  // 1. Local Development with Service Account
  if (fs.existsSync(serviceAccountPath)) {
    console.log('[Firebase Admin] Usando archivo service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    return initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FB_ADMIN_STORAGE_BUCKET || firebaseConfig.storageBucket
    });
  }

  // 2. Custom Environment Variables (Optional)
  if (process.env.FB_ADMIN_PROJECT_ID) {
    console.log('[Firebase Admin] Inicializando con variables FB_ADMIN');
    return initializeApp({
      projectId: process.env.FB_ADMIN_PROJECT_ID,
      storageBucket: process.env.FB_ADMIN_STORAGE_BUCKET
    });
  }

  // 3. Automated Detection (FIREBASE_CONFIG is auto-set by the runtime)
  if (process.env.FIREBASE_CONFIG) {
    try {
      const fbConfig = JSON.parse(process.env.FIREBASE_CONFIG);
      console.log('[Firebase Admin] Inicializando usando FIREBASE_CONFIG detectado.');
      return initializeApp({
        projectId: fbConfig.projectId,
        storageBucket: fbConfig.storageBucket || `${fbConfig.projectId}.appspot.com`
      });
    } catch (e) {
      console.error('[Firebase Admin] Error parseando FIREBASE_CONFIG:', e);
    }
  }

  // 4. Production Default (Managed Environments)
  // En Cloud Functions o App Hosting, initializeApp() detecta automáticamente las credenciales.
  console.log('[Firebase Admin] Inicializando con credenciales por defecto del entorno.');
  return initializeApp();
}

export function getAdminFirestore() {
  const app = getAdminApp();
  return getFirestore(app);
}

export function getAdminStorage() {
  const app = getAdminApp();
  const { getStorage } = require('firebase-admin/storage');
  return getStorage(app);
}
