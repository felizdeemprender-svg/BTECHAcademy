'use server';

import { getAdminFirestore } from '@/firebase/admin';

export async function saveAiPricingConfig(config: any) {
  try {
    const adminDb = getAdminFirestore();
    await adminDb.doc('config/ai_pricing').set(config, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error("[Admin Config] Error saving AI pricing:", error);
    return { success: false, error: error.message || 'Error desconocido al guardar configuración' };
  }
}
