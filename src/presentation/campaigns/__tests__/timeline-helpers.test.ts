/**
 * Tests de helpers del editor de timeline.
 * Los componentes son wrappers finos sobre estos helpers.
 */
import { describe, expect, it } from 'vitest';

import type { TimelineEvent } from '@/domain/marketing';

import {
  addEvent,
  removeEventAt,
  sortEventsByDay,
  toggleEventChannel,
  updateEventAt,
} from '../timeline-helpers';

const base: TimelineEvent = {
  day: 1,
  phase: 'Expectativa',
  variantIndex: 0,
  action: 'Teaser',
  channels: ['Social'],
};

describe('updateEventAt', () => {
  it('actualiza día con clamp mínimo 1', () => {
    expect(updateEventAt([base], 0, 'day', 5)[0].day).toBe(5);
    expect(updateEventAt([base], 0, 'day', 0)[0].day).toBe(1);
    expect(updateEventAt([base], 0, 'day', Number.NaN)[0].day).toBe(1);
  });

  it('variantIndex se limita a 0-2', () => {
    expect(updateEventAt([base], 0, 'variantIndex', 2)[0].variantIndex).toBe(2);
    expect(updateEventAt([base], 0, 'variantIndex', 9)[0].variantIndex).toBe(2);
    expect(updateEventAt([base], 0, 'variantIndex', -1)[0].variantIndex).toBe(0);
  });

  it('actualiza fase y acción sin tocar otros eventos', () => {
    const events = [base, { ...base, day: 2 }];
    const next = updateEventAt(events, 1, 'action', 'Cierre');
    expect(next[1].action).toBe('Cierre');
    expect(next[0].action).toBe('Teaser');
    expect(events[1].action).toBe('Teaser');
  });
});

describe('removeEventAt / addEvent', () => {
  it('elimina por índice de forma inmutable', () => {
    const events = [base, { ...base, day: 2 }];
    expect(removeEventAt(events, 0)).toHaveLength(1);
    expect(events).toHaveLength(2);
  });

  it('añade hito al día siguiente del máximo, ordenado', () => {
    const next = addEvent([{ ...base, day: 3 }, { ...base, day: 1 }]);
    expect(next.map((e) => e.day)).toEqual([1, 3, 4]);
    expect(next[2].channels).toEqual(['Social']);
  });

  it('lista vacía empieza en día 1', () => {
    expect(addEvent([])[0].day).toBe(1);
  });
});

describe('toggleEventChannel / sortEventsByDay', () => {
  it('alterna canales sin duplicar', () => {
    const added = toggleEventChannel([base], 0, 'Email');
    expect(added[0].channels).toEqual(['Social', 'Email']);
    const removed = toggleEventChannel(added, 0, 'Social');
    expect(removed[0].channels).toEqual(['Email']);
  });

  it('ordena por día', () => {
    const events = [{ ...base, day: 3 }, { ...base, day: 1 }, { ...base, day: 2 }];
    expect(sortEventsByDay(events).map((e) => e.day)).toEqual([1, 2, 3]);
  });
});
