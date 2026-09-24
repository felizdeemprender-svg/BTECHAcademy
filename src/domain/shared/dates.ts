/**
 * Paso F0.1 — Helpers puros de fecha para billing.
 * Misma semántica que `date-fns` usada por el engine legacy
 * (`addDays` por día calendario, `addMonths` por mes calendario,
 * `format` dd/MM/yyyy), sin dependencias externas para que el
 * dominio siga puro.
 */

export function addDays(base: Date, days: number): Date {
  const out = new Date(base.getTime());
  out.setDate(out.getDate() + days);
  return out;
}

export function addMonths(base: Date, months: number): Date {
  const out = new Date(base.getTime());
  out.setMonth(out.getMonth() + months);
  return out;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Formato legacy `format(date, 'dd/MM/yyyy')` del engine. */
export function formatDayMonthYear(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Mismo cálculo legacy: `Math.ceil((trialEndsAt - now) / día)`. */
export function ceilDaysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY);
}
