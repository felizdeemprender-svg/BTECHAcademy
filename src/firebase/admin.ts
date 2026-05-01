import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';

export function getAdminApp() {
  if (getApps().length > 0) return getApp();

  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  
  // 1. Desarrollo Local con archivo de cuenta de servicio
  if (fs.existsSync(serviceAccountPath)) {
    console.log('[Firebase Admin] Usando archivo service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    return initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FB_ADMIN_STORAGE_BUCKET || firebaseConfig.storageBucket
    });
  }

  // 2. Producción (Google Cloud / Firebase Managed)
  // En Cloud Functions o App Hosting, initializeApp() sin argumentos usa 
  // automáticamente las credenciales por defecto del entorno (ADC).
  console.log('[Firebase Admin] Inicializando con "Default Initialization" (Producción).');
  return initializeApp();
}

export function getAdminFirestore() {
  const app = getAdminApp();
  const db = getFirestore(app);
  
  // Soporte para Emulador en servidor
  if (process.env.NODE_ENV === 'development' && !process.env.FIREBASE_FIRESTORE_EMULATOR_HOST) {
    // Si no está la variable de entorno pero estamos en dev, intentamos conectar al puerto por defecto
    // Nota: Esto es opcional si ya tienes la variable de entorno configurada en tu terminal
  }

  return db;
}

export const adminDb = getAdminFirestore();

export function getAdminStorage() {
  const app = getAdminApp();
  const { getStorage } = require('firebase-admin/storage');
  return getStorage(app);
}

export const adminStorage = getAdminStorage();
