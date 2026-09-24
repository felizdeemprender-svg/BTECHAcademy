/**
 * F2.2 (TDD verde) — Handlers del bot de WhatsApp con gateways fake.
 * Verifica envelopes legacy EXACTOS y auth admin. Sin red real:
 * `BotWorkerGateway`/`EvolutionGateway`/`BotConfigRepository` falsos.
 */
import { describe, expect, it } from 'vitest';

import type { DocSnapshotLike, FirestoreGateway, QuerySnapshotLike } from '@/data/firestore/gateway';
import type { BotConfigRepository } from '@/data/whatsapp/bot-config-repo';
import type { BotWorkerGateway } from '@/data/whatsapp/bot-worker-gateway';
import type { EvolutionGateway } from '@/data/whatsapp/evolution-gateway';
import { DEFAULT_BOT_SETTINGS } from '@/domain/whatsapp/use-cases';

import type { Caller } from '../mentor-auth';
import {
  handleBotConnect,
  handleBotCreateKnowledge,
  handleBotDeleteKnowledge,
  handleBotGetSettings,
  handleBotListConversations,
  handleBotListKnowledge,
  handleBotListMessages,
  handleBotLogout,
  handleBotSaveSettings,
  handleBotSendMessage,
  handleBotStatus,
  handleBotSyncPlans,
  handleBotToggleMode,
  handleBotTransfer,
  handleBotUpdateConversation,
  type WhatsAppBotDeps,
} from '../whatsapp-bot-handlers';

const ADMIN: Caller = { uid: 'admin-1', isAdmin: true };
const NOT_ADMIN: Caller | null = null;

function snap(id: string, raw: Record<string, unknown>): DocSnapshotLike {
  return { exists: true, id, data: () => raw };
}

class FakeConfigRepo implements BotConfigRepository {
  private store: Record<string, unknown> | null = null;
  constructor(private readonly failGet = false, private readonly failSave = false) {}
  async getConfig(): Promise<Record<string, unknown> | null> {
    if (this.failGet) return null;
    return this.store ? { ...this.store } : null;
  }
  async saveConfig(config: Record<string, unknown>): Promise<boolean> {
    if (this.failSave) return false;
    this.store = { ...config };
    return true;
  }
}

class FakeWorker implements BotWorkerGateway {
  readonly calls: string[] = [];
  constructor(private readonly responses: Record<string, unknown> | null = null, private readonly status = 'running') {}
  private respond(): Record<string, unknown> | null {
    return this.responses ? { ...this.responses } : null;
  }
  async getStatus(): Promise<Record<string, unknown> | null> {
    this.calls.push('getStatus');
    return { status: this.status };
  }
  async getSettings(): Promise<Record<string, unknown> | null> {
    this.calls.push('getSettings');
    return this.respond();
  }
  async getConversations(): Promise<Record<string, unknown> | null> {
    this.calls.push('getConversations');
    return this.respond();
  }
  async getMessages(_phone: string): Promise<Record<string, unknown> | null> {
    this.calls.push('getMessages');
    return this.respond();
  }
  async getKnowledge(): Promise<Record<string, unknown> | null> {
    this.calls.push('getKnowledge');
    return this.respond();
  }
  async saveSettings(_body: Record<string, unknown>): Promise<boolean> {
    this.calls.push('saveSettings');
    return this.responses !== null;
  }
  async createKnowledge(_body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    this.calls.push('createKnowledge');
    return this.respond();
  }
  async bulkKnowledge(_items: Array<Record<string, unknown>>): Promise<boolean> {
    this.calls.push('bulkKnowledge');
    return true;
  }
  async deleteKnowledge(_id: string): Promise<Record<string, unknown> | null> {
    this.calls.push('deleteKnowledge');
    return this.respond();
  }
  async sendMessage(_phone: string, _text: string, _sender?: string): Promise<Record<string, unknown> | null> {
    this.calls.push('sendMessage');
    return this.respond();
  }
  async setMode(_phone: string, _mode: string): Promise<Record<string, unknown> | { status: number; error: string }> {
    this.calls.push('setMode');
    return this.responses ?? { status: 500, error: 'Error al cambiar modo' };
  }
  async transfer(_phone: string, _dept: string, _reason?: string): Promise<Record<string, unknown> | null> {
    this.calls.push('transfer');
    return this.respond();
  }
  async updateConversation(_phone: string, _body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    this.calls.push('updateConversation');
    return this.respond();
  }
}

