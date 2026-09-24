/**
 * Capa de datos — Gateway HTTP a Evolution API (F2.2).
 * Aísla las URLs/headers de Evolution (instancia `fastoria`).
 * `fetch` inyectable para tests sin red.
 */

export interface EvolutionStatusResult {
  state: 'open' | 'close' | string;
  qrCode: string;
  pairingCode: string;
  phone: string;
}

export interface EvolutionGateway {
  /** Estado real y número conectado (fetchInstances + connectionState fallback). */
  fetchStatus(): Promise<EvolutionStatusResult>;
  /** Solicita QR de conexión. */
  connect(): Promise<{ qrCode: string; pairingCode: string; state: string }>;
  /** Cierra la sesión de WhatsApp. */
  logout(): Promise<boolean>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://bilon.pagarqr.ar/fastoria-evolution';
const INTERNAL_PROXY_TOKEN = process.env.WHATSAPP_INTERNAL_PROXY_TOKEN || 'fastoria_proxy_token_98374fa21bc894de01';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'fastoria_evo_key_8f92a10b45cd2e1a87';

export class HttpEvolutionGateway implements EvolutionGateway {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(opts?: { baseUrl?: string; fetchImpl?: FetchLike }) {
    this.baseUrl = opts?.baseUrl ?? EVOLUTION_API_URL;
    this.fetchImpl = opts?.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  private evoHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-internal-proxy-token': INTERNAL_PROXY_TOKEN,
      'apikey': EVOLUTION_API_KEY,
    };
  }

  private async getJson(path: string): Promise<unknown | null> {
    try {
      const res = await this.fetchImpl(`${this.baseUrl}${path}`, { method: 'GET', headers: this.evoHeaders() });
      if (!res.ok) return null;
      return (await res.json()) as unknown;
    } catch {
      return null;
    }
  }

  private extractQr(data: unknown): { qrCode: string; pairingCode: string; state: string } {
    const d = (data ?? {}) as Record<string, unknown>;
    const q = d.qrcode as Record<string, unknown> | undefined;
    return {
      qrCode: String(d.base64 ?? q?.base64 ?? d.code ?? ''),
      pairingCode: String(d.pairingCode ?? ''),
      state: String(d.state ?? 'connecting'),
    };
  }

  async fetchStatus(): Promise<EvolutionStatusResult> {
    let state = 'close';
    let phone = '';

    const instances = await this.getJson('/instance/fetchInstances');
    if (instances !== null) {
      const arr = Array.isArray(instances) ? instances : [];
      const inst = arr.find((i) => (i as { name?: string }).name === 'fastoria');
      if (inst) {
        const instData = inst as { connectionStatus?: string; ownerJid?: string; number?: string };
        state = instData.connectionStatus === 'open' ? 'open' : instData.connectionStatus || 'close';
        if (instData.ownerJid) phone = instData.ownerJid.replace('@s.whatsapp.net', '');
        else if (instData.number) phone = instData.number;
      }
    }

    if (state !== 'open') {
      const conn = await this.getJson('/instance/connectionState/fastoria');
      if (conn !== null) {
        const connData = conn as { instance?: { state?: string; owner?: string }; state?: string };
        const connState = connData?.instance?.state || connData?.state;
        if (connState === 'open') {
          state = 'open';
          if (connData?.instance?.owner) phone = connData.instance.owner.replace('@s.whatsapp.net', '');
        }
      }
    }

    let qrCode = '';
    let pairingCode = '';
    if (state !== 'open') {
      const qr = await this.getJson('/instance/connect/fastoria');
      if (qr !== null) {
        const extracted = this.extractQr(qr);
        qrCode = extracted.qrCode;
        pairingCode = extracted.pairingCode;
      }
    }

    return { state, qrCode, pairingCode, phone };
  }

  async connect(): Promise<{ qrCode: string; pairingCode: string; state: string }> {
    const qr = await this.getJson('/instance/connect/fastoria');
    return this.extractQr(qr);
  }

  async logout(): Promise<boolean> {
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/instance/logout/fastoria`, {
        method: 'DELETE',
        headers: this.evoHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}