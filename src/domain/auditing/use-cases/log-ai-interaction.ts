import { z } from 'zod';
import { err, ok, type Result } from '@/domain/shared/result';
import { forbidden, validationError, type DomainError } from '@/domain/shared/errors';

export const LogAiInteractionInputSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['mentor', 'alumno']),
  feature: z.string().min(1),
  tokensUsed: z.number().int().nonnegative().optional().default(0),
  creditsCost: z.number().int().nonnegative(),
});

export type LogAiInteractionInput = z.infer<typeof LogAiInteractionInputSchema>;

export interface AiAuditingGateway {
  hasSufficientCredits(userId: string, role: string, cost: number): Promise<boolean>;
  deductCredits(userId: string, role: string, cost: number): Promise<void>;
  logAuditRecord(data: Record<string, unknown>): Promise<void>;
  scanContentForSensitiveTopics(text: string): Promise<{ isSafe: boolean; reason?: string }>;
}

export interface LogAiInteractionDeps {
  readonly gateway: AiAuditingGateway;
}

export async function logAiInteraction(
  deps: LogAiInteractionDeps,
  input: unknown
): Promise<Result<{ success: boolean; logId: string }, DomainError>> {
  const parsed = LogAiInteractionInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(validationError('Invalid input payload'));
  }

  const { userId, role, feature, tokensUsed, creditsCost } = parsed.data;

  // Si el costo es 0, solo registramos, no deducimos
  if (creditsCost > 0) {
    const canAfford = await deps.gateway.hasSufficientCredits(userId, role, creditsCost);
    if (!canAfford) {
      return err(forbidden('Insufficient AI credits'));
    }
    await deps.gateway.deductCredits(userId, role, creditsCost);
  }

  const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const auditData = {
    id: logId,
    userId,
    role,
    feature,
    tokensUsed,
    creditsCost,
    status: 'success'
  };

  await deps.gateway.logAuditRecord(auditData);

  return ok({ success: true, logId });
}
