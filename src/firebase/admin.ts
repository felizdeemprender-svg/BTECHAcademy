import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';

export function getAdminApp() {
  if (getApps().length === 0) {
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
    
    let config: any = {
      projectId: process.env.FB_ADMIN_PROJECT_ID || firebaseConfig.projectId,
      storageBucket: process.env.FB_ADMIN_STORAGE_BUCKET || firebaseConfig.storageBucket
    };

    // Si el archivo de cuenta de servicio existe, lo usamos para autenticar localmente
    if (fs.existsSync(serviceAccountPath)) {
      console.log('[Firebase Admin] Usando archivo service-account.json');
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      config.credential = cert(serviceAccount);
    } else {
      console.warn('[Firebase Admin] No se encontró service-account.json. Usando credenciales por defecto (puede fallar localmente).');
    }

    return initializeApp(config);
  }
  return getApp();
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
