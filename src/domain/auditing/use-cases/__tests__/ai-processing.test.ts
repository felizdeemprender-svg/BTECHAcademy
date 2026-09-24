import { vi, describe, it, expect } from 'vitest';
import { ProcessAiContentUseCase } from '../process-ai-content-use-case';

describe('ProcessAiContentUseCase', () => {
  it('should return successfully using the primary AI model', async () => {
    const mockPrimary = vi.fn().mockResolvedValue('Response from primary model');
    const mockFallback = vi.fn().mockResolvedValue('Response from fallback model');
    const useCase = new ProcessAiContentUseCase(mockPrimary, mockFallback);
    const result = await useCase.execute({ prompt: 'Test prompt' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.generatedText).toBe('Response from primary model');
      expect(result.value.wasFallbackUsed).toBe(false);
      expect(result.value.model).toBe('primary');
    }
    expect(mockPrimary).toHaveBeenCalledTimes(1);
    expect(mockFallback).not.toHaveBeenCalled();
  });

  it('should seamlessly fallback to the secondary model if primary fails', async () => {
    const mockPrimary = vi.fn().mockRejectedValue(new Error('invalid_argument'));
    const mockFallback = vi.fn().mockResolvedValue('Response from fallback model');
    const useCase = new ProcessAiContentUseCase(mockPrimary, mockFallback);
    const result = await useCase.execute({ prompt: 'Complex prompt' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.generatedText).toBe('Response from fallback model');
      expect(result.value.wasFallbackUsed).toBe(true);
      expect(result.value.model).toBe('fallback');
    }
  });

  it('should fail cleanly if both models fail', async () => {
    const mockPrimary = vi.fn().mockRejectedValue(new Error('Quota exceeded'));
    const mockFallback = vi.fn().mockRejectedValue(new Error('Fallback also failed'));
    const useCase = new ProcessAiContentUseCase(mockPrimary, mockFallback);
    const result = await useCase.execute({ prompt: 'Will fail completely' });
    expect(result.ok).toBe(false);
  });

  it('should fail if prompt is empty without calling models', async () => {
    const mockPrimary = vi.fn();
    const useCase = new ProcessAiContentUseCase(mockPrimary);
    const result = await useCase.execute({ prompt: '   ' });
    expect(result.ok).toBe(false);
    expect(mockPrimary).not.toHaveBeenCalled();
  });
});
