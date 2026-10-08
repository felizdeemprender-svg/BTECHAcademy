/**
 * Tests de casos de uso de campañas con repositorio falso.
 * Sin Firebase: el falso implementa CampaignRepository.
 */
import { describe, expect, it } from 'vitest';

import { isOk, isErr } from '@/domain/shared/result';

import type { Campaign } from '../../campaign';
import type { CampaignRepository } from '../../campaign-repository';
import { getCampaignDetail, getMentorCampaigns } from '../get-mentor-campaigns';

function campaign(overrides: Partial<Campaign> & { id: string }): Campaign {
  return {
    mentorId: 'm1',
    title: 'C',
    startDate: '2026-01-01',
    autoPilot: true,
    status: 'active',
    isActive: true,
    executionLogs: [],
    strategy: {
      strategyName: 'S',
      logic: 'L',
      timeline: [
        { day: 1, phase: 'P', variantIndex: 0, action: 'A1', channels: ['Social'] },
        { day: 2, phase: 'P', variantIndex: 1, action: 'A2', channels: ['Email'] },
      ],
    },
    ...overrides,
  } as Campaign;
}

class FakeRepo implements CampaignRepository {
  constructor(private readonly items: Campaign[]) {}
  async findById(id: string): Promise<Campaign | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }
  async listByMentor(mentorId: string): Promise<Campaign[]> {
    return this.items.filter((c) => c.mentorId === mentorId);
  }
  async update(): Promise<void> {
    throw new Error('no implementado en este falso');
  }
  async remove(): Promise<void> {
    throw new Error('no implementado en este falso');
  }
  async appendExecutionLogs(): Promise<void> {
    throw new Error('no implementado en este falso');
  }
  async create(): Promise<void> {
    throw new Error('no implementado en este falso');
  }
}

const NOW = new Date(2026, 0, 2, 12, 0);

describe('getMentorCampaigns', () => {
  it('enriquece con día actual, hoy, progreso y ejecutable', async () => {
    const repo = new FakeRepo([campaign({ id: 'c1', executionLogs: [{ status: 'success' } as any] })]);
    const result = await getMentorCampaigns(repo, { mentorId: 'm1', now: NOW });
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value).toHaveLength(1);
    const [s] = result.value;
    expect(s.currentDay).toBe(2);
    expect(s.today.map((t) => t.action)).toEqual(['A2']);
    expect(s.progressPercent).toBe(50);
    expect(s.executable).toBe(true);
  });

  it('ordena por creación desc y filtra por mentor', async () => {
    const repo = new FakeRepo([
      campaign({ id: 'old', createdAt: new Date('2026-01-01') }),
      campaign({ id: 'new', createdAt: new Date('2026-02-01') }),
      campaign({ id: 'nodate' }),
      campaign({ id: 'other', mentorId: 'm2', createdAt: new Date('2026-03-01') }),
    ]);
    const result = await getMentorCampaigns(repo, { mentorId: 'm1', now: NOW });
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value.map((s) => s.campaign.id)).toEqual(['new', 'old', 'nodate']);
  });

  it('startDate inválido cae a día 1 sin romper', async () => {
    const repo = new FakeRepo([campaign({ id: 'c1', startDate: 'no-fecha' })]);
    const result = await getMentorCampaigns(repo, { mentorId: 'm1', now: NOW });
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value[0].currentDay).toBe(1);
  });

  it('mentorId vacío devuelve VALIDATION', async () => {
    const repo = new FakeRepo([]);
    const result = await getMentorCampaigns(repo, { mentorId: '  ' });
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error.code).toBe('VALIDATION');
  });
});

describe('getCampaignDetail', () => {
  it('devuelve el resumen de una campaña existente', async () => {
    const repo = new FakeRepo([campaign({ id: 'c1' })]);
    const result = await getCampaignDetail(repo, { id: 'c1', now: NOW });
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value.campaign.id).toBe('c1');
    expect(result.value.currentDay).toBe(2);
  });

  it('id inexistente devuelve NOT_FOUND e id vacío VALIDATION', async () => {
    const repo = new FakeRepo([]);
    const missing = await getCampaignDetail(repo, { id: 'x' });
    expect(isErr(missing)).toBe(true);
    if (isErr(missing)) expect(missing.error.code).toBe('NOT_FOUND');
    const empty = await getCampaignDetail(repo, { id: '' });
    if (isErr(empty)) expect(empty.error.code).toBe('VALIDATION');
  });
});
