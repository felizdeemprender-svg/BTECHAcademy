/**
 * Capa de datos — Repo de configuración del bot de WhatsApp (F2.2).
 * Lee/escribe `config/whatsapp_bot` en Firestore (backup del worker).
 * Usa `FirestoreGateway` inyectable (tests sin Firestore real).
 */

import type { FirestoreGateway } from '@/data/firestore/gateway';

export interface BotConfigRepository {
  getConfig(): Promise<Record<string, unknown> | null>;
  saveConfig(config: Record<string, unknown>): Promise<boolean>;
}

const COLLECTION = 'config';
const DOC_ID = 'whatsapp_bot';

export class FirestoreBotConfigRepository implements BotConfigRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async getConfig(): Promise<Record<string, unknown> | null> {
    const snap = await this.gateway.getDoc(COLLECTION, DOC_ID);
    if (!snap?.exists) return null;
    const data = snap.data() as Record<string, unknown>;
    return data ?? null;
  }

  async saveConfig(config: Record<string, unknown>): Promise<boolean> {
    if (this.gateway.mergeDoc) {
      await this.gateway.mergeDoc(COLLECTION, DOC_ID, {
        ...config,
        updatedAt: new Date().toISOString(),
      });
      return true;
    }
    // Fallback sin mergeDoc: createDoc (falla si existe) -> updateDoc
    const existing = await this.getConfig();
    if (existing) {
      await this.gateway.updateDoc(COLLECTION, DOC_ID, {
        ...config,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await this.gateway.createDoc(COLLECTION, DOC_ID, {
        ...config,
        updatedAt: new Date().toISOString(),
      });
    }
    return true;
  }
}