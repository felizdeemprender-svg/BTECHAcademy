import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { firebaseConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';

export function getAdminApp() {
  if (getApps().length > 0) return getApp();

  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  let serviceAccountPath = explicitPath 
    ? path.resolve(process.cwd(), explicitPath) 
    : (fs.existsSync(path.join(process.cwd(), 'service-account-test.json'))
        ? path.join(process.cwd(), 'service-account-test.json')
        : path.join(process.cwd(), 'service-account.json'));
  
  // 1. Desarrollo Local con archivo de cuenta de servicio
  if (fs.existsSync(serviceAccountPath)) {
    console.log(`[Firebase Admin] Usando archivo ${path.basename(serviceAccountPath)}`);
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    return initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FB_ADMIN_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket
    });
  }

  // 2. Producción (Google Cloud / Firebase Managed)
  // En Cloud Functions o App Hosting, initializeApp() sin argumentos usa 
  // automáticamente las credenciales por defecto del entorno (ADC).
  console.log('[Firebase Admin] Inicializando con "Default Initialization" (Producción).');
  
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  if (!process.env.GCLOUD_PROJECT && projectId) {
    process.env.GCLOUD_PROJECT = projectId;
  }
  if (!process.env.GOOGLE_CLOUD_PROJECT && projectId) {
    process.env.GOOGLE_CLOUD_PROJECT = projectId;
  }
  
  return initializeApp({
    projectId: projectId,
    storageBucket: process.env.FB_ADMIN_STORAGE_BUCKET || firebaseConfig.storageBucket
  });
}

export function hasAdminCredentials(): boolean {
  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (explicitPath && fs.existsSync(path.resolve(process.cwd(), explicitPath))) {
    return true;
  }

  const currentProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  if (currentProjectId === 'feliz-de-emprender' && fs.existsSync(path.join(process.cwd(), 'service-account-test.json'))) {
    return true;
  }

  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');

  // En local, solo consideramos Admin válido si hay un service-account explícito.
  if (fs.existsSync(serviceAccountPath)) {
    return true;
  }

  // En producción, las credenciales de ADC están garantizadas por el entorno.
  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  return false;
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

export function getAdminAuth() {
  const app = getAdminApp();
  return getAuth(app);
}

/**
 * Guarda un buffer en Storage y retorna una URL pública y resiliente.
 * En entornos Cloud Run donde la Service Account carece del rol iam.serviceAccountTokenCreator
 * (SigningError: Permission 'iam.serviceAccounts.signBlob' denied), utiliza automáticamente
 * el token de descarga nativo de Firebase Storage con acceso público permanente.
 */
export async function saveBufferAndGetPublicUrl(
  bucket: any,
  destination: string,
  buffer: Buffer,
  contentType: string = 'image/png'
): Promise<string> {
  const crypto = await import('crypto');
  const downloadToken = crypto.randomUUID();
  const file = bucket.file(destination);

  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken
      }
    }
  });

  try {
    const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: '01-01-2050' });
    return signedUrl;
  } catch (err: any) {
    console.warn(`[Storage] Fallback por SigningError en Cloud Run (${err.message}). Usando token de descarga de Firebase.`);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${downloadToken}`;
  }
}

/**
 * Sube un archivo local a Storage y retorna una URL pública y resiliente.
 */
export async function uploadFileAndGetPublicUrl(
  bucket: any,
  filePath: string,
  destination: string,
  contentType: string = 'video/mp4'
): Promise<string> {
  const crypto = await import('crypto');
  const downloadToken = crypto.randomUUID();
  const file = bucket.file(destination);

  await bucket.upload(filePath, {
    destination,
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken
      }
    }
  });

  try {
    const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: '01-01-2050' });
    return signedUrl;
  } catch (err: any) {
    console.warn(`[Storage] Fallback por SigningError en Cloud Run (${err.message}). Usando token de descarga de Firebase.`);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${downloadToken}`;
  }
}
