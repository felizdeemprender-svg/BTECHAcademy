'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  Loader2,
  Copy,
  RefreshCw,
  ExternalLink,
  User2,
  Captions,
  Mic2,
  Scissors,
  Layers,
  MonitorPlay,
  Check,
  Clapperboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EditorSpec {
  id: string;
  name: string;
  vendor: string;
  url: string;
  tagline: string;
  syntax: string;
  structure: string[];
  usage: { label: string; detail: string }[];
}

export const EDITOR_SPECS: Record<string, EditorSpec> = {
  seedance: {
    id: 'seedance',
    name: 'Seedance 2.0',
    vendor: 'ByteDance',
    url: 'https://www.linkmodel.ai/blog/seedance-2-0-prompting-playbook',
    tagline: 'Shot-list numerado con símbolos propietarios',
    syntax: 'Símbolos ByteDance: {} diálogo · 【】subtítulos · （）música',
    structure: [
      'Fórmula por shot: Sujeto + Acción + Escena + Luz/color + Cámara + Estilo + Calidad + Restricciones',
      'Shot list SECUENCIAL: el orden del listado define el orden del video',
      'Sin timestamps forzados: la secuencia se lee del listado'
    ],
    usage: [
      { label: 'Escenas', detail: 'cada escena editada = un Shot numerado del shot list' },
      { label: 'Persona', detail: 'es el sujeto que actúa de forma consistente en todos los shots' },
      { label: 'Subtítulos', detail: 'se envuelven en 【】 para quemarse on-screen' },
      { label: 'Voz', detail: 'el diálogo va entre {} y la música entre （）' }
    ]
  },
  veo: {
    id: 'veo',
    name: 'Veo 3',
    vendor: 'Google DeepMind',
    url: 'https://deepmind.google/models/veo/prompt-guide/',
    tagline: '7 capas con el AUDIO PRIMERO',
    syntax: 'Audio → Sujeto → Acción → Escena → Cámara → Iluminación → Estilo',
    structure: [
      'El diálogo en audio es la palanca más fuerte del modelo',
      'Cada clip = UNA acción dominante (no más de una)',
      'Capa por capa en frases separadas, sin enumerar'
    ],
    usage: [
      { label: 'Escenas', detail: 'cada escena = un clip con las 7 capas en orden' },
      { label: 'Persona', detail: 'se declara en la capa Sujeto y se mantiene idéntica entre clips' },
      { label: 'Subtítulos', detail: 'NO se queman en el video; se sincronizan aparte como SRT' },
      { label: 'Voz', detail: 'el diálogo entre comillas va PRIMERO en el prompt' }
    ]
  },
  runway: {
    id: 'runway',
    name: 'Runway Gen-4',
    vendor: 'Runway ML',
    url: 'https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide',
    tagline: 'Motion first: la imagen fija el look',
    syntax: '"The camera [motion] as the subject [action]" · 100% positivo',
    structure: [
      'La imagen de referencia define look y composición; el prompt SOLO describe movimiento',
      'Frase positiva y directa, sin negaciones ni "avoid"',
      'Una escena por generación'
    ],
    usage: [
      { label: 'Escenas', detail: 'una escena por generación; el motion se enfoca por clip' },
      { label: 'Persona', detail: 'se usa como sujeto del movimiento' },
      { label: 'Imagen', detail: 'la imagen de la escena es OBLIGATORIA: fija el look' },
      { label: 'Subtítulos', detail: 'nunca se piden en el prompt' }
    ]
  },
  pika: {
    id: 'pika',
    name: 'Pika 2.x',
    vendor: 'Pika',
    url: 'https://pikaais.com/video-prompt/',
    tagline: 'Vocabulario de cámara propio + avoid list',
    syntax: 'Subject → Scene → Action → Camera → Lighting → Style · Avoid list',
    structure: [
      'Cada campo con su etiqueta explícita (Subject:, Scene:, Action:...)',
      'La cámara es el foco del editor',
      'La avoid list va SEPARADA al final'
    ],
    usage: [
      { label: 'Escenas', detail: 'cada escena describe sujeto, escena, acción y cámara' },
      { label: 'Persona', detail: 'sujeto consistente en la primera línea del prompt' },
      { label: 'Subtítulos', detail: 'solo para guion; el texto quemado entra en la avoid list' },
      { label: 'Voz', detail: 'se refleja en la acción; la cámara es el foco del editor' }
    ]
  },
  wan: {
    id: 'wan',
    name: 'Wan 2.x',
    vendor: 'Alibaba Cloud',
    url: 'https://help.aliyun.com/en/model-studio/text-to-video-prompt',
    tagline: 'Entity + Scene + Motion + Aesthetic + Stylization',
    syntax: 'Shot N: Entity · Scene · Motion · Camera · Aesthetic · Stylization',
    structure: [
      'Cada escena = un Shot numerado con los 5 bloques',
      'Requiere Overall description al final para multi-shot',
      'La Entity se mantiene consistente entre shots'
    ],
    usage: [
      { label: 'Escenas', detail: 'cada escena = un Shot numerado con los 5 bloques' },
      { label: 'Persona', detail: 'es la Entity que se mantiene consistente entre shots' },
      { label: 'Subtítulos', detail: 'no se queman; el overall description marca el ritmo' },
      { label: 'Voz', detail: 'el motion se acelera o pausa según la voz del segmento' }
    ]
  }
};

export const EDITOR_NAMES: Record<string, string> = {
  seedance: 'Seedance',
  veo: 'Veo',
  runway: 'Runway',
  pika: 'Pika',
  wan: 'Wan'
};

