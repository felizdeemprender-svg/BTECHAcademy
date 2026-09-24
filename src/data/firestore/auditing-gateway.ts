import type { AiAuditingGateway } from '@/domain/auditing/use-cases/log-ai-interaction';
import type { FirestoreGateway } from '@/data/firestore/gateway';

export class FirestoreAiAuditingGateway implements AiAuditingGateway {
  constructor(private readonly gateway: FirestoreGateway) {}

  async hasSufficientCredits(userId: string, role: string, cost: number): Promise<boolean> {
    const doc = await this.gateway.getDoc('users', userId);
    if (!doc) return false;
    const data = doc.data() || {};
    
    // Asumimos un campo `aiCredits` genérico para simplificar
    const credits = typeof data.aiCredits === 'number' ? data.aiCredits : 0;
    return credits >= cost;
  }

  async deductCredits(userId: string, role: string, cost: number): Promise<void> {
    if (this.gateway.updateDoc && this.gateway.increment) {
      await this.gateway.updateDoc('users', userId, {
        aiCredits: this.gateway.increment(-cost)
      });
    }
  }

  async logAuditRecord(data: Record<string, unknown>): Promise<void> {
    if (!data.id) return;
    
    const finalData = {
      ...data,
      timestamp: this.gateway.serverTimestamp ? this.gateway.serverTimestamp() : new Date()
    };
    
    await this.gateway.createDoc('ai_audit_logs', data.id as string, finalData);
  }

  async scanContentForSensitiveTopics(text: string): Promise<{ isSafe: boolean; reason?: string }> {
    // Mock basico heurístico de temas prohibidos o sensibles.
    // TODO: Conectar esto con OpenAI / Anthropic / IA propietaria.
    const lower = text.toLowerCase();
    const bannedKeywords = ['contenido peligroso', 'estafa', 'fraude', 'armas'];
    
    for (const keyword of bannedKeywords) {
      if (lower.includes(keyword)) {
        return { isSafe: false, reason: `Contiene la frase prohibida: "${keyword}"` };
      }
    }

    return { isSafe: true };
  }
}
