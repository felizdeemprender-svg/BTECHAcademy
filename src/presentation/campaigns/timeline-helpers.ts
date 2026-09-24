/**
 * Presentación — Helpers puros del editor de timeline.
 * Extraídos de la lógica triplicada en marketing/page.tsx,
 * marketing/build/page.tsx y execution/page.tsx.
 * Inmutables: devuelven arrays nuevos.
 */
import type { Channel, TimelineEvent } from '@/domain/marketing';

export function updateEventAt(
  events: readonly TimelineEvent[],
  index: number,
  field: 'day' | 'phase' | 'action' | 'variantIndex',
  value: number | string,
): TimelineEvent[] {
  return events.map((e, i) => {
    if (i !== index) return e;
    if (field === 'day') {
      const day = typeof value === 'number' ? value : parseInt(value, 10);
      return { ...e, day: Number.isFinite(day) && day >= 1 ? Math.floor(day) : 1 };
    }
    if (field === 'variantIndex') {
      const v = typeof value === 'number' ? value : parseInt(value, 10);
      const clamped = Number.isFinite(v) ? Math.min(2, Math.max(0, v)) : 0;
      return { ...e, variantIndex: clamped as 0 | 1 | 2 };
    }
    return { ...e, [field]: value };
  });
}

export function removeEventAt(events: readonly TimelineEvent[], index: number): TimelineEvent[] {
  return events.filter((_, i) => i !== index);
}

/** Nuevo hito al día siguiente del máximo, ordenado por día. */
export function addEvent(events: readonly TimelineEvent[]): TimelineEvent[] {
  const lastDay = events.length > 0 ? Math.max(...events.map((e) => e.day)) : 0;
  return sortEventsByDay([
    ...events,
    {
      day: lastDay + 1,
      phase: 'Ajuste',
      variantIndex: 0 as const,
      action: 'Nueva acción coordinada',
      channels: ['Social' as Channel],
    },
  ]);
}

export function toggleEventChannel(
  events: readonly TimelineEvent[],
  index: number,
  channel: Channel,
): TimelineEvent[] {
  return events.map((e, i) => {
    if (i !== index) return e;
    const has = e.channels.includes(channel);
    const channels = has ? e.channels.filter((c) => c !== channel) : [...e.channels, channel];
    return { ...e, channels };
  });
}

export function sortEventsByDay(events: readonly TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => a.day - b.day);
}
