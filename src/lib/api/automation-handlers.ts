/**
 * API — Handlers de automations (F1.3, one-off administrativo).
 * DECISIÓN DOCUMENTADA: `automations/*` NO tiene use-cases de dominio
 * porque es lógica simulada/mock sin reglas de negocio (tutorId mock
 * `ary-test` por query param, alumno dummy fijo, sin validaciones):
 * moverla a dominio no aportaría nada y el riesgo de cambiar respuestas
 * no compensa. Se adelgaza igual: la lógica sale del `route.ts` a este
 * handler testeable (mismas colecciones `automations_rules` /
 * `automations_logs` vía `@/lib/automations/db`, mismo Evolution API
 * vía `whatsapp-client`). La auth del cron (`verifyAdmin` O CRON_SECRET)
 * queda en el borde del route, igual que hoy.
 * `whatsapp-client` lanza si falta EVOLUTION_API_KEY al importarlo, por
 * eso se importa LAZY (solo cuando no se inyecta el depolarizador en tests).
 */
import { NextResponse } from 'next/server';

import {
  deleteRule,
  getActiveRules,
  getRulesByTutor,
  saveAutomationLog,
  saveAutomationRule,
} from '@/lib/automations/db';
import type { AutomationLog, AutomationRule } from '@/lib/automations/rules-schema';
import type { WhatsAppInstance } from '@/lib/automations/whatsapp-client';

export interface AutomationRuleDeps {
  readonly listRules?: (tutorId: string) => Promise<AutomationRule[]>;
  readonly listActive?: () => Promise<AutomationRule[]>;
  readonly saveRule?: (rule: AutomationRule) => Promise<string>;
  readonly removeRule?: (ruleId: string, tutorId: string) => Promise<boolean>;
  readonly saveLog?: (log: AutomationLog) => Promise<string>;
  /** WhatsApp send (inyectable desde el test, combinado con waDeps en cron). */
  readonly send?: (tutorId: string, phone: string, message: string) => Promise<boolean>;
}

export interface WhatsAppDeps {
  readonly getStatus?: (tutorId: string) => Promise<WhatsAppInstance>;
  readonly connect?: (tutorId: string) => Promise<WhatsAppInstance>;
  readonly disconnect?: (tutorId: string) => Promise<boolean>;
  readonly send?: (tutorId: string, phone: string, message: string) => Promise<boolean>;
}

async function resolveWhatsApp(deps: WhatsAppDeps): Promise<Required<WhatsAppDeps>> {
  // Cada deps se resuelve individualmente. Las no inyectadas se resuelven
  // LAZY (solo al llamarlas), para que un test que inyecta solo `getStatus`
  // no dispare el import de `whatsapp-client` (que exige EVOLUTION_API_KEY
  // al cargarse). Si en runtime se llama una funci├│n ausente, se importa la
  // lib real en ese momento (mismo comportamiento, sin import top-level).
  return {
    getStatus: deps.getStatus ?? (async (tutorId: string) => {
      const lib = await import('@/lib/automations/whatsapp-client');
      return lib.getWhatsAppStatus(tutorId);
    }),
    connect: deps.connect ?? (async (tutorId: string) => {
      const lib = await import('@/lib/automations/whatsapp-client');
      return lib.connectWhatsApp(tutorId);
    }),
    disconnect: deps.disconnect ?? (async (tutorId: string) => {
      const lib = await import('@/lib/automations/whatsapp-client');
      return lib.disconnectWhatsApp(tutorId);
    }),
    send: deps.send ?? (async (tutorId: string, phone: string, message: string) => {
      const lib = await import('@/lib/automations/whatsapp-client');
      return lib.sendWhatsAppMessage(tutorId, phone, message);
    }),
  };
}

function failure(error: unknown): { success: false; error: string } {
  return { success: false, error: error instanceof Error ? error.message : String(error) };
}

/** GET /api/automations/rules?tutorId=.. */
export async function handleListAutomationRules(tutorId: string, deps: AutomationRuleDeps = {}): Promise<NextResponse> {
  try {
    const rules = await (deps.listRules ?? getRulesByTutor)(tutorId);
    return NextResponse.json({ success: true, data: rules });
  } catch (error: unknown) {
    return NextResponse.json(failure(error), { status: 500 });
  }
}

/** POST /api/automations/rules?tutorId=.. */
export async function handleCreateAutomationRule(
  tutorId: string,
  body: unknown,
  deps: AutomationRuleDeps = {},
): Promise<NextResponse> {
  try {
    // Inyectar el tutorId en la regla (igual que el legacy).
    const rule: AutomationRule = { ...((body ?? {}) as Record<string, unknown>), tutorId } as AutomationRule;
    const id = await (deps.saveRule ?? saveAutomationRule)(rule);
    return NextResponse.json({ success: true, data: { id } });
  } catch (error: unknown) {
    return NextResponse.json(failure(error), { status: 500 });
  }
}

