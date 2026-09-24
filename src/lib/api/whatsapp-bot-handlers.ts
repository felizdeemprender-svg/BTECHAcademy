/**
 * API — Handlers testeables del bot de WhatsApp (F2.2).
 * Proxy puro hacia el worker remoto + Evolution API + Firestore,
 * con envelopes legacy EXACTOS (NO `toApiResponse`). Auth: exige
 * admin (`verifyAdmin` en el borde + guarda `isAdmin` aquí).
 *
 * Todas las funciones reciben `deps` inyectables (gateways con
 * fetch propio) para testear sin red.
 */
import { NextResponse } from 'next/server';

import type { FirestoreGateway } from '@/data/firestore/gateway';
import type { BotConfigRepository } from '@/data/whatsapp/bot-config-repo';
import type { BotWorkerGateway } from '@/data/whatsapp/bot-worker-gateway';
import type { EvolutionGateway } from '@/data/whatsapp/evolution-gateway';
import { getBotConfig, syncCatalogToBot, updateBotConfig } from '@/domain/whatsapp/use-cases';

import type { Caller } from './mentor-auth';

export interface WhatsAppBotDeps {
  worker: BotWorkerGateway;
  evolution: EvolutionGateway;
  configRepo: BotConfigRepository;
  firestore: FirestoreGateway;
}

function requireAdmin(caller: Caller | null): NextResponse | null {
  if (!caller || !caller.isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return null;
}

async function workerStatusInfo(deps: WhatsAppBotDeps): Promise<{ status: string; info: Record<string, unknown> }> {
  const workerData = await deps.worker.getStatus();
  return {
    status: (workerData?.status as string) || 'running',
    info: workerData ?? {},
  };
}

/* ----------------------------- GET ----------------------------- */

export async function handleBotStatus(deps: WhatsAppBotDeps, caller: Caller | null): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  const { state, qrCode, pairingCode, phone } = await deps.evolution.fetchStatus();
  const worker = await workerStatusInfo(deps);

  return NextResponse.json({
    success: true,
    instance: 'fastoria',
    state,
    qrCode,
    pairingCode,
    phone,
    workerStatus: worker.status,
    workerInfo: worker.info,
  });
}

export async function handleBotGetSettings(deps: WhatsAppBotDeps, caller: Caller | null): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  const settings = await getBotConfig(deps.worker, deps.configRepo);
  return NextResponse.json({ success: true, settings });
}

export async function handleBotListConversations(deps: WhatsAppBotDeps, caller: Caller | null): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  const data = await deps.worker.getConversations();
  const conversations = (data?.conversations as unknown[]) || [];
  return NextResponse.json({ success: true, conversations });
}

export async function handleBotListMessages(
  deps: WhatsAppBotDeps,
  caller: Caller | null,
  phone: string,
): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  if (!phone) {
    return NextResponse.json({ error: 'phone es requerido' }, { status: 400 });
  }

  const data = await deps.worker.getMessages(phone);
  return NextResponse.json({
    success: true,
    conversation: (data?.conversation as Record<string, unknown> | null) ?? null,
    messages: (data?.messages as unknown[]) || [],
  });
}

export async function handleBotListKnowledge(deps: WhatsAppBotDeps, caller: Caller | null): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  const data = await deps.worker.getKnowledge();
  const items = (data?.items as unknown[]) || (Array.isArray(data) ? data : []);
  return NextResponse.json({ success: true, items });
}

/* ----------------------------- POST ----------------------------- */

export async function handleBotSaveSettings(
  deps: WhatsAppBotDeps,
  caller: Caller | null,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  await updateBotConfig(deps.worker, deps.configRepo, body);
  return NextResponse.json({
    success: true,
    message: 'Configuración actualizada correctamente.',
    settings: body,
  });
}

export async function handleBotConnect(deps: WhatsAppBotDeps, caller: Caller | null): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  const { qrCode, pairingCode, state } = await deps.evolution.connect();
  return NextResponse.json({
    success: true,
    instance: 'fastoria',
    state,
    qrCode,
    pairingCode,
    message: 'Código QR generado correctamente.',
  });
}

