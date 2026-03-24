import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';

export function getAdminApp() {
  if (getApps().length === 0) {
    return initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket
    });
  }
  return getApp();
}

export function getAdminFirestore() {
  const app = getAdminApp();
  return getFirestore(app);
}
