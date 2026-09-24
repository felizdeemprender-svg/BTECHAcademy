import { describe, expect, it, vi } from 'vitest';
import { createCampaign } from '../create-campaign';
import { CampaignRepository } from '../../campaign-repository';
import { Campaign } from '../../campaign';

describe('createCampaign', () => {
  it('debe crear una campaña correctamente', async () => {
    const mockRepo: CampaignRepository = {
      getMentorCampaigns: vi.fn(),
      getCampaignById: vi.fn(),
      saveCampaign: vi.fn().mockResolvedValue(undefined),
      deleteCampaign: vi.fn(),
    };

    const result = await createCampaign(mockRepo, {
      mentorId: 'm1',
      name: 'Nueva Campaña',
      mission: 'venta',
      productId: 'p1',
      productName: 'Producto 1',
      timeline: []
    });

    expect(result.id).toBeDefined();
    expect(result.mentorId).toBe('m1');
    expect(result.name).toBe('Nueva Campaña');
    expect(mockRepo.saveCampaign).toHaveBeenCalledWith(result);
  });
});
