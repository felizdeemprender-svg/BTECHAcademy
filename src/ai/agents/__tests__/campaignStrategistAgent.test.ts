// src/ai/agents/__tests__/campaignStrategistAgent.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CoordinationOutput } from '../../../domain/marketing/coordination-plan';

vi.mock('@/ai/genkit', () => {
  return {
    ai: {
      defineFlow: (config: any, fn: any) => fn,
      generate: vi.fn().mockResolvedValue({
        output: {
          strategyName: 'test-strategy',
          logic: 'test-logic',
          timeline: [],
        },
      }),
    },
  };
});

import { runCampaignStrategist } from '../../agents/campaignStrategistAgent';
import { aiUnbilled } from '@/ai/genkit';

describe('runCampaignStrategist agent', () => {
  it('should parse model JSON output and return CoordinationOutput', async () => {
    const input = {
      role: 'mentor',
      uid: 'u1',
      campaignTitle: 'Demo Campaign',
      durationDays: 7,
      targetAudience: 'Test Audience',
      availableVideos: ['vid1', 'vid2'],
      productData: { price: 200, productType: 'course' },
    } as any;

    const result = (await runCampaignStrategist(input)) as CoordinationOutput;

    expect(result).toEqual({
      strategyName: 'test-strategy',
      logic: 'test-logic',
      timeline: [],
    });
  });
});
