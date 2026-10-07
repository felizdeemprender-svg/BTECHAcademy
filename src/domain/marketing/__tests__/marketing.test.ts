/**
 * Tests del dominio marketing: timeline, franjas horarias,
 * plan de coordinación, logs y campañas. Dominio puro, sin Firebase.
 */
import { describe, expect, it } from 'vitest';

import { TimelineEventSchema, usesChannel, type TimelineEvent } from '../timeline';
import { getPlatformPeakTime, getTimeSlotQuality } from '../platform-slots';
import {
  campaignCurrentDay,
  campaignProgressPercent,
  pastActions,
  todayActions,
} from '../coordination-plan';
import {
  appendExecutionLogs,
  filterLogsByDay,
  isSandboxLog,
  isSuccessfulLog,
  type ExecutionLog,
} from '../execution-log';
import { CampaignSchema, isExecutableCampaign, toggleAutoPilot } from '../campaign';

const baseEvent: TimelineEvent = {
  day: 1,
  phase: 'Expectativa',
  variantIndex: 0,
  action: 'Publicar teaser',
  channels: ['Social', 'Email'],
};

const baseLog: ExecutionLog = {
  timestamp: '2026-01-02T10:00:00.000Z',
  day: 2,
  channel: 'Social',
  platform: 'instagram',
  action: 'Publicar teaser',
  status: 'success',
  mode: 'sandbox',
  provider: 'INSTAGRAM',
  feedback: 'ok',
  protocolVerified: true,
};

function baseCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: 'camp1',
    mentorId: 'm1',
    title: 'Lanzamiento X',
    salesPageId: 'p1',
    strategy: {
      strategyName: 'Clásico',
      logic: 'Calentar y vender',
      timeline: [baseEvent, { ...baseEvent, day: 2 }],
    },
    startDate: '2026-01-01',
    ...overrides,
  };
}

describe('timeline', () => {
  it('parsea evento válido', () => {
    const e = TimelineEventSchema.parse(baseEvent);
    expect(e.channels).toEqual(['Social', 'Email']);
  });

  it('rechaza variante fuera de 0-2, día <1 y canales vacíos', () => {
    expect(() => TimelineEventSchema.parse({ ...baseEvent, variantIndex: 3 })).toThrow();
    expect(() => TimelineEventSchema.parse({ ...baseEvent, day: 0 })).toThrow();
    expect(() => TimelineEventSchema.parse({ ...baseEvent, channels: [] })).toThrow();
    expect(() => TimelineEventSchema.parse({ ...baseEvent, channels: ['SMS'] })).toThrow();
  });

  it('rechaza hora de socialSchedule con formato inválido', () => {
    expect(() =>
      TimelineEventSchema.parse({
        ...baseEvent,
        socialSchedule: { instagram: { videoName: 'V1', time: '25:00' } },
      }),
    ).toThrow();
    const e = TimelineEventSchema.parse({
      ...baseEvent,
      socialSchedule: { instagram: { videoName: 'V1', time: '18:00' } },
    });
    expect(e.socialSchedule?.instagram[0].time).toBe('18:00');
  });

  it('usesChannel detecta canales', () => {
    expect(usesChannel({ channels: ['Social'] }, 'Social')).toBe(true);
    expect(usesChannel({ channels: ['Social'] }, 'Email')).toBe(false);
  });
});

describe('platform-slots', () => {
  it('picos de cada red', () => {
    expect(getTimeSlotQuality('instagram', '18:00')).toBe('peak');
    expect(getTimeSlotQuality('tiktok', '19:30')).toBe('peak');
    expect(getTimeSlotQuality('linkedin', '08:30')).toBe('peak');
    expect(getTimeSlotQuality('twitter', '13:00')).toBe('peak');
    expect(getTimeSlotQuality('x', '13:00')).toBe('peak');
  });

  it('tolerancia ±40 min y moderados', () => {
    expect(getTimeSlotQuality('instagram', '18:30')).toBe('peak');
    expect(getTimeSlotQuality('instagram', '08:30')).toBe('moderate');
    expect(getTimeSlotQuality('instagram', '03:00')).toBe('low');
  });

  it('plataforma desconocida y hora inválida', () => {
    expect(getTimeSlotQuality('facebook', '18:00')).toBe('unknown');
    expect(getTimeSlotQuality('instagram', 'no-hora')).toBe('low');
  });

  it('getPlatformPeakTime devuelve el pico o fallback', () => {
    expect(getPlatformPeakTime('instagram')).toBe('18:00');
    expect(getPlatformPeakTime('TIKTOK')).toBe('19:30');
    expect(getPlatformPeakTime('facebook')).toBe('15:00');
  });
});

