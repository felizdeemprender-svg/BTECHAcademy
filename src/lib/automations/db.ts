import { adminDb } from '@/firebase/admin';
import { AutomationRule, AutomationLog } from './rules-schema';

const COLLECTION_NAME = 'automations_rules';

/**
 * Guarda una nueva regla de automatización o actualiza una existente
 */
export async function saveAutomationRule(rule: AutomationRule): Promise<string> {
  const isNew = !rule.id;
  const docRef = isNew 
    ? adminDb.collection(COLLECTION_NAME).doc() 
    : adminDb.collection(COLLECTION_NAME).doc(rule.id as string);

  const now = Date.now();
  const ruleData = {
    ...rule,
    id: docRef.id,
    updatedAt: now,
    ...(isNew ? { createdAt: now } : {})
  };

  await docRef.set(ruleData, { merge: true });
  return docRef.id;
}

/**
 * Obtiene las reglas de un tutor específico
 */
export async function getRulesByTutor(tutorId: string): Promise<AutomationRule[]> {
  const snapshot = await adminDb.collection(COLLECTION_NAME)
    .where('tutorId', '==', tutorId)
    .get();

  if (snapshot.empty) return [];
  return snapshot.docs.map(doc => doc.data() as AutomationRule);
}

/**
 * Obtiene todas las reglas activas (usado por el Cron Engine)
 */
export async function getActiveRules(): Promise<AutomationRule[]> {
  const snapshot = await adminDb.collection(COLLECTION_NAME)
    .where('isActive', '==', true)
    .get();

  if (snapshot.empty) return [];
  return snapshot.docs.map(doc => doc.data() as AutomationRule);
}

/**
 * Elimina una regla por ID
 */
export async function deleteRule(ruleId: string, tutorId: string): Promise<boolean> {
  const docRef = adminDb.collection(COLLECTION_NAME).doc(ruleId);
  const doc = await docRef.get();
  
  if (!doc.exists) return false;
  
  // Seguridad: asegurar que pertenezca al tutor
  if (doc.data()?.tutorId !== tutorId) {
    throw new Error("No tienes permisos para eliminar esta regla");
  }

  await docRef.delete();
  return true;
}

const LOGS_COLLECTION = 'automations_logs';

/**
 * Guarda un log básico de la ejecución de una automatización
 */
export async function saveAutomationLog(log: AutomationLog): Promise<string> {
  const docRef = adminDb.collection(LOGS_COLLECTION).doc();
  const logData = {
    ...log,
    id: docRef.id,
    timestamp: log.timestamp || Date.now()
  };
  await docRef.set(logData);
  return docRef.id;
}
