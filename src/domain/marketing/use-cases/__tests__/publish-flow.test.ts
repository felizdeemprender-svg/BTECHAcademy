/**
 * Tests del flujo de publicación: packs, plan IA y creación.
 */
import { describe, expect, it } from 'vitest';

import { isErr, isOk } from '@/domain/shared/result';

import type { SalesPage, SalesPageRepository } from '@/domain/catalog';
import type { CampaignRepository, NewCampaign } from '../../campaign-repository';
import type { CoordinationInput, CoordinationOutput, CoordinationPlanner } from '../..';
import { listCampaignPacks } from '../list-campaign-packs';
import { generateCoordinationPlan } from '../generate-plan';
import { createCampaign } from '../create-campaign';

function page(overrides: Partial<SalesPage> & { id: string }): SalesPage {
  return {
    mentorId: 'm1',
    title: 'P',
    type: 'campaign_pack',
    aiContent: { landings: [], socials: [], emails: [], ads: [] },
    ...overrides,
  } as SalesPage;
}

class FakePages implements SalesPageRepository {
  constructor(private readonly items: SalesPage[]) {}
  async findById(id: string): Promise<SalesPage | null> {
    return this.items.find((p) => p.id === id) ?? null;
  }
  async listByMentor(mentorId: string): Promise<SalesPage[]> {
    return this.items.filter((p) => p.mentorId === mentorId);
  }
}

class FakeCampaigns implements CampaignRepository {
  created: NewCampaign[] = [];
  async findById(): Promise<null> {
    return null;
  }
  async listByMentor(): Promise<never[]> {
    return [];
  }
  async create(campaign: NewCampaign): Promise<void> {
    this.created.push(campaign);
  }
  async update(): Promise<void> {}
  async remove(): Promise<void> {}
  async appendExecutionLogs(): Promise<void> {}
}

const plan: CoordinationOutput = {
  strategyName: 'S',
  logic: 'L',
  timeline: [{ day: 1, phase: 'P', variantIndex: 0, action: 'A', channels: ['Email'] }],
};

class FakePlanner implements CoordinationPlanner {
  constructor(private readonly output: unknown) {}
  async generate(_input: CoordinationInput): Promise<CoordinationOutput> {
    return this.output as CoordinationOutput;
  }
}

describe('listCampaignPacks', () => {
  it('excluye landing_only y ordena por creación', async () => {
    const repo = new FakePages([
      page({ id: 'old', createdAt: new Date('2026-01-01') }),
      page({ id: 'new', createdAt: new Date('2026-02-01') }),
      page({ id: 'land', type: 'landing_only' }),
      page({ id: 'other', mentorId: 'm2' }),
    ]);
    const result = await listCampaignPacks(repo, { mentorId: 'm1' });
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value.map((p) => p.id)).toEqual(['new', 'old']);
  });

  it('mentorId vacío → VALIDATION', async () => {
    const result = await listCampaignPacks(new FakePages([]), { mentorId: '' });
    if (isErr(result)) expect(result.error.code).toBe('VALIDATION');
  });
});

describe('generateCoordinationPlan', () => {
  const input = {
    campaignTitle: 'C',
    strategyType: 'classic_launch',
    durationDays: 7,
    targetAudience: 'X',
  };

  it('devuelve el plan validado', async () => {
    const result = await generateCoordinationPlan(new FakePlanner(plan), input);
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value.strategyName).toBe('S');
  });

  it('entrada inválida → VALIDATION; salida inválida → VALIDATION; throw → UNAVAILABLE', async () => {
    const badIn = await generateCoordinationPlan(new FakePlanner(plan), { campaignTitle: '' });
    if (isErr(badIn)) expect(badIn.error.code).toBe('VALIDATION');

    const badOut = await generateCoordinationPlan(new FakePlanner({ nope: true }), input);
    if (isErr(badOut)) expect(badOut.error.code).toBe('VALIDATION');

    const failing: CoordinationPlanner = {
      generate: async () => {
        throw new Error('IA caída');
      },
    };
    const down = await generateCoordinationPlan(failing, input);
    if (isErr(down)) expect(down.error.code).toBe('UNAVAILABLE');
  });
});

describe('createCampaign', () => {
  it('crea con id determinista en tests y documento completo', async () => {
    const repo = new FakeCampaigns();
    const result = await createCampaign(repo, {
      id: 'camp-test',
      mentorId: 'm1',
      title: 'C',
      salesPageId: 'p1',
      courseId: 'course1',
      strategy: plan,
      startDate: '2026-01-01',
    });
    if (!isOk(result)) throw new Error('se esperaba ok');
    expect(result.value).toEqual({ id: 'camp-test' });
    expect(repo.created).toHaveLength(1);
    expect(repo.created[0]).toMatchObject({
      id: 'camp-test',
      autoPilot: true,
      status: 'draft',
      isActive: false,
    });
  });

  it('datos inválidos → VALIDATION', async () => {
    const repo = new FakeCampaigns();
    const result = await createCampaign(repo, { mentorId: 'm1', title: '' });
    if (isErr(result)) expect(result.error.code).toBe('VALIDATION');
    expect(repo.created).toHaveLength(0);
  });
});
