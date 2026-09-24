import { describe, expect, it, vi } from 'vitest';
import { getBotConfig, DEFAULT_BOT_SETTINGS } from '../get-bot-config';

describe('getBotConfig', () => {
  it('debe devolver la configuración del worker si existe', async () => {
    const mockWorker = { getSettings: vi.fn().mockResolvedValue({ tone: 'formal' }) } as any;
    const mockRepo = { getConfig: vi.fn() } as any;

    const result = await getBotConfig(mockWorker, mockRepo);
    expect(result.tone).toBe('formal');
    expect(mockRepo.getConfig).not.toHaveBeenCalled();
  });

  it('debe hacer fallback a firestore si el worker falla', async () => {
    const mockWorker = { getSettings: vi.fn().mockResolvedValue(null) } as any;
    const mockRepo = { getConfig: vi.fn().mockResolvedValue({ tone: 'informal' }) } as any;

    const result = await getBotConfig(mockWorker, mockRepo);
    expect(result.tone).toBe('informal');
  });

  it('debe devolver DEFAULT_BOT_SETTINGS si ambos fallan', async () => {
    const mockWorker = { getSettings: vi.fn().mockResolvedValue(null) } as any;
    const mockRepo = { getConfig: vi.fn().mockResolvedValue(null) } as any;

    const result = await getBotConfig(mockWorker, mockRepo);
    expect(result).toBe(DEFAULT_BOT_SETTINGS);
  });
});
