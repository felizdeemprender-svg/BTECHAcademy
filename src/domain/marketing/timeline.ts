/**
 * Marketing — Timeline de campaña.
 * Eventos que coordinan las 3 variantes (0=mínima, 1=equilibrada, 2=detallada)
 * en los canales Email / Social / Ads, con horarios por red social.
 */
import { z } from 'zod';

export const ChannelSchema = z.enum(['Email', 'Social', 'Ads']);
export type Channel = z.infer<typeof ChannelSchema>;

export const VariantIndexSchema = z.number().int().min(0).max(2);
export type VariantIndex = z.infer<typeof VariantIndexSchema>;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const SocialPlatformScheduleSchema = z.object({
  videoName: z.string().min(1, 'video vacío'),
  time: z.string().regex(TIME_PATTERN, 'hora HH:MM inválida'),
});
export type SocialPlatformSchedule = z.infer<typeof SocialPlatformScheduleSchema>;

export const TimelineEventSchema = z.object({
  day: z.number().int().min(1, 'día mínimo 1'),
  phase: z.string().min(1, 'fase vacía'),
  variantIndex: VariantIndexSchema,
  action: z.string().min(1, 'acción vacía'),
  channels: z.array(ChannelSchema).min(1, 'sin canales'),
  socialSchedule: z.record(z.string(), SocialPlatformScheduleSchema).optional(),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export function parseTimelineEvent(data: unknown): TimelineEvent {
  return TimelineEventSchema.parse(data);
}

export function usesChannel(event: Pick<TimelineEvent, 'channels'>, channel: Channel): boolean {
  return event.channels.includes(channel);
}
