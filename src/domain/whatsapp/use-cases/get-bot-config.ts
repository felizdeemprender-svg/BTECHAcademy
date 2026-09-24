/**
 * UC — Obtener configuración del bot de WhatsApp (F2.2).
 * Estrategia legacy exacta: primero el worker remoto; si falla,
 * Firestore `config/whatsapp_bot`; si tampoco, defaults duros.
 */
import type { BotWorkerGateway } from '@/data/whatsapp/bot-worker-gateway';
import type { BotConfigRepository } from '@/data/whatsapp/bot-config-repo';

export const DEFAULT_BOT_SETTINGS: Record<string, unknown> = {
  tone: 'amigable',
  systemPrompt: `Sos el Asistente Virtual Oficial de Fastoria. Respondés de manera clara, entusiasta y precisa sobre nuestros planes, academia, herramientas de IA y mentoría.

Reglas clave:
1. Si el usuario pregunta por precios o características de planes, respondé con la información oficial sincronizada.
2. Si el usuario tiene dudas avanzadas de compra o desea negociar, derivalo cordialmente al equipo de Ventas.
3. Si el usuario tiene problemas de acceso o errores técnicos, derivalo al equipo de Soporte Técnico.
4. Mantené siempre un trato profesional, cálido y conciso.`,
  temperature: 0.7,
  maxTokens: 500,
  salesGroupJid: '120363384910293847@g.us',
  supportGroupJid: '120363294857201938@g.us',
  model: 'deepseek/deepseek-chat-v3.1',
  autoHandoffEnabled: true,
};

export async function getBotConfig(
  worker: BotWorkerGateway,
  configRepo: BotConfigRepository,
): Promise<Record<string, unknown>> {
  const workerSettings = await worker.getSettings();
  if (workerSettings) return workerSettings;

  const firestore = await configRepo.getConfig();
  if (firestore) return firestore;

  return DEFAULT_BOT_SETTINGS;
}