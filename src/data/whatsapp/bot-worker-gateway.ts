/**
 * Capa de datos — Gateway HTTP al Worker de WhatsApp (F2.2).
 * Único lugar que conoce las URLs/headers del worker remoto
 * (`WHATSAPP_BOT_API_URL`, tokens internos). `fetch` inyectable
 * para testear sin red (mismo patrón que F0.2/F1.x).
 *
 * Los métodos devuelven el JSON crudo del worker o `null` en
 * error de red (igual que el legacy, que degradaba a defaults
 * en catch).
 */

export interface BotWorkerGateway {
  getStatus(): Promise<Record<string, unknown> | null>;
  getSettings(): Promise<Record<string, unknown> | null>;
  getConversations(): Promise<Record<string, unknown> | null>;
  getMessages(phone: string): Promise<Record<string, unknown> | null>;
  getKnowledge(): Promise<Record<string, unknown> | null>;
  saveSettings(body: Record<string, unknown>): Promise<boolean>;
  createKnowledge(body: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  bulkKnowledge(items: Array<Record<string, unknown>>): Promise<boolean>;
  deleteKnowledge(id: string): Promise<Record<string, unknown> | null>;
  sendMessage(phone: string, text: string, senderName?: string): Promise<Record<string, unknown> | null>;
  setMode(phone: string, mode: string): Promise<Record<string, unknown> | { status: number; error: string }>;
  transfer(phone: string, department: string, reason?: string): Promise<Record<string, unknown> | null>;
  updateConversation(phone: string, body: Record<string, unknown>): Promise<Record<string, unknown> | null>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const BOT_WORKER_URL = process.env.WHATSAPP_BOT_API_URL || 'https://bilon.pagarqr.ar/fastoria-worker';
const INTERNAL_PROXY_TOKEN = process.env.WHATSAPP_INTERNAL_PROXY_TOKEN || 'fastoria_proxy_token_98374fa21bc894de01';
const BOT_API_KEY = process.env.WHATSAPP_BOT_API_KEY || 'fastoria_secret_api_key_2026';

export class HttpBotWorkerGateway implements BotWorkerGateway {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(opts?: { baseUrl?: string; fetchImpl?: FetchLike }) {
    this.baseUrl = opts?.baseUrl ?? BOT_WORKER_URL;
    this.fetchImpl = opts?.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  private workerHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-internal-proxy-token': INTERNAL_PROXY_TOKEN,
      'x-api-key': BOT_API_KEY,
      'Authorization': `Bearer ${BOT_API_KEY}`,
    };
  }

  private async req<T>(path: string, init?: RequestInit): Promise<T | null> {
    try {
      const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: init?.method ?? 'GET',
        headers: { ...this.workerHeaders(), ...(init?.headers ?? {}) },
        body: init?.body,
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  getStatus(): Promise<Record<string, unknown> | null> {
    return this.req('/api/status');
  }

  getSettings(): Promise<Record<string, unknown> | null> {
    return this.req('/api/settings');
  }

  getConversations(): Promise<Record<string, unknown> | null> {
    return this.req('/api/conversations');
  }

  getMessages(phone: string): Promise<Record<string, unknown> | null> {
    return this.req(`/api/conversations/${encodeURIComponent(phone)}/messages`);
  }

  getKnowledge(): Promise<Record<string, unknown> | null> {
    return this.req('/api/knowledge');
  }

  saveSettings(body: Record<string, unknown>): Promise<boolean> {
    return this.req('/api/settings', { method: 'POST', body: JSON.stringify(body) }).then((r) => r !== null);
  }

  createKnowledge(body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    return this.req('/api/knowledge', { method: 'POST', body: JSON.stringify(body) });
  }

  bulkKnowledge(items: Array<Record<string, unknown>>): Promise<boolean> {
    return this.req('/api/knowledge/bulk', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }).then((r) => r !== null);
  }

  deleteKnowledge(id: string): Promise<Record<string, unknown> | null> {
    return this.req(`/api/knowledge/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  sendMessage(phone: string, text: string, senderName?: string): Promise<Record<string, unknown> | null> {
    return this.req(`/api/conversations/${encodeURIComponent(phone)}/send`, {
      method: 'POST',
      body: JSON.stringify({ text, senderName: senderName || 'Operador Fastoria' }),
    });
  }

  async setMode(phone: string, mode: string): Promise<Record<string, unknown> | { status: number; error: string }> {
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/conversations/${encodeURIComponent(phone)}/mode`, {
        method: 'POST',
        headers: this.workerHeaders(),
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        return { status: res.status, error: String(errData.error ?? errData.message ?? 'Error al cambiar modo') };
      }
      return (await res.json()) as Record<string, unknown>;
    } catch {
      return { status: 500, error: 'Error al cambiar modo' };
    }
  }

  transfer(phone: string, department: string, reason?: string): Promise<Record<string, unknown> | null> {
    return this.req(`/api/conversations/${encodeURIComponent(phone)}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ department, reason: reason || 'Transferencia manual desde Live Chat' }),
    });
  }

  updateConversation(phone: string, body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    return this.req(`/api/conversations/${encodeURIComponent(phone)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
}