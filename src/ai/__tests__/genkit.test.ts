import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ai, aiUnbilled, validateAiConfig } from '../genkit';
import { deductCredits, checkSufficientCredits, calculateGeminiCost, calculateEmbeddingCost } from '@/lib/payments/credits';

// Mock dependencies
vi.mock('@/lib/payments/credits', () => ({
  deductCredits: vi.fn(),
  checkSufficientCredits: vi.fn().mockResolvedValue({ ok: true, balance: 10 }),
  calculateGeminiCost: vi.fn().mockResolvedValue({ providerCost: 0.01, billedCost: 0.1 }),
  calculateEmbeddingCost: vi.fn().mockResolvedValue({ providerCost: 0.001, billedCost: 0.02 }),
}));

// We will manipulate this mock in our tests
const mockCookiesGet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: mockCookiesGet
  }))
}));

// Mock the original genkit to avoid real API calls
vi.mock('genkit', () => {
  return {
    genkit: vi.fn(() => ({
      generate: vi.fn().mockResolvedValue({
        usage: { totalTokens: 100 }
      }),
      embed: vi.fn().mockResolvedValue({
        embeddings: [[0.1, 0.2]]
      })
    })),
    z: {}
  };
});
vi.mock('@genkit-ai/google-genai', () => ({
  googleAI: vi.fn()
}));

// Mute console logs for cleaner test output
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Genkit Proxies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setRole = (role: string | null) => {
    mockCookiesGet.mockImplementation((key: string) => {
      if (key === 'btech_uid') return { value: 'test_uid' };
      if (key === 'btech_role') return role ? { value: role } : null;
      return null;
    });
  };

  describe('Validation', () => {
    it('validateAiConfig() should return true if key exists', () => {
      process.env.GOOGLE_GENAI_API_KEY = 'dummy';
      expect(validateAiConfig().has_genai).toBe(true);
    });
  });

  describe('ai.generate() Role Billing', () => {
    it('should bill a "mentor" user', async () => {
      setRole('mentor');
      await ai.generate({ prompt: 'Test' }, 'test_action');
      expect(checkSufficientCredits).toHaveBeenCalledWith('test_uid', 0.001, 'mentor');
      expect(calculateGeminiCost).toHaveBeenCalledWith(100);
      expect(deductCredits).toHaveBeenCalledWith('test_uid', expect.any(Object), 'test_action', 'mentor', undefined);
    });

    it('should bill a "marketing" user', async () => {
      setRole('marketing');
      await ai.generate({ prompt: 'Test' }, 'test_action');
      expect(checkSufficientCredits).toHaveBeenCalledWith('test_uid', 0.001, 'marketing');
      expect(deductCredits).toHaveBeenCalledWith('test_uid', expect.any(Object), 'test_action', 'marketing', undefined);
    });

    it('should NOT check balance for an "admin" user, but still track telemetry', async () => {
      setRole('admin');
      await ai.generate({ prompt: 'Test' }, 'test_action');
      expect(checkSufficientCredits).not.toHaveBeenCalled();
      expect(calculateGeminiCost).toHaveBeenCalledWith(100); // Telemetry is tracked
      expect(deductCredits).toHaveBeenCalledWith('test_uid', expect.any(Object), 'test_action', 'admin', undefined);
    });

    it('should throw Error if an "alumno" user calls generate without ownerUid', async () => {
      setRole('alumno');
      await expect(ai.generate({ prompt: 'Test' }, 'test_action')).rejects.toThrow('ACCESO_DENEGADO');
    });

    it('should bill the tutor (ownerUid) when an "alumno" acts', async () => {
      setRole('alumno');
      // Pass ownerUid as the 3rd arg to generate
      await ai.generate({ prompt: 'Test' }, 'test_action', 'tutor_uid');
      
      // Should check the tutor's balance
      expect(checkSufficientCredits).toHaveBeenCalledWith('tutor_uid', 0.001, 'mentor');
      expect(calculateGeminiCost).toHaveBeenCalledWith(100); 
      // Should deduct from tutor_uid
      expect(deductCredits).toHaveBeenCalledWith('test_uid', expect.any(Object), 'test_action', 'alumno', 'tutor_uid');
    });
  });

  describe('ai.embed() Role Billing', () => {
    it('should check credits for mentor and use specific calculateEmbeddingCost', async () => {
      setRole('mentor');
      const content = 'a'.repeat(60); 
      await ai.embed({ content }, 'embed_action');
      
      expect(checkSufficientCredits).toHaveBeenCalledWith('test_uid', 0.0001, 'mentor'); 
      expect(calculateEmbeddingCost).toHaveBeenCalled(); // New separated method
      expect(calculateGeminiCost).not.toHaveBeenCalled();
      expect(deductCredits).toHaveBeenCalledWith('test_uid', expect.any(Object), 'embed_action', 'mentor', undefined);
    });

    it('should NOT check credits for admin when embedding but still call calculateEmbeddingCost', async () => {
      setRole('admin');
      await ai.embed({ content: 'test' }, 'embed_action');
      expect(checkSufficientCredits).not.toHaveBeenCalled();
      expect(calculateEmbeddingCost).toHaveBeenCalled();
      expect(deductCredits).toHaveBeenCalledWith('test_uid', expect.any(Object), 'embed_action', 'admin', undefined);
    });
  });

  describe('aiUnbilled.generate() (Fase 3 Additions)', () => {
    it('should skip balance check and skip deduction even for mentor', async () => {
      setRole('mentor');
      await aiUnbilled.generate({ prompt: 'Test' }, 'test_action');
      
      // Debe registrar la observabilidad de tokens y costos teóricos
      expect(calculateGeminiCost).toHaveBeenCalledWith(100);
      
      // PERO no debe chequear balance ni descontar
      expect(checkSufficientCredits).not.toHaveBeenCalled();
      expect(deductCredits).not.toHaveBeenCalled();
    });
  });
});
