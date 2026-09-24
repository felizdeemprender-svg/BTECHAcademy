/**
 * F1.3 (TDD rojo) — Handlers de automations (one-off administrativo,
 * documentado): delegan a `@/lib/automations/*` con las mismas respuestas.
 * - rules: GET lista / POST crea (inyecta tutorId) / DELETE exige id.
 * - whatsapp: GET estado / POST connect|disconnect|test_message.
 * - cron: ejecuta reglas de inactividad y loguea (lógica simulada legacy).
 * Todo con dependencias inyectables para no tocar Firestore ni Evolution.
 */
import { describe, expect, it } from 'vitest';

import type { AutomationLog, AutomationRule } from '@/lib/automations/rules-schema';
import {
  handleCreateAutomationRule,
  handleDeleteAutomationRule,
  handleListAutomationRules,
  handleRunAutomationsCron,
  handleGetWhatsAppStatus,
  handleWhatsAppAction,
} from '../automation-handlers';

function rule(overrides: Partial<AutomationRule> = {}): AutomationRule {
  return {
    id: 'rule-1',
    name: 'Inactivos',
    scope: 'global',
    trigger: { type: 'inactivity', config: { days: 15 } },
    channels: { whatsapp: true, email: false },
    actions: [{ id: 'a1', type: 'dynamic_message', config: {} }],
    isActive: true,
    tutorId: 'ary-test',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('automation rules handlers', () => {
  it('GET lista reglas del tutor', async () => {
    const res = await handleListAutomationRules('ary-test', {
      listRules: async (tutorId: string) => (tutorId === 'ary-test' ? [rule()] : []),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: [rule()] });
  });

  it('GET propaga 500 con success:false', async () => {
    const res = await handleListAutomationRules('ary-test', {
      listRules: async () => {
        throw new Error('db caída');
      },
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: 'db caída' });
  });

  it('POST inyecta tutorId y responde id', async () => {
    let saved: AutomationRule | undefined;
    const res = await handleCreateAutomationRule('ary-test', { name: 'R' }, {
      saveRule: async (r: AutomationRule) => {
        saved = r as AutomationRule;
        return 'new-id';
      },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { id: 'new-id' } });
    expect(saved?.tutorId).toBe('ary-test');
  });

  it('DELETE sin id → 400', async () => {
    const res = await handleDeleteAutomationRule('ary-test', null, {});
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: 'Falta el ID de la regla' });
  });

  it('DELETE responde success', async () => {
    const res = await handleDeleteAutomationRule('ary-test', 'rule-1', {
      removeRule: async () => true,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});

describe('whatsapp handlers', () => {
  it('GET responde estado', async () => {
    const res = await handleGetWhatsAppStatus('ary-test', {
      getStatus: async (tutorId: string) => ({ instanceName: `tutor-${tutorId}`, status: 'close' as const }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: { instanceName: 'tutor-ary-test', status: 'close' },
    });
  });

  it('POST connect/disconnect/test_message', async () => {
    const connected = await handleWhatsAppAction('ary-test', { action: 'connect' }, {
      connect: async () => ({ instanceName: 'tutor-ary-test', status: 'connecting' as const }),
    });
    expect(connected.status).toBe(200);

    const bye = await handleWhatsAppAction('ary-test', { action: 'disconnect' }, {
      disconnect: async () => true,
    });
    expect(await bye.json()).toEqual({ success: true });

    const test = await handleWhatsAppAction('ary-test', { action: 'test_message', phone: '5491100000000' }, {
      send: async () => true,
    });
    expect(await test.json()).toEqual({ success: true });
  });

  it('POST test_message sin phone → 400', async () => {
    const res = await handleWhatsAppAction('ary-test', { action: 'test_message' }, {});
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: 'Número no provisto' });
  });

  it('POST acción inválida → 400', async () => {
    const res = await handleWhatsAppAction('ary-test', { action: 'otra' }, {});
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: 'Acción no válida' });
  });
});

describe('handleRunAutomationsCron', () => {
  it('dispara mensaje de inactividad y loguea success', async () => {
    const sent: { tutorId: string; phone: string; message: string }[] = [];
    const logs: AutomationLog[] = [];
    const res = await handleRunAutomationsCron({
      listActive: async () => [rule()],
      send: async (tutorId: string, phone: string, message: string) => {
        sent.push({ tutorId, phone, message });
        return true;
      },
      saveLog: async (log: AutomationLog) => {
        logs.push(log);
        return 'log-1';
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; message: string };
    expect(body.success).toBe(true);
    expect(body.message).toContain('Reglas procesadas: 1');
    expect(body.message).toContain('Acciones disparadas: 1');
    expect(sent.length).toBe(1);
    expect(logs[0]?.status).toBe('success');
  });

  it('fallo de envío se loguea como failed', async () => {
    const logs: AutomationLog[] = [];
    const res = await handleRunAutomationsCron({
      listActive: async () => [rule()],
      send: async () => false,
      saveLog: async (log: AutomationLog) => {
        logs.push(log);
        return 'log-1';
      },
    });
    expect(res.status).toBe(200);
    expect(logs[0]?.status).toBe('failed');
  });

  it('error crítico → 500 success:false', async () => {
    const res = await handleRunAutomationsCron({
      listActive: async () => {
        throw new Error('boom');
      },
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: 'boom' });
  });
});

