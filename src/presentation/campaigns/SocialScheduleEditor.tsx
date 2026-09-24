/**
 * Presentación — Editor de programación por red social.
 * Video + horario por plataforma con calidad de franja
 * (pico/moderado/bajo según PLATFORM_TIME_SLOTS). Controlado:
 * no lee ni escribe datos, solo emite `onChange`.
 */
'use client';

import { Instagram } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  getPlatformPeakTime,
  getTimeSlotQuality,
  type SocialPlatformSchedule,
  type TimeSlotQuality,
} from '@/domain/marketing';

const QUALITY_LABEL: Record<TimeSlotQuality, string> = {
  peak: 'Pico óptimo',
  moderate: 'Tránsito moderado',
  low: 'Horario no recomendado',
  unknown: 'Sin referencia',
};

export interface SocialScheduleEditorProps {
  readonly value: Record<string, SocialPlatformSchedule>;
  readonly platforms: string[];
  readonly videosByPlatform: Record<string, string[]>;
  readonly onChange: (next: Record<string, SocialPlatformSchedule>) => void;
}

export function SocialScheduleEditor({
  value,
  platforms,
  videosByPlatform,
  onChange,
}: SocialScheduleEditorProps) {
  const update = (platform: string, patch: Partial<SocialPlatformSchedule>) => {
    onChange({ ...value, [platform]: { ...current(platform), ...patch } });
  };

  const current = (platform: string): SocialPlatformSchedule => {
    const videos = videosByPlatform[platform] ?? [];
    return (
      value[platform] ?? {
        videoName: videos[0] ?? `Video ${platform.toUpperCase()}`,
        time: getPlatformPeakTime(platform),
      }
    );
  };

  if (platforms.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl bg-muted/80 border border-border/60 space-y-4">
      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
        <Instagram className="h-3.5 w-3.5 text-primary" /> Distribución y Horarios de Video
      </p>

      <div className="grid gap-3">
        {platforms.map((platform) => {
          const videos = videosByPlatform[platform] ?? [];
          const sched = current(platform);
          const quality = getTimeSlotQuality(platform, sched.time);

          return (
            <div
              key={platform}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-muted shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-bold text-xs uppercase">
                  {platform.substring(0, 2)}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                    {platform}
                  </p>
                  {videos.length > 0 ? (
                    <Select
                      value={sched.videoName}
                      onValueChange={(videoName) => update(platform, { videoName })}
                    >
                      <SelectTrigger className="h-7 px-2 bg-muted border-none font-bold text-[10px] rounded-lg mt-0.5 max-w-[200px]">
                        <SelectValue placeholder="Seleccionar Video..." />
                      </SelectTrigger>
                      <SelectContent>
                        {videos.map((name) => (
                          <SelectItem key={name} value={name} className="font-bold text-xs">
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-[10px] italic text-muted-foreground mt-0.5">
                      Sin videos en esta red
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-2">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground">
                    Publicar:
                  </Label>
                  <input
                    type="time"
                    aria-label={`Hora de publicación en ${platform}`}
                    value={sched.time}
                    onChange={(e) => update(platform, { time: e.target.value })}
                    className="h-8 px-2.5 rounded-lg bg-muted border border-muted text-xs font-black text-foreground outline-none w-24 text-center"
                  />
                </div>
                <span
                  className={cn(
                    'text-[8px] text-right font-black tracking-tight max-w-[210px] leading-tight block',
                    quality === 'peak' && 'text-success/90',
                    quality === 'moderate' && 'text-sky-600/90',
                    quality === 'low' && 'text-danger animate-pulse',
                    quality === 'unknown' && 'text-muted-foreground',
                  )}
                >
                  {QUALITY_LABEL[quality]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