class FakeEvolution implements EvolutionGateway {
  readonly calls: string[] = [];
  constructor(private readonly result: { state?: string; qrCode?: string; pairingCode?: string; phone?: string } = {}) {}
  async fetchStatus() {
    this.calls.push('fetchStatus');
    return { state: this.result.state || 'close', qrCode: this.result.qrCode || '', pairingCode: this.result.pairingCode || '', phone: this.result.phone || '' };
  }
  async connect() {
    this.calls.push('connect');
    return { qrCode: this.result.qrCode || '', pairingCode: this.result.pairingCode || '', state: this.result.state || 'connecting' };
  }
  async logout(): Promise<boolean> {
    this.calls.push('logout');
    return true;
  }
}

class FakeFirestore implements FirestoreGateway {
  constructor(private readonly plans: Record<string, DocSnapshotLike> = {}) {}
  async getDoc(collectionPath: string, id: string) {
    const raw = this.plans[`${collectionPath}/${id}`];
    if (!raw) return null;
    return raw;
  }
  async listDocs(collectionPath: string): Promise<QuerySnapshotLike> {
    return {
      docs: Object.entries(this.plans)
        .filter(([key]) => key.startsWith(`${collectionPath}/`))
        .map(([, snap]) => snap),
    };
  }
  async queryByField(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }
  async queryByTwoFields(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }
  async createSubDoc(): Promise<void> {}
  async updateSubDoc(): Promise<void> {}
  async deleteSubDoc(): Promise<void> {}
  async listSubDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }
  async countSubDocs(): Promise<number> {
    return 0;
  }
  async createDoc(): Promise<void> {}
  async updateDoc(): Promise<void> {}
  async deleteDoc(): Promise<void> {}
  serverTimestamp(): unknown {
    return { __ts: true };
  }
  arrayUnion(..._elements: unknown[]): unknown {
    return { __union: _elements };
  }
}

function makeDeps(overrides?: {
  worker?: FakeWorker;
  evolution?: FakeEvolution;
  configRepo?: FakeConfigRepo;
  firestore?: FakeFirestore;
}): WhatsAppBotDeps {
  return {
    worker: overrides?.worker ?? new FakeWorker(),
    evolution: overrides?.evolution ?? new FakeEvolution(),
    configRepo: overrides?.configRepo ?? new FakeConfigRepo(),
    firestore: overrides?.firestore ?? new FakeFirestore(),
  };
}

