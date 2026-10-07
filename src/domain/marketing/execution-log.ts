/**
 * Marketing — Log de ejecución (array `executionLogs` de la campaña).
 * Cada emisión (sandbox o producción) deja un registro con feedback.
 */
import { z } from 'zod';

export const ExecutionModeSchema = z.enum(['sandbox', 'production']);
export type ExecutionMode = z.infer<typeof ExecutionModeSchema>;

export const ExecutionStatusSchema = z.enum(['success', 'error']);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const ExecutionLogSchema = z.object({
  timestamp: z.string().min(1, 'timestamp vacío'),
  day: z.number().int().min(1),
  channel: z.string().min(1, 'canal vacío'),
  platform: z.string().optional(),
  action: z.string().min(1, 'acción vacía'),
  phase: z.string().optional(),
  variantIndex: z.number().int().min(0).max(2).optional(),
  time: z.string().optional(),
  videoName: z.string().optional(),
  format: z.string().optional(),
  status: ExecutionStatusSchema,
  mode: ExecutionModeSchema,
  provider: z.string().min(1, 'proveedor vacío'),
  feedback: z.string().default(''),
  responseId: z.string().optional(),
  protocolVerified: z.boolean().default(false),
});
export type ExecutionLog = z.infer<typeof ExecutionLogSchema>;

export function parseExecutionLog(data: unknown): ExecutionLog {
  return ExecutionLogSchema.parse(data);
}

export function isSuccessfulLog(log: Pick<ExecutionLog, 'status'>): boolean {
  return log.status === 'success';
}

export function isSandboxLog(log: Pick<ExecutionLog, 'mode'>): boolean {
  return log.mode === 'sandbox';
}

export function filterLogsByDay(
  logs: readonly ExecutionLog[],
  day: number,
): ExecutionLog[] {
  return logs.filter((l) => l.day === day);
}

/** Agrega logs de forma inmutable (array nuevo). */
export function appendExecutionLogs(
  logs: readonly ExecutionLog[],
  ...nuevos: ExecutionLog[]
): ExecutionLog[] {
  return [...logs, ...nuevos];
}
