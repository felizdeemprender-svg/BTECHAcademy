import { describe, expect, it, vi } from 'vitest';
import { generateCoordinationPlan } from '../generate-plan';
import { CoordinationPlanner } from '../../coordination-planner';

describe('generateCoordinationPlan', () => {
  it('debe generar un plan basado en los parametros', async () => {
    const mockPlanner: CoordinationPlanner = {
      generate: vi.fn().mockResolvedValue({
        strategyName: 'flash_sale',
        logic: 'logic',
        timeline: [{ day: 1, phase: 'launch', variantIndex: 0, action: 'send_email', channels: ['Email'] }]
      })
    };
    
    const result = await generateCoordinationPlan(mockPlanner, {
      campaignTitle: 'Title',
      strategyType: 'flash_sale',
      durationDays: 7,
      targetAudience: 'Everyone',
    });

    expect(result.ok).toBe(true);
  });
});
