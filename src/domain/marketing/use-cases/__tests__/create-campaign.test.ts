import { describe, expect, it, vi } from 'vitest';
import { createCampaign } from '../create-campaign';
import { CampaignRepository } from '../../campaign-repository';

describe('createCampaign', () => {
  it('debe crear una campaa correctamente', async () => {
    const mockRepo: import('vitest').Mocked<CampaignRepository> = {
      findById: vi.fn(),
      listByMentor: vi.fn(),
      create: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
      remove: vi.fn(),
      appendExecutionLogs: vi.fn(),
    };

    const result = await createCampaign(mockRepo, {
      mentorId: 'm1',
      title: 'Nueva Campaa',
      salesPageId: 'page1',
      startDate: '2023-01-01',
      strategy: {
        strategyName: 'flash_sale',
        logic: 'logic',
        timeline: [{ day: 1, phase: 'launch', variantIndex: 0, action: 'send_email', channels: ['Email'] }]
      },
      id: 'custom-id'
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('custom-id');
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        id: 'custom-id',
        mentorId: 'm1',
        title: 'Nueva Campaa'
      }));
    }
  });
});
