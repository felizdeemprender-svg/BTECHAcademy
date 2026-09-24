import { adminDb } from '@/firebase/admin';

const ADNS_BASE_DIR = process.cwd() + '/public/adns';

/**
 * Valida que un adnId sea seguro (sin path traversal)
 * Solo permite: letras, números, guión bajo, guión medio
 */
export function validateAdnId(adnId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(adnId);
}

/**
 * Obtiene la ruta segura del directorio ADN
 * Lanza error si adnId no es válido
 */
export function getSafeAdnDir(adnId: string): string {
  if (!validateAdnId(adnId)) {
    throw new Error('ID de ADN inválido: solo se permiten letras, números, _ y -');
  }
  return `${ADNS_BASE_DIR}/${adnId}`;
}

export async function loadAdnConfig(adnId: string) {
  if (!validateAdnId(adnId)) {
    throw new Error('ID de ADN inválido');
  }
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const adnDir = getSafeAdnDir(adnId);
  const blueprintPath = path.join(adnDir, 'blueprint.json');
  const content = await fs.readFile(blueprintPath, 'utf-8');
  return JSON.parse(content);
}