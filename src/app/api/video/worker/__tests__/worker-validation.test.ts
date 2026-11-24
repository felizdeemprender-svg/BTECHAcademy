import { describe, it, expect } from 'vitest';
import { workerPayloadSchema } from '../schema';

describe('Video Worker - Validacion de Esquema Zod (src/app/api/video/worker/route.ts)', () => {
  it('debe aceptar payload valido para generate-full-campaign', () => {
    const payload = {
      action: 'generate-full-campaign',
      campaignId: 'camp-123',
      targetAudience: 'Emprendedores gastronómicos',
      campaignMission: 'Vender curso de panadería',
      autoGenerateImages: true,
      googleToken: 'ya29.sample_token'
    };

    const result = workerPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe('generate-full-campaign');
      expect(result.data.campaignId).toBe('camp-123');
      expect(result.data.autoGenerateImages).toBe(true);
    }
  });

  it('debe aceptar payload para tarea granular generate-single-piece (Fan-Out)', () => {
    const payload = {
      action: 'generate-single-piece',
      campaignId: 'camp-456',
      pieceIndex: 2,
      socialPiece: {
        platform: 'instagram',
        format: 'reels'
      }
    };

    const result = workerPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe('generate-single-piece');
      expect(result.data.pieceIndex).toBe(2);
    }
  });

  it('debe aceptar payload para render-v2', () => {
    const payload = {
      action: 'render-v2',
      jobId: 'job-789',
      renderRequest: {
        adn: { id: '01_CINEMA' },
        slices: []
      }
    };

    const result = workerPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('debe rechazar payloads sin accion requerida', () => {
    const payload = {
      campaignId: 'camp-999'
    };

    const result = workerPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('debe rechazar acciones no autorizadas o desconocidas', () => {
    const payload = {
      action: 'unauthorized-action-execute-shell',
      campaignId: 'camp-danger'
    };

    const result = workerPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('debe aceptar googleToken nulo o indefinido sin fallar validacion', () => {
    const payload = {
      action: 'generate-video',
      googleToken: null
    };

    const result = workerPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