async function bodyOf(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

describe('handleBotStatus', () => {
  it('401 sin admin', async () => {
    const res = await handleBotStatus(makeDeps(), NOT_ADMIN);
    expect(res.status).toBe(401);
    expect(await bodyOf(res)).toEqual({ error: 'No autorizado' });
  });

  it('200 con envelope legacy exacto (estado open + worker running)', async () => {
    const res = await handleBotStatus(
      makeDeps({
        evolution: new FakeEvolution({ state: 'open', phone: '5491122334455' }),
        worker: new FakeWorker({ status: 'running' }),
      }),
      ADMIN,
    );
    expect(res.status).toBe(200);
    const body = await bodyOf(res);
    expect(body.success).toBe(true);
    expect(body.instance).toBe('fastoria');
    expect(body.state).toBe('open');
    expect(body.phone).toBe('5491122334455');
    expect(body.workerStatus).toBe('running');
    expect(body.qrCode).toBe('');
    expect(body.pairingCode).toBe('');
  });

  it('200 con QR cuando no está conectado', async () => {
    const res = await handleBotStatus(
      makeDeps({
        evolution: new FakeEvolution({ state: 'close', qrCode: 'base64qr', pairingCode: '1234' }),
      }),
      ADMIN,
    );
    const body = await bodyOf(res);
    expect(body.state).toBe('close');
    expect(body.qrCode).toBe('base64qr');
    expect(body.pairingCode).toBe('1234');
  });
});

describe('handleBotGetSettings', () => {
  it('401 sin admin', async () => {
    const res = await handleBotGetSettings(makeDeps(), NOT_ADMIN);
    expect(res.status).toBe(401);
  });

  it('200 con settings del worker cuando responde', async () => {
    const worker = new FakeWorker({ tone: 'formal', temperature: 1 });
    const res = await handleBotGetSettings(makeDeps({ worker }), ADMIN);
    expect(res.status).toBe(200);
    expect(await bodyOf(res)).toEqual({ success: true, settings: { tone: 'formal', temperature: 1 } });
  });

  it('200 con defaults cuando worker y Firestore fallan', async () => {
    const res = await handleBotGetSettings(makeDeps({ worker: new FakeWorker(null), configRepo: new FakeConfigRepo(true) }), ADMIN);
    expect(res.status).toBe(200);
    const body = await bodyOf(res);
    expect(body.success).toBe(true);
    expect((body.settings as Record<string, unknown>).tone).toBe(DEFAULT_BOT_SETTINGS.tone);
  });
});

describe('handleBotListConversations / ListMessages / ListKnowledge', () => {
  it('conversations vacío cuando worker falla', async () => {
    const res = await handleBotListConversations(makeDeps({ worker: new FakeWorker(null) }), ADMIN);
    expect(res.status).toBe(200);
    expect(await bodyOf(res)).toEqual({ success: true, conversations: [] });
  });

  it('conversations con datos del worker', async () => {
    const res = await handleBotListConversations(
      makeDeps({ worker: new FakeWorker({ conversations: [{ id: 'c1' }] }) }),
      ADMIN,
    );
    expect(await bodyOf(res)).toEqual({ success: true, conversations: [{ id: 'c1' }] });
  });

  it('messages exige phone', async () => {
    const res = await handleBotListMessages(makeDeps(), ADMIN, '');
    expect(res.status).toBe(400);
    expect(await bodyOf(res)).toEqual({ error: 'phone es requerido' });
  });

  it('messages con datos', async () => {
    const res = await handleBotListMessages(
      makeDeps({ worker: new FakeWorker({ conversation: { phone: 'x' }, messages: [{ text: 'hola' }] }) }),
      ADMIN,
      '54911',
    );
    const body = await bodyOf(res);
    expect(body.success).toBe(true);
    expect((body.messages as unknown[]).length).toBe(1);
  });

  it('knowledge vacío cuando worker falla', async () => {
    const res = await handleBotListKnowledge(makeDeps({ worker: new FakeWorker(null) }), ADMIN);
    expect(res.status).toBe(200);
    expect(await bodyOf(res)).toEqual({ success: true, items: [] });
  });
});

describe('handleBotSaveSettings', () => {
  it('200 y persiste en worker + Firestore', async () => {
    const worker = new FakeWorker();
    const configRepo = new FakeConfigRepo();
    const res = await handleBotSaveSettings(makeDeps({ worker, configRepo }), ADMIN, {
      tone: 'serio',
      temperature: 0.2,
    });
    expect(res.status).toBe(200);
    const body = await bodyOf(res);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Configuración actualizada correctamente.');
    expect(body.settings).toEqual({ tone: 'serio', temperature: 0.2 });
    expect(worker.calls).toContain('saveSettings');
    expect(await configRepo.getConfig()).toMatchObject({ tone: 'serio', temperature: 0.2 });
  });
});

describe('handleBotConnect / Logout', () => {
  it('connect 200 con QR', async () => {
    const evo = new FakeEvolution({ state: 'connecting', qrCode: 'qr', pairingCode: 'pc' });
    const res = await handleBotConnect(makeDeps({ evolution: evo }), ADMIN);
    expect(res.status).toBe(200);
    const body = await bodyOf(res);
    expect(body.success).toBe(true);
    expect(body.qrCode).toBe('qr');
    expect(body.pairingCode).toBe('pc');
    expect(body.message).toBe('Código QR generado correctamente.');
  });

  it('logout 200 siempre (best-effort)', async () => {
    const res = await handleBotLogout(makeDeps(), ADMIN);
    expect(res.status).toBe(200);
    expect(await bodyOf(res)).toEqual({
      success: true,
      state: 'close',
      message: 'Sesión de WhatsApp cerrada exitosamente.',
    });
  });
});

describe('handleBotCreateKnowledge', () => {
  it('devuelve data del worker si responde', async () => {
    const res = await handleBotCreateKnowledge(
      makeDeps({ worker: new FakeWorker({ id: 'k1' }) }),
      ADMIN,
      { title: 'T' },
    );
    expect(await bodyOf(res)).toEqual({ success: true, data: { id: 'k1' } });
  });

  it('fallback message + item cuando worker falla', async () => {
    const res = await handleBotCreateKnowledge(makeDeps({ worker: new FakeWorker(null) }), ADMIN, {
      title: 'T',
    });
    const body = await bodyOf(res);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Fragmento de conocimiento procesado y vectorizado.');
    expect(body.item).toEqual({ title: 'T' });
  });
});

describe('handleBotSyncPlans', () => {
  it('200 con syncedCount cuando hay planes en Firestore', async () => {
    const firestore = new FakeFirestore({
      'subscriptionPlans/plan1': snap('plan1', { name: 'Pro', price: 1000, aiQuotas: { totalCredits: 100 } }),
    });
    const worker = new FakeWorker();
    const res = await handleBotSyncPlans(makeDeps({ firestore, worker }), ADMIN);
    expect(res.status).toBe(200);
    const body = await bodyOf(res);
    expect(body.success).toBe(true);
    expect(body.syncedCount).toBe(1);
    expect(body.message).toContain('1 planes');
  });

  it('200 con 0 sin planes', async () => {
    const res = await handleBotSyncPlans(makeDeps({ firestore: new FakeFirestore({}) }), ADMIN);
    expect((await bodyOf(res)).syncedCount).toBe(0);
  });
});

describe('handleBotSendMessage', () => {
  it('400 sin phone ni text', async () => {
    const res = await handleBotSendMessage(makeDeps(), ADMIN, {});
    expect(res.status).toBe(400);
  });

  it('200 con data del worker', async () => {
    const res = await handleBotSendMessage(
      makeDeps({ worker: new FakeWorker({ sent: true }) }),
      ADMIN,
      { phone: '54911', text: 'hola' },
    );
    expect(res.status).toBe(200);
    expect(await bodyOf(res)).toEqual({ success: true, sent: true });
  });

  it('200 fallback "Mensaje despachado"', async () => {
    const res = await handleBotSendMessage(
      makeDeps({ worker: new FakeWorker(null) }),
      ADMIN,
      { phone: '54911', text: 'hola' },
    );
    expect(await bodyOf(res)).toEqual({ success: true, message: 'Mensaje despachado' });
  });
});

describe('handleBotToggleMode', () => {
  it('400 sin phone', async () => {
    const res = await handleBotToggleMode(makeDeps(), ADMIN, 'toggle-mode', {});
    expect(res.status).toBe(400);
  });

  it('200 con data del worker', async () => {
    const res = await handleBotToggleMode(
      makeDeps({ worker: new FakeWorker({ mode: 'BOT' }) }),
      ADMIN,
      'toggle-mode',
      { phone: '54911', mode: 'BOT' },
    );
    expect(res.status).toBe(200);
    expect(await bodyOf(res)).toEqual({ success: true, mode: 'BOT' });
  });

  it('error del worker se propaga con status', async () => {
    const res = await handleBotToggleMode(
      makeDeps({ worker: new FakeWorker(null) }),
      ADMIN,
      'toggle-mode',
      { phone: '54911' },
    );
    expect(res.status).toBe(500);
    expect(await bodyOf(res)).toEqual({ error: 'Error al cambiar modo' });
  });

  it('resume-bot usa modo BOT', async () => {
    const worker = new FakeWorker({ mode: 'BOT' });
    const res = await handleBotToggleMode(makeDeps({ worker }), ADMIN, 'resume-bot', { phone: '54911' });
    expect(res.status).toBe(200);
  });
});

describe('handleBotTransfer', () => {
  it('400 sin phone', async () => {
    const res = await handleBotTransfer(makeDeps(), ADMIN, {});
    expect(res.status).toBe(400);
  });

  it('200 con transferredTo fallback ventas', async () => {
    const res = await handleBotTransfer(makeDeps({ worker: new FakeWorker(null) }), ADMIN, { phone: '54911' });
    expect(await bodyOf(res)).toEqual({ success: true, transferredTo: 'ventas' });
  });

  it('200 con data del worker', async () => {
    const res = await handleBotTransfer(
      makeDeps({ worker: new FakeWorker({ transferred: true }) }),
      ADMIN,
      { phone: '54911', department: 'soporte' },
    );
    expect(res.status).toBe(200);
    expect(await bodyOf(res)).toEqual({ success: true, transferred: true });
  });
});

describe('handleBotUpdateConversation', () => {
  it('400 sin phone', async () => {
    const res = await handleBotUpdateConversation(makeDeps(), ADMIN, null, {});
    expect(res.status).toBe(400);
  });

  it('200 updated fallback', async () => {
    const res = await handleBotUpdateConversation(makeDeps({ worker: new FakeWorker(null) }), ADMIN, '54911', {});
    expect(await bodyOf(res)).toEqual({ success: true, updated: '54911' });
  });
});

describe('handleBotDeleteKnowledge', () => {
  it('400 sin id', async () => {
    const res = await handleBotDeleteKnowledge(makeDeps(), ADMIN, '');
    expect(res.status).toBe(400);
  });

  it('200 fallback eliminado', async () => {
    const res = await handleBotDeleteKnowledge(makeDeps({ worker: new FakeWorker(null) }), ADMIN, 'k1');
    expect(await bodyOf(res)).toEqual({
      success: true,
      message: 'Elemento k1 eliminado del catálogo RAG.',
    });
  });
});