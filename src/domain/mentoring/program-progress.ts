/**
 * Mentoría — Cálculo de progreso del programa.
 * Reglas extraídas de seguimientos/[id]/page.tsx:
 * - planificadas completadas / totalSessions del programa
 * - extra completadas (conteo aparte)
 * - tareas completadas + progreso promedio de tareas
 */
import { z } from 'zod';

export const ProgramProgressInputSchema = z.object({
  totalPlanned: z.number().int().min(0),
  completedPlanned: z.number().int().min(0),
  completedExtra: z.number().int().min(0),
  totalExtra: z.number().int().min(0),
  tasksCompleted: z.number().int().min(0),
  tasksTotal: z.number().int().min(0),
  avgTaskProgress: z.number().min(0).max(100),
});
export type ProgramProgressInput = z.infer<typeof ProgramProgressInputSchema>;

export interface ProgramProgress {
  readonly sessionProgressPercent: number;
  readonly extraCompleted: number;
  readonly tasksCompleted: number;
  readonly tasksTotal: number;
  readonly avgTaskProgress: number;
}

export function computeProgramProgress(input: ProgramProgressInput): ProgramProgress {
  const sessionProgressPercent =
    input.totalPlanned > 0
      ? Math.min(100, Math.round((input.completedPlanned / input.totalPlanned) * 100))
      : 0;
  return {
    sessionProgressPercent,
    extraCompleted: input.completedExtra,
    tasksCompleted: input.tasksCompleted,
    tasksTotal: input.tasksTotal,
    avgTaskProgress: input.tasksTotal > 0 ? input.avgTaskProgress : 0,
  };
}

/** Promedio de `progress` de una lista de tareas (0 si vacía). */
export function averageTaskProgress(tasks: readonly { progress?: number }[]): number {
  if (tasks.length === 0) return 0;
  const total = tasks.reduce((acc, t) => acc + (t.progress ?? 0), 0);
  return total / tasks.length;
}
