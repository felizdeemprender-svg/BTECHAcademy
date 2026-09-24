import { describe, expect, it, vi, beforeEach } from 'vitest';
import { logAiInteraction, type LogAiInteractionDeps } from '../log-ai-interaction';

describe('Auditing Use Cases: logAiInteraction', () => {
  let defaultDeps: LogAiInteractionDeps;

  beforeEach(() => {
    defaultDeps = {
      gateway: {
        hasSufficientCredits: vi.fn().mockResolvedValue(true),
        deductCredits: vi.fn().mockResolvedValue(undefined),
        logAuditRecord: vi.fn().mockResolvedValue(undefined),
        scanContentForSensitiveTopics: vi.fn().mockResolvedValue({ isFlagged: false }),
      }
    };
  });

  const validPayload = {
    userId: 'user1',
    role: 'alumno' as const,
    feature: 'chat',
    tokensUsed: 150,
    creditsCost: 2
  };

  it('debe registrar y deducir créditos si el usuario tiene saldo', async () => {
    const result = await logAiInteraction(defaultDeps, validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.success).toBe(true);
      expect(result.value.logId).toContain('audit_');
    }
    
    expect(defaultDeps.gateway.hasSufficientCredits).toHaveBeenCalledWith('user1', 'alumno', 2);
    expect(defaultDeps.gateway.deductCredits).toHaveBeenCalledWith('user1', 'alumno', 2);
    expect(defaultDeps.gateway.logAuditRecord).toHaveBeenCalled();
  });

  it('debe fallar y no registrar si no hay saldo suficiente', async () => {
    defaultDeps.gateway.hasSufficientCredits = vi.fn().mockResolvedValue(false);
    
    const result = await logAiInteraction(defaultDeps, validPayload);
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
    expect(defaultDeps.gateway.deductCredits).not.toHaveBeenCalled();
    expect(defaultDeps.gateway.logAuditRecord).not.toHaveBeenCalled();
  });

  it('debe registrar sin deducir si creditsCost es 0', async () => {
    const payloadZero = { ...validPayload, creditsCost: 0 };
    const result = await logAiInteraction(defaultDeps, payloadZero);
    
    expect(result.ok).toBe(true);
    expect(defaultDeps.gateway.hasSufficientCredits).not.toHaveBeenCalled();
    expect(defaultDeps.gateway.deductCredits).not.toHaveBeenCalled();
    expect(defaultDeps.gateway.logAuditRecord).toHaveBeenCalled();
  });
});