describe('coordination-plan', () => {
  it('campaignCurrentDay: inicio = día 1', () => {
    const start = new Date(2026, 0, 1, 10, 0);
    expect(campaignCurrentDay(start, new Date(2026, 0, 1, 23, 0))).toBe(1);
    expect(campaignCurrentDay(start, new Date(2026, 0, 2, 12, 0))).toBe(2);
    expect(campaignCurrentDay(start, new Date(2026, 0, 8, 12, 0))).toBe(8);
  });

  it('todayActions / pastActions filtran por día', () => {
    const timeline = [
      { ...baseEvent, day: 1 },
      { ...baseEvent, day: 2 },
      { ...baseEvent, day: 2 },
      { ...baseEvent, day: 3 },
    ];
    expect(todayActions(timeline, 2)).toHaveLength(2);
    expect(pastActions(timeline, 2)).toHaveLength(1);
    expect(todayActions(timeline, 9)).toHaveLength(0);
  });

  it('campaignProgressPercent con tope 100', () => {
    const timeline = [{ ...baseEvent, day: 1 }];
    expect(campaignProgressPercent(timeline, 1)).toBe(0);
    expect(campaignProgressPercent(timeline, 2)).toBe(100);
    expect(campaignProgressPercent([], 5)).toBe(0);
  });
});

describe('execution-log', () => {
  it('helpers de estado y modo', () => {
    expect(isSuccessfulLog(baseLog)).toBe(true);
    expect(isSuccessfulLog({ ...baseLog, status: 'error' })).toBe(false);
    expect(isSandboxLog(baseLog)).toBe(true);
    expect(isSandboxLog({ ...baseLog, mode: 'production' })).toBe(false);
  });

  it('filterLogsByDay y append inmutable', () => {
    const logs = [baseLog, { ...baseLog, day: 3 }];
    expect(filterLogsByDay(logs, 2)).toHaveLength(1);
    const next = appendExecutionLogs(logs, { ...baseLog, day: 4 });
    expect(next).toHaveLength(3);
    expect(logs).toHaveLength(2);
  });
});

describe('campaign', () => {
  it('parsea campaña con defaults (piloto, activa, sin logs)', () => {
    const c = CampaignSchema.parse(baseCampaign());
    expect(c.autoPilot).toBe(true);
    expect(c.status).toBe('active');
    expect(c.isActive).toBe(true);
    expect(c.executionLogs).toEqual([]);
  });

  it('isExecutableCampaign replica el filtro del Centro de Mando', () => {
    expect(isExecutableCampaign({ isActive: true, autoPilot: true, status: 'active' })).toBe(true);
    expect(isExecutableCampaign({ isActive: true, autoPilot: false, status: 'active' })).toBe(true);
    expect(isExecutableCampaign({ isActive: true, autoPilot: false, status: 'paused' })).toBe(false);
    expect(isExecutableCampaign({ isActive: false, autoPilot: true, status: 'active' })).toBe(false);
  });

  it('toggleAutoPilot invierte sin mutar', () => {
    const c = CampaignSchema.parse(baseCampaign());
    const toggled = toggleAutoPilot(c);
    expect(toggled.autoPilot).toBe(false);
    expect(c.autoPilot).toBe(true);
  });

  it('rechaza sin título ni estrategia', () => {
    expect(() => CampaignSchema.parse(baseCampaign({ title: '' }))).toThrow();
    expect(() =>
      CampaignSchema.parse(baseCampaign({ strategy: { strategyName: 'x', logic: 'y', timeline: [] } })),
    ).toThrow();
  });
});
