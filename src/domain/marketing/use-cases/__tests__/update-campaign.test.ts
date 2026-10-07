/**
 * Tests de casos de uso de escritura con repositorio falso en memoria.
 */
import { describe, expect, it } from 'vitest';

import { isErr, isOk } from '@/domain/shared/result';

import type { Campaign } from '../../campaign';
import type { CampaignPatch, CampaignRepository } from '../../campaign-repository';
import {
  removeCampaign,
  setCampaignAutoPilot,
  updateCampaignStrategy,
} from '../update-campaign';

const strategy = {
  strategyName: 'S',
  logic: 'L',
  timeline: [
    { day: 1, phase: 'P', variantIndex: 0, action: 'A1', channels: ['Social'] },
  ],
};

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
    strategy: strategy as Campaign['strategy'],
  };
}

class FakeRepo implements CampaignRepository {
  updates: { id: string; patch: CampaignPatch }[] = [];
  removed: string[] = [];
  constructor(private items: Campaign[]) {}
  async findById(id: string): Promise<Campaign | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }
  async listByMentor(mentorId: string): Promise<Campaign[]> {
    return this.items.filter((c) => c.mentorId === mentorId);
  }
  async update(id: string, patch: CampaignPatch): Promise<void> {
    this.updates.push({ id, patch });
  }
  async remove(id: string): Promise<void> {
    this.removed.push(id);
  }
  async appendExecutionLogs(): Promise<void> {
    throw new Error('no implementado en este falso');
  }
  async create(): Promise<void> {
    throw new Error('no implementado en este falso');
  }
}

describe('updateCampaignStrategy', () => {
  it('guarda la estrategia validada', async () => {
    const repo = new FakeRepo([campaign()]);
    const result = await updateCampaignStrategy(repo, { id: 'c1', strategy });
    expect(isOk(result)).toBe(true);
    expect(repo.updates).toHaveLength(1);
    expect(repo.updates[0].patch.strategy).toEqual(strategy);
  });

  it('id vacío → VALIDATION, inexistente → NOT_FOUND, inválida → VALIDATION', async () => {
    const repo = new FakeRepo([campaign()]);
    const empty = await updateCampaignStrategy(repo, { id: '', strategy });
    if (isErr(empty)) expect(empty.error.code).toBe('VALIDATION');

    const missing = await updateCampaignStrategy(repo, { id: 'x', strategy });
    if (isErr(missing)) expect(missing.error.code).toBe('NOT_FOUND');

    const bad = await updateCampaignStrategy(repo, {
      id: 'c1',
      strategy: { strategyName: 'S', logic: 'L', timeline: [] },
    });
    if (isErr(bad)) expect(bad.error.code).toBe('VALIDATION');
    expect(repo.updates).toHaveLength(0);
  });
});

describe('setCampaignAutoPilot / removeCampaign', () => {
  it('alterna piloto y borra existentes', async () => {
    const repo = new FakeRepo([campaign()]);
    expect(isOk(await setCampaignAutoPilot(repo, { id: 'c1', autoPilot: false }))).toBe(true);
    expect(repo.updates[0].patch).toEqual({ autoPilot: false });
    expect(isOk(await removeCampaign(repo, 'c1'))).toBe(true);
    expect(repo.removed).toEqual(['c1']);
  });

  it('inexistentes → NOT_FOUND', async () => {
    const repo = new FakeRepo([]);
    const a = await setCampaignAutoPilot(repo, { id: 'x', autoPilot: true });
    const b = await removeCampaign(repo, 'x');
    if (isErr(a)) expect(a.error.code).toBe('NOT_FOUND');
    if (isErr(b)) expect(b.error.code).toBe('NOT_FOUND');
  });
});
