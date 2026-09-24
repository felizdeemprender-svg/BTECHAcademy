/**
 * API — Ruta admin del bot de WhatsApp (F2.2), adelgazada a dispatch.
 * Toda la lógica vive en `@/lib/api/whatsapp-bot-handlers` con gateways
 * HTTP inyectables (`src/data/whatsapp/*`). Auth admin en el borde.
 */
import { NextRequest, NextResponse } from 'next/server';

import { FirestoreBotConfigRepository } from '@/data/whatsapp/bot-config-repo';
import { HttpBotWorkerGateway } from '@/data/whatsapp/bot-worker-gateway';
import { HttpEvolutionGateway } from '@/data/whatsapp/evolution-gateway';
import { resolveGateway } from '@/lib/api/gateway';
import { verifyAdmin } from '@/lib/auth/verify-admin';
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
} from '@/lib/api/whatsapp-bot-handlers';

async function resolveDeps(): Promise<WhatsAppBotDeps> {
  const firestore = await resolveGateway();
  return {
    worker: new HttpBotWorkerGateway(),
    evolution: new HttpEvolutionGateway(),
    configRepo: new FirestoreBotConfigRepository(firestore),
    firestore,
  };
}

async function checkAdminAndDeps(
  req: NextRequest,
): Promise<{ deps: WhatsAppBotDeps; caller: CallerLike; error?: NextResponse }> {
  const adminUid = await verifyAdmin(req);
  if (!adminUid) {
    return {
      deps: null as unknown as WhatsAppBotDeps,
      caller: null as unknown as CallerLike,
      error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    };
  }
  return { deps: await resolveDeps(), caller: { uid: adminUid, isAdmin: true } };
}

type CallerLike = { uid: string; isAdmin: boolean };

export async function GET(req: NextRequest) {
  const { deps, caller, error } = await checkAdminAndDeps(req);
  if (error) return error;
  const action = req.nextUrl.searchParams.get('action') || 'status';

  switch (action) {
    case 'status':
      return handleBotStatus(deps, caller);
    case 'settings':
      return handleBotGetSettings(deps, caller);
    case 'conversations':
      return handleBotListConversations(deps, caller);
    case 'messages':
      return handleBotListMessages(deps, caller, req.nextUrl.searchParams.get('phone') ?? '');
    case 'knowledge':
      return handleBotListKnowledge(deps, caller);
    default:
      return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const { deps, caller, error } = await checkAdminAndDeps(req);
  if (error) return error;
  const action = req.nextUrl.searchParams.get('action');
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  switch (action) {
    case 'settings':
      return handleBotSaveSettings(deps, caller, body);
    case 'connect':
      return handleBotConnect(deps, caller);
    case 'logout':
      return handleBotLogout(deps, caller);
    case 'knowledge':
      return handleBotCreateKnowledge(deps, caller, body);
    case 'sync-plans':
      return handleBotSyncPlans(deps, caller);
    case 'send-message':
      return handleBotSendMessage(deps, caller, body);
    case 'toggle-mode':
    case 'resume-bot':
      return handleBotToggleMode(deps, caller, action, body);
    case 'transfer':
      return handleBotTransfer(deps, caller, body);
    default:
      return NextResponse.json({ error: 'Acción POST no reconocida' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const { deps, caller, error } = await checkAdminAndDeps(req);
  if (error) return error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (req.nextUrl.searchParams.get('action') === 'update-conversation') {
    return handleBotUpdateConversation(deps, caller, req.nextUrl.searchParams.get('phone'), body);
  }
  return NextResponse.json({ error: 'Acción PUT no reconocida' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const { deps, caller, error } = await checkAdminAndDeps(req);
  if (error) return error;

  return handleBotDeleteKnowledge(deps, caller, req.nextUrl.searchParams.get('id') ?? '');
}