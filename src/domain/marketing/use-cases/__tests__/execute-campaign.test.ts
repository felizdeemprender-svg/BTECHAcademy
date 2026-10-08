/**
 * Tests del disparo manual con repositorio falso en memoria.
 */
import { describe, expect, it } from 'vitest';

import { isErr, isOk } from '@/domain/shared/result';

import type { Campaign } from '../../campaign';
import type { CampaignRepository } from '../../campaign-repository';
import type { ExecutionLog } from '../../execution-log';
import {
  buildDispatchLogs,
  executeCampaignStep,
  missingProductionCredentials,
} from '../execute-campaign';

const timeline = [
  {
    day: 1,
    phase: 'Expectativa',
    variantIndex: 0,
    action: 'Teaser',
    channels: ['Social', 'Email'],
  },
  { day: 2, phase: 'Venta', variantIndex: 1, action: 'Oferta', channels: ['Email'] },
];

function campaign(): Campaign {
  return {
    id: 'c1',
    mentorId: 'm1',
    title: 'C',
    startDate: '2026-01-01',
    autoPilot: true,
    status: 'active',
    productionStatus: 'ready_to_publish',
    isActive: true,
    executionLogs: [],
    strategy: { strategyName: 'S', logic: 'L', timeline: timeline as Campaign['strategy']['timeline'] },
  };
}

class FakeRepo implements CampaignRepository {
  appended: { id: string; logs: ExecutionLog[] }[] = [];
  constructor(private readonly items: Campaign[]) {}
  async findById(id: string): Promise<Campaign | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }
  async listByMentor(mentorId: string): Promise<Campaign[]> {
    return this.items.filter((c) => c.mentorId === mentorId);
  }
  async update(): Promise<void> {}
  async remove(): Promise<void> {}
  async appendExecutionLogs(id: string, logs: ExecutionLog[]): Promise<void> {
    this.appended.push({ id, logs });
  }
  async create(): Promise<void> {
    throw new Error('no implementado en este falso');
  }
}

const NOW = new Date(2026, 0, 1, 12, 0);

describe('buildDispatchLogs', () => {
  it('Social expande a 5 plataformas + Email = 6 logs día 1', () => {
    const logs = buildDispatchLogs(
      timeline.slice(0, 1) as never,
      1,
      {},
      NOW.toISOString(),
    );
    expect(logs).toHaveLength(7);
    expect(logs.filter((l) => l.channel === 'Social')).toHaveLength(6);
    expect(logs[6].channel).toBe('Email');
    expect(logs[6].time).toBe('09:00');
    expect(logs[0].mode).toBe('sandbox');
    expect(logs[0].responseId).toBe('instagram_1_0_0_0');
  });

  it('respeta socialSchedule y marca producción con credenciales', () => {
    const withSchedule = [
      {
        ...timeline[0],
        socialSchedule: { instagram: [{ videoName: 'V-E special', time: '18:00' }] },
      },
    ];
    const logs = buildDispatchLogs(
      withSchedule as never,
      1,
      { meta_social: { mode: 'production', apiKey: 'k' } },
      NOW.toISOString(),
    );
    const ig = logs.find((l) => l.platform === 'instagram');
    expect(ig?.videoName).toBe('V-E special');
    expect(ig?.mode).toBe('production');
    expect(ig?.feedback).toContain('PRODUCCIÓN');
  });
});

describe('missingProductionCredentials', () => {
  it('detecta motores en producción sin key', () => {
    expect(missingProductionCredentials(['Email', 'Social'], {})).toEqual([]);
    expect(
      missingProductionCredentials(['Email', 'Social'], {
        sendgrid: { mode: 'production' },
        meta_social: { mode: 'production', apiKey: 'k' },
      }),
    ).toEqual(['Email']);
  });
});

describe('executeCampaignStep', () => {
  it('dispara el día 1 y agrega logs', async () => {
    const repo = new FakeRepo([campaign()]);
    const result = await executeCampaignStep(repo, { id: 'c1', credentials: {}, now: NOW });
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value.currentDay).toBe(1);
    expect(result.value.logsAppended).toBe(7);
    expect(repo.appended).toHaveLength(1);
  });

  it('día sin acciones → VALIDATION; faltan keys → VALIDATION con canales', async () => {
    const repo = new FakeRepo([campaign()]);
    const empty = await executeCampaignStep(repo, {
      id: 'c1',
      credentials: {},
      now: new Date(2026, 0, 10, 12, 0),
    });
    if (isErr(empty)) expect(empty.error.code).toBe('VALIDATION');

    const missing = await executeCampaignStep(repo, {
      id: 'c1',
      credentials: { sendgrid: { mode: 'production' } },
      now: NOW,
    });
    if (isErr(missing)) {
      expect(missing.error.code).toBe('VALIDATION');
      expect(missing.error.message).toContain('Email');
    }
    expect(repo.appended).toHaveLength(0);
  });

  it('id vacío → VALIDATION; inexistente → NOT_FOUND', async () => {
    const repo = new FakeRepo([]);
    const e1 = await executeCampaignStep(repo, { id: '', credentials: {} });
    const e2 = await executeCampaignStep(repo, { id: 'x', credentials: {} });
    if (isErr(e1)) expect(e1.error.code).toBe('VALIDATION');
    if (isErr(e2)) expect(e2.error.code).toBe('NOT_FOUND');
  });
});
