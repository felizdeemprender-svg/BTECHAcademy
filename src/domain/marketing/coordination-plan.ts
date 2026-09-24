/**
 * Marketing — Plan de coordinación (salida del flujo IA).
 * Incluye los cálculos de día actual / acciones de hoy / progreso
 * hoy mezclados en las páginas de campañas y ejecución.
 */
import { z } from 'zod';
import { differenceInDays } from 'date-fns';

import { TimelineEventSchema, type TimelineEvent } from './timeline';

export const StrategyTypeSchema = z.enum(['flash_sale', 'classic_launch', 'evergreen_warmup']);
export type StrategyType = z.infer<typeof StrategyTypeSchema>;

export const CoordinationInputSchema = z.object({
  campaignTitle: z.string().min(1, 'título vacío'),
  strategyType: StrategyTypeSchema,
  durationDays: z.number().int().min(1).default(7),
  targetAudience: z.string().default(''),
});
export type CoordinationInput = z.infer<typeof CoordinationInputSchema>;

export const CoordinationOutputSchema = z.object({
  strategyName: z.string().min(1, 'nombre vacío'),
  logic: z.string().min(1, 'lógica vacía'),
  timeline: z.array(TimelineEventSchema).min(1, 'timeline vacío'),
});
export type CoordinationOutput = z.infer<typeof CoordinationOutputSchema>;

export function parseCoordinationOutput(data: unknown): CoordinationOutput {
  return CoordinationOutputSchema.parse(data);
}

/**
 * Día relativo de la campaña (1 = día de inicio).
 * Idéntico a las páginas actuales: differenceInDays(hoy, inicio) + 1
 * (misma librería date-fns, misma semántica de días parciales).
 */
export function campaignCurrentDay(startDate: Date, now: Date = new Date()): number {
  return differenceInDays(now, startDate) + 1;
}

/**
 * 'yyyy-mm-dd' (valor de <input type="date">) como día LOCAL.
 * Día local evita el off-by-one de `new Date(string)` (UTC)
 * en timezones negativos. `fallback` si no parsea.
 */
export function parseCampaignDate(value: string, fallback: Date): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return fallback;
  const parsed = new Date(
    parseInt(match[1], 10),
    parseInt(match[2], 10) - 1,
    parseInt(match[3], 10),
  );
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function todayActions(
  timeline: readonly TimelineEvent[],
  currentDay: number,
): TimelineEvent[] {
  return timeline.filter((e) => e.day === currentDay);
}

export function pastActions(
  timeline: readonly TimelineEvent[],
  currentDay: number,
): TimelineEvent[] {
  return timeline.filter((e) => e.day < currentDay);
}

/** Progreso 0-100 según hitos pasados (tope 100). */
export function campaignProgressPercent(
  timeline: readonly TimelineEvent[],
  currentDay: number,
): number {
  if (timeline.length === 0) return 0;
  return Math.min(100, Math.round((pastActions(timeline, currentDay).length / timeline.length) * 100));
}