interface VideoPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engine: string;
  prompt: string;
  perScene: string[];
  notes?: Record<string, any>;
  sceneCount: number;
  format: string;
  isRendering?: boolean;
  onRegenerate?: () => void;
}

function copyText(text: string, label: string, setter: (v: string | null) => void) {
  navigator.clipboard.writeText(text);
  setter(label);
  setTimeout(() => setter(null), 1800);
}

/**
 * Modal por editor externo de video.
 * Muestra qué valores cargó el regenerador, cómo los necesita ese editor (skin),
 * el prompt completo y la vista per-escena, con un botón para regenerar contenido.
 */
export function VideoPromptModal({
  open,
  onOpenChange,
  engine,
  prompt,
  perScene,
  notes = {},
  sceneCount,
  format,
  isRendering = false,
  onRegenerate
}: VideoPromptModalProps) {
  const spec = EDITOR_SPECS[engine] || EDITOR_SPECS.seedance;
  const [copied, setCopied] = useState<string | null>(null);
  const [copiedScene, setCopiedScene] = useState<number | null>(null);

  const personaOn = !!notes.persona_enabled;
  const subsOn = notes.subtitles_enabled !== false;

  const loadedValues = [
    { label: 'ADN / Mood', ok: true, detail: notes.adnId || '01_CINEMA' },
    { label: 'Escenas', ok: sceneCount > 0, detail: `${sceneCount} escenas editadas` },
    { label: 'Persona en cámara', ok: personaOn, detail: personaOn ? (notes.persona_description || 'descrita por defecto') : 'solo escenas' },
    { label: 'Subtítulos', ok: subsOn, detail: subsOn ? 'incluidos en el prompt' : 'sin subtítulos' },
    { label: 'Voz del guion', ok: true, detail: notes.voice_id || 'mateo' },
    { label: 'Formato', ok: true, detail: format }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[92vh] flex flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="p-5 pb-3 border-b border-border text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <Clapperboard className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-black text-foreground uppercase tracking-widest">
                Prompt para {spec.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {spec.vendor} · {spec.tagline}
              </DialogDescription>
            </div>
            <a
              href={spec.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-primary tracking-widest hover:underline shrink-0 mt-1"
            >
              <ExternalLink className="h-3 w-3" /> Guía oficial
            </a>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Qué valores cargó el regenerador */}
          <section className="space-y-2">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Valores cargados por el regenerador</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {loadedValues.map((v) => (
                <div
                  key={v.label}
                  className={cn(
                    'rounded-xl border p-2.5 flex items-start gap-2',
                    v.ok ? 'border-border bg-muted/20' : 'border-danger/30 bg-danger/5'
                  )}
                >
                  <Check className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', v.ok ? 'text-success' : 'text-danger')} />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase text-foreground tracking-widest">{v.label}</p>
                    <p className="text-[9px] font-medium text-muted-foreground truncate">{v.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Cómo lo usa este editor */}
          <section className="space-y-2">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Estructura nativa de {spec.name}</p>
            <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-primary shrink-0" />
                <p className="text-[9px] font-black uppercase text-primary tracking-widest">{spec.syntax}</p>
              </div>
              <ul className="space-y-1.5">
                {spec.structure.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[8px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-[10px] font-medium text-muted-foreground leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-dashed border-primary/20 pt-3">
                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-2">Qué hace con cada valor</p>
                <ul className="space-y-2">
                  {spec.usage.map((u) => (
                    <li key={u.label} className="flex items-start gap-2">
                      <Badge className="h-5 shrink-0 mt-0.5 bg-primary text-white text-[8px] font-black uppercase tracking-widest border-none">
                        {u.label}
                      </Badge>
                      <span className="text-[10px] font-medium text-muted-foreground leading-relaxed">{u.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Prompt completo */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                Prompt completo · {prompt.split('\n').filter(l => l.trim()).length} líneas
              </p>
              <Button
                variant="outline"
                className="h-8 rounded-lg bg-primary/10 border-primary/20 text-primary text-[9px] font-black uppercase gap-1 hover:bg-primary hover:text-white"
                onClick={() => copyText(prompt, 'all', setCopied)}
              >
                {copied === 'all' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === 'all' ? 'Copiado' : 'Copiar todo'}
              </Button>
            </div>
            <Textarea readOnly value={prompt} className="min-h-[200px] border border-border bg-muted/20 p-4 text-xs font-medium text-foreground" />
          </section>

          {/* Per-scene */}
          {perScene.length > 1 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                  Por escena ({perScene.length}) · para editores que generan de a un clip
                </p>
              </div>
              <div className="space-y-2">
                {perScene.map((sp, i) => (
                  <div key={i} className="group rounded-xl border border-border bg-white p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Escena {i + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white"
                        onClick={() => copyText(sp, 'scene', () => setCopiedScene(i))}
                      >
                        {copiedScene === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <pre className="text-[9px] leading-relaxed text-muted-foreground whitespace-pre-wrap font-medium">{sp}</pre>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
            <MonitorPlay className="h-3.5 w-3.5 text-primary/40" />
            Copialo en {spec.name} (o el editor que uses)
          </div>
          <div className="flex items-center gap-2">
            {onRegenerate && (
              <Button
                variant="outline"
                className="h-10 rounded-xl bg-primary/10 border-primary/20 text-primary text-[10px] font-black uppercase gap-2 hover:bg-primary hover:text-white"
                onClick={onRegenerate}
                disabled={isRendering}
              >
                {isRendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Regenerar Contenido
              </Button>
            )}
            <DialogClose asChild>
              <Button className="h-10 rounded-xl bg-primary hover:bg-primary text-white text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/20">
                <Sparkles className="h-4 w-4" /> Listo
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