/** DELETE /api/automations/rules?tutorId=..&id=.. */
export async function handleDeleteAutomationRule(
  tutorId: string,
  ruleId: string | null,
  deps: AutomationRuleDeps = {},
): Promise<NextResponse> {
  try {
    if (!ruleId) {
      return NextResponse.json({ success: false, error: 'Falta el ID de la regla' }, { status: 400 });
    }
    const success = await (deps.removeRule ?? deleteRule)(ruleId, tutorId);
    return NextResponse.json({ success });
  } catch (error: unknown) {
    return NextResponse.json(failure(error), { status: 500 });
  }
}

/** GET /api/automations/whatsapp?tutorId=.. */
export async function handleGetWhatsAppStatus(tutorId: string, deps: WhatsAppDeps = {}): Promise<NextResponse> {
  try {
    const wa = await resolveWhatsApp(deps);
    const status = await wa.getStatus(tutorId);
    return NextResponse.json({ success: true, data: status });
  } catch (error: unknown) {
    return NextResponse.json(failure(error), { status: 500 });
  }
}

/** POST /api/automations/whatsapp?tutorId=.. { action, phone? } */
export async function handleWhatsAppAction(
  tutorId: string,
  body: { action?: unknown; phone?: unknown },
  deps: WhatsAppDeps = {},
): Promise<NextResponse> {
  try {
    const action = body.action;

    if (action === 'connect') {
      const wa = await resolveWhatsApp(deps);
      const result = await wa.connect(tutorId);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'disconnect') {
      const wa = await resolveWhatsApp(deps);
      const result = await wa.disconnect(tutorId);
      return NextResponse.json({ success: result });
    }

    if (action === 'test_message') {
      const phone = body.phone;
      if (!phone) return NextResponse.json({ success: false, error: 'Número no provisto' }, { status: 400 });

      const message = `🤖 *FastoriaAutomations*\n\n¡Hola! Esta es una prueba de conexión exitosa.\nSi recibiste este mensaje, significa que el motor de automatizaciones está 100% operativo y listo para despachar mensajes a tus alumnos.`;

      const wa = await resolveWhatsApp(deps);
      const result = await wa.send(tutorId, String(phone), message);
      return NextResponse.json({ success: result });
    }

    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(failure(error), { status: 500 });
  }
}

/** GET /api/automations/cron (motor de reglas; auth en el borde del route). */
export async function handleRunAutomationsCron(
  ruleDeps: AutomationRuleDeps = {},
  waDeps: WhatsAppDeps = {},
): Promise<NextResponse> {
  try {
    const rules = await (ruleDeps.listActive ?? getActiveRules)();
    const wa = await resolveWhatsApp({ ...waDeps, ...ruleDeps });
    const saveLog = ruleDeps.saveLog ?? saveAutomationLog;
    let processedCount = 0;

    for (const rule of rules) {
      if (rule.trigger.type === 'inactivity') {
        // LÓGICA SIMULADA PARA INACTIVIDAD (igual que el legacy).
        const dummyStudent = { id: 'std-123', name: 'Juan Pérez', phone: '5491100000000', daysInactive: 15 };

        if (rule.channels.whatsapp) {
          const action = rule.actions.find((a) => a.type === 'dynamic_message');

          if (action) {
            const aiMessage = `Hola ${dummyStudent.name}, hemos notado que no ingresas hace ${dummyStudent.daysInactive} días. ¿Todo bien?`;

            const success = await wa.send(rule.tutorId, dummyStudent.phone, aiMessage);

            await saveLog({
              ruleId: rule.id as string,
              tutorId: rule.tutorId,
              studentId: dummyStudent.id,
              studentName: dummyStudent.name,
              actionType: 'dynamic_message',
              channel: 'whatsapp',
              status: success ? 'success' : 'failed',
              summary: success
                ? `Mensaje de inactividad enviado a ${dummyStudent.name}`
                : `Fallo al enviar mensaje a ${dummyStudent.name}`,
              timestamp: Date.now(),
            });

            processedCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron ejecutado correctamente. Reglas procesadas: ${rules.length}. Acciones disparadas: ${processedCount}`,
    });
  } catch (error: unknown) {
    console.error('Error en el motor cron:', error);
    return NextResponse.json(failure(error), { status: 500 });
  }
}







