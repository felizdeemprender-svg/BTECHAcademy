/**
 * Marketing — Franjas horarias por plataforma.
 * Picos y horarios moderados usados por el plan de coordinación IA
 * y el editor del builder. Tolerancia de ±40 minutos.
 */
import { z } from 'zod';

export const PlatformSchema = z.enum(['instagram', 'tiktok', 'linkedin', 'twitter', 'x']);
export type Platform = z.infer<typeof PlatformSchema>;

export interface TimeSlot {
  readonly time: string;
  readonly label: string;
}

export interface PlatformSlots {
  readonly peak: TimeSlot;
  readonly moderate: readonly TimeSlot[];
}

const SLOT_TOLERANCE_MINUTES = 40;

export const PLATFORM_TIME_SLOTS: Record<Platform, PlatformSlots> = {
  instagram: {
    peak: { time: '18:00', label: 'Salida Laboral: Alto Impacto (Reels/Ocio)' },
    moderate: [
      { time: '08:30', label: 'Despertar: Tránsito Mediano (Scroll Rápido)' },
      { time: '13:00', label: 'Almuerzo: Tránsito Mediano (Conexión Media)' },
    ],
  },
  tiktok: {
    peak: { time: '19:30', label: 'Relax Nocturno: Alto Impacto (Vídeos Cortos)' },
    moderate: [
      { time: '12:30', label: 'Almuerzo: Tránsito Mediano (Entretenimiento)' },
      { time: '16:30', label: 'Tarde/Merienda: Tránsito Mediano (Público Joven)' },
    ],
  },
  linkedin: {
    peak: { time: '08:30', label: 'Café Matutino: Alto Impacto (Noticias B2B)' },
    moderate: [
      { time: '12:00', label: 'Almuerzo B2B: Tránsito Mediano (Pausa Profesional)' },
      { time: '17:30', label: 'Cierre Oficina: Tránsito Mediano (Networking)' },
    ],
  },
  twitter: {
    peak: { time: '13:00', label: 'Almuerzo: Alto Impacto (Tendencias/Noticias)' },
    moderate: [
      { time: '08:00', label: 'Camino al Trabajo: Tránsito Mediano (Noticias Rápidas)' },
      { time: '18:30', label: 'Vuelta a Casa: Tránsito Mediano (Cierre del Día)' },
    ],
  },
  x: {
    peak: { time: '13:00', label: 'Almuerzo: Alto Impacto (Tendencias/Noticias)' },
    moderate: [
      { time: '08:00', label: 'Camino al Trabajo: Tránsito Mediano (Noticias Rápidas)' },
      { time: '18:30', label: 'Vuelta a Casa: Tránsito Mediano (Cierre del Día)' },
    ],
  },
};

export type TimeSlotQuality = 'peak' | 'moderate' | 'low' | 'unknown';

function toMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function withinTolerance(a: string, b: string): boolean {
  const ma = toMinutes(a);
  const mb = toMinutes(b);
  if (ma === null || mb === null) return false;
  const diff = Math.abs(ma - mb);
  return Math.min(diff, 1440 - diff) <= SLOT_TOLERANCE_MINUTES;
}

/** Hora pico de la plataforma ('15:00' si no hay config). */
export function getPlatformPeakTime(platform: string): string {
  const slots = PLATFORM_TIME_SLOTS[platform.toLowerCase() as Platform];
  return slots?.peak.time ?? '15:00';
}

/** Calidad de un horario para una plataforma ('unknown' si no hay config). */
export function getTimeSlotQuality(platform: string, time: string): TimeSlotQuality {
  const key = platform.toLowerCase() as Platform;
  const slots = PLATFORM_TIME_SLOTS[key];
  if (!slots) return 'unknown';
  if (withinTolerance(time, slots.peak.time)) return 'peak';
  if (slots.moderate.some((s) => withinTolerance(time, s.time))) return 'moderate';
  return 'low';
}