export async function handleBotLogout(deps: WhatsAppBotDeps, caller: Caller | null): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  await deps.evolution.logout();
  return NextResponse.json({
    success: true,
    state: 'close',
    message: 'Sesión de WhatsApp cerrada exitosamente.',
  });
}

export async function handleBotCreateKnowledge(
  deps: WhatsAppBotDeps,
  caller: Caller | null,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  const data = await deps.worker.createKnowledge(body);
  if (data) {
    return NextResponse.json({ success: true, data });
  }
  return NextResponse.json({
    success: true,
    message: 'Fragmento de conocimiento procesado y vectorizado.',
    item: body,
  });
}

export async function handleBotSyncPlans(deps: WhatsAppBotDeps, caller: Caller | null): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  const { syncedCount } = await syncCatalogToBot(deps.firestore, deps.worker);
  return NextResponse.json({
    success: true,
    syncedCount,
    message: `Se prepararon y sincronizaron ${syncedCount} planes con la base de conocimiento RAG.`,
  });
}

export async function handleBotSendMessage(
  deps: WhatsAppBotDeps,
  caller: Caller | null,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  const { phone, text, senderName } = body as { phone?: string; text?: string; senderName?: string };
  if (!phone || !text) {
    return NextResponse.json({ error: 'phone y text son requeridos' }, { status: 400 });
  }

  const data = await deps.worker.sendMessage(phone, text, senderName);
  if (data) {
    return NextResponse.json({ success: true, ...data });
  }
  return NextResponse.json({ success: true, message: 'Mensaje despachado' });
}

export async function handleBotToggleMode(
  deps: WhatsAppBotDeps,
  caller: Caller | null,
  action: string,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  const { phone } = body as { phone?: string };
  const targetMode = action === 'resume-bot' ? 'BOT' : ((body.mode as string) || 'BOT');
  if (!phone) {
    return NextResponse.json({ error: 'phone es requerido' }, { status: 400 });
  }

  const result = await deps.worker.setMode(phone, targetMode);
  if (result && 'status' in result && typeof result.status === 'number') {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ success: true, ...(result as Record<string, unknown>) });
}

export async function handleBotTransfer(
  deps: WhatsAppBotDeps,
  caller: Caller | null,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  const { phone, department, reason } = body as { phone?: string; department?: string; reason?: string };
  if (!phone) {
    return NextResponse.json({ error: 'phone es requerido' }, { status: 400 });
  }

  const data = await deps.worker.transfer(phone, department || 'ventas', reason);
  if (data) {
    return NextResponse.json({ success: true, ...data });
  }
  return NextResponse.json({ success: true, transferredTo: department || 'ventas' });
}

/* ----------------------------- PUT ----------------------------- */

export async function handleBotUpdateConversation(
  deps: WhatsAppBotDeps,
  caller: Caller | null,
  phoneFromQuery: string | null,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  const phone = phoneFromQuery || (body.phone as string | undefined);
  if (!phone) {
    return NextResponse.json({ error: 'phone es requerido' }, { status: 400 });
  }

  const data = await deps.worker.updateConversation(phone, body);
  if (data) {
    return NextResponse.json({ success: true, ...data });
  }
  return NextResponse.json({ success: true, updated: phone });
}

/* ----------------------------- DELETE ----------------------------- */

export async function handleBotDeleteKnowledge(
  deps: WhatsAppBotDeps,
  caller: Caller | null,
  id: string,
): Promise<NextResponse> {
  const authError = requireAdmin(caller);
  if (authError) return authError;

  if (!id) {
    return NextResponse.json({ error: 'ID es requerido para eliminar' }, { status: 400 });
  }

  const data = await deps.worker.deleteKnowledge(id);
  if (data) {
    return NextResponse.json({ success: true, ...data });
  }
  return NextResponse.json({
    success: true,
    message: `Elemento ${id} eliminado del catálogo RAG.`,
  });
}