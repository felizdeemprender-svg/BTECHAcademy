/**
 * Presentación — Editor de timeline de campaña (única fuente).
 * Reemplazo futuro de la lógica triplicada en marketing/page.tsx,
 * marketing/build/page.tsx y execution/page.tsx. Controlado:
 * no lee ni escribe datos, solo emite `onChange`.
 */
'use client';

import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Channel, TimelineEvent } from '@/domain/marketing';

import {
  addEvent,
  removeEventAt,
  toggleEventChannel,
  updateEventAt,
} from './timeline-helpers';

const DEFAULT_CHANNELS: readonly Channel[] = ['Email', 'Social', 'Ads'];
const DEFAULT_VARIANT_LABELS: readonly [string, string, string] = [
  'Var 1 (Mínima)',
  'Var 2 (Equilibrada)',
  'Var 3 (Detallada)',
];

export interface TimelineEditorProps {
  readonly events: TimelineEvent[];
  readonly onChange: (events: TimelineEvent[]) => void;
  readonly channels?: readonly Channel[];
  readonly variantLabels?: readonly [string, string, string];
  readonly allowAdd?: boolean;
  /** Solo lectura: muestra valores como texto (visor del plan activo). */
  readonly readOnly?: boolean;
  /** Contenido extra bajo cada hito (ej. programación social del evento). */
  readonly renderEventExtra?: (event: TimelineEvent, index: number) => ReactNode;
}

export function TimelineEditor({
  events,
  onChange,
  channels = DEFAULT_CHANNELS,
  variantLabels = DEFAULT_VARIANT_LABELS,
  allowAdd = true,
  readOnly = false,
  renderEventExtra,
}: TimelineEditorProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-2">
        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          {readOnly ? 'Línea de Tiempo' : 'Línea de Tiempo Editable'}
        </h4>
        {!readOnly && allowAdd && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(addEvent(events))}
            className="rounded-xl font-bold gap-2 h-9"
          >
            <Plus className="h-4 w-4" /> Añadir Hito
          </Button>
        )}
      </div>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-1/2 before:bg-border">
        {events.map((event, i) => (
          <div key={`${event.day}-${i}`} className="relative flex gap-4 items-stretch">
            <div className="w-12 flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg z-10',
                  readOnly ? 'bg-primary text-white' : 'bg-accent text-white',
                )}
              >
                {readOnly ? (
                  event.day
                ) : (
                  <input
                    type="number"
                    aria-label={`Día del hito ${i + 1}`}
                    value={event.day}
                    onChange={(e) =>
                      onChange(updateEventAt(events, i, 'day', parseInt(e.target.value, 10)))
                    }
                    className="w-full text-center bg-transparent border-none outline-none text-white"
                  />
                )}
              </div>
              <div className="flex-1 w-0.5 bg-border" />
            </div>

            <Card className="flex-1 p-6 rounded-lg border-2 border-muted shadow-sm bg-white relative overflow-hidden">
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar hito ${i + 1}`}
                  onClick={() => onChange(removeEventAt(events, i))}
                  className="absolute top-4 right-4 h-8 w-8 text-danger hover:bg-danger/10 rounded-full"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}

              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-primary/5 text-primary border-none text-[8px] font-black uppercase"
                    >
                      {readOnly ? event.phase : 'Fase'}
                    </Badge>
                    {!readOnly && (
                      <input
                        aria-label={`Fase del hito ${i + 1}`}
                        value={event.phase}
                        onChange={(e) => onChange(updateEventAt(events, i, 'phase', e.target.value))}
                        className="text-[10px] font-bold text-muted-foreground border-none bg-transparent outline-none w-full"
                      />
                    )}
                  </div>
                  {readOnly ? (
                    <p className="font-bold text-foreground">{event.action}</p>
                  ) : (
                    <Textarea
                      aria-label={`Acción del hito ${i + 1}`}
                      value={event.action}
                      onChange={(e) => onChange(updateEventAt(events, i, 'action', e.target.value))}
                      className="font-bold text-foreground border-none bg-muted rounded-xl p-3 min-h-[60px]"
                    />
                  )}
                  {renderEventExtra?.(event, i)}
                </div>

                <div className="space-y-4 flex flex-col justify-end">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-muted-foreground ml-1">
                      Variante
                    </p>
                    {readOnly ? (
                      <Badge className="bg-foreground text-white border-none h-5 px-2 text-[8px] font-bold">
                        Variante {event.variantIndex + 1}
                      </Badge>
                    ) : (
                      <Select
                        value={String(event.variantIndex)}
                        onValueChange={(v) =>
                          onChange(updateEventAt(events, i, 'variantIndex', parseInt(v, 10)))
                        }
                      >
                        <SelectTrigger className="h-8 rounded-lg bg-success/10 border-none font-bold text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {variantLabels.map((label, v) => (
                            <SelectItem key={v} value={String(v)} className="font-bold">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {channels
                      .filter((ch) => !readOnly || event.channels.includes(ch))
                      .map((ch) =>
                        readOnly ? (
                          <div
                            key={ch}
                            className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase"
                          >
                            {ch}
                          </div>
                        ) : (
                          <Badge
                            key={ch}
                            variant={event.channels.includes(ch) ? 'default' : 'outline'}
                            className="cursor-pointer text-[8px] uppercase font-black px-2.5 py-1 rounded-lg"
                            onClick={() => onChange(toggleEventChannel(events, i, ch))}
                          >
                            {ch}
                          </Badge>
                        ),
                      )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <p className={cn('text-sm text-muted-foreground italic px-2')}>
          Sin hitos. Añade el primero para empezar el cronograma.
        </p>
      )}
    </div>
  );
}
