/**
 * UC — Actualizar configuración del bot de WhatsApp (F2.2).
 * Envía al worker (best-effort) y siempre hace backup en Firestore.
 */
import type { BotWorkerGateway } from '@/data/whatsapp/bot-worker-gateway';
import type { BotConfigRepository } from '@/data/whatsapp/bot-config-repo';

export async function updateBotConfig(
  worker: BotWorkerGateway,
  configRepo: BotConfigRepository,
  body: Record<string, unknown>,
): Promise<void> {
  await worker.saveSettings(body);
  await configRepo.saveConfig(body);
}