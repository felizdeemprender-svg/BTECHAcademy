'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Bot, CircleAlert, Lightbulb, Minimize2, Move, ShieldCheck, Sparkles, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { askEvo, type EvoAssistantOutput } from '@/ai/flows/evo-assistant';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const decisionTree = [
  {
    id: 'plan',
    label: 'Planificar mi día',
    description: '¿Qué debería priorizar hoy?',
    prompt: '¿Qué puedo hacer hoy para avanzar en mi día?',
    relatedPrompts: [
      {
        label: '¿Qué debo hacer primero hoy?',
        prompt: '¿Qué debo hacer primero hoy para no perder el ritmo?',
      },
      {
        label: '¿Qué tarea tiene más impacto ahora?',
        prompt: '¿Qué tarea tiene más impacto hoy para avanzar rápido?',
      },
      {
        label: '¿Qué puedo dejar para después?',
        prompt: '¿Qué puedo dejar para después sin que afecte mi avance?',
      },
    ],
  },
  {
    id: 'context',
    label: 'Entender la ruta actual',
    description: '¿Qué está pasando en esta vista?',
    prompt: '¿Qué está pasando en mi ruta actual?',
    relatedPrompts: [
      {
        label: '¿Qué información clave estoy viendo?',
        prompt: '¿Qué información clave debo revisar en esta vista para tomar una decisión?',
      },
      {
        label: '¿Qué me falta comprobar?',
        prompt: '¿Qué me falta comprobar en esta vista antes de seguir adelante?',
      },
      {
        label: '¿Qué debería revisar después?',
        prompt: '¿Qué debería revisar después en esta ruta para evitar volver a empezar?',
      },
    ],
  },
  {
    id: 'decision',
    label: 'Prepararme para decidir',
    description: '¿Qué debo revisar antes de decidir?',
    prompt: '¿Qué elementos necesito revisar antes de tomar una decisión?',
    relatedPrompts: [
      {
        label: '¿Qué evidencia necesito comparar?',
        prompt: '¿Qué evidencia necesito comparar antes de tomar esta decisión?',
      },
      {
        label: '¿Qué riesgo debo revisar primero?',
        prompt: '¿Qué riesgo debo revisar primero antes de decidir?',
      },
      {
        label: '¿Qué decisión me haría avanzar más rápido?',
        prompt: '¿Qué decisión me haría avanzar más rápido en este momento?',
      },
    ],
  },
  {
    id: 'progress',
    label: 'Ver mi progreso',
    description: '¿Cómo estoy avanzando?',
    prompt: '¿Cómo puedo tener una mejor visión de mi progreso?',
    relatedPrompts: [
      {
        label: '¿Qué estoy haciendo bien?',
        prompt: '¿Qué estoy haciendo bien en mi progreso actual y qué debería mantener?',
      },
      {
        label: '¿Dónde estoy atascado?',
        prompt: '¿Dónde estoy atascado en mi progreso y qué puedo ajustar?',
      },
      {
        label: '¿Qué debería medir la próxima vez?',
        prompt: '¿Qué debería medir la próxima vez para ver mejor mi avance?',
      },
    ],
  },
] as const;

const defaultPosition = { x: 24, y: 24 };

export function FloatingEvoAssistant() {
  const { user, profile, isLoading } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(defaultPosition);
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState<EvoAssistantOutput | null>(null);
  const [error, setError] = useState('');
  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dragState = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const isAuthenticated = !isLoading && !!user;

  const contextSummary = useMemo(() => {
    const roles = profile?.roles?.length ? profile.roles.join(', ') : 'alumno';
    const permissions = profile?.mentorPermissions?.length
      ? profile.mentorPermissions.join(', ')
      : 'Sin permisos especiales';

    return {
      role: roles,
      currentPath: pathname || '/dashboard',
      userDisplayName: profile?.displayName || 'Usuario',
      userEmail: profile?.email || 'No disponible',
      permissions,
    };
  }, [pathname, profile]);

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      const state = dragState.current;
      if (!state) {
        return;
      }

      const nextX = Math.min(
        Math.max(16, state.originX + event.clientX - state.startX),
        window.innerWidth - 380,
      );
      const nextY = Math.min(
        Math.max(16, state.originY + event.clientY - state.startY),
        window.innerHeight - 120,
      );

      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      dragState.current = null;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setIsOpen(false);
      setAnswer(null);
      setError('');
      setMessage('');
      setActiveDecisionId(null);
    }
  }, [user]);

  const handleDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
  };

  const openPanel = (prompt?: string, decisionId?: string | null) => {
    if (!isAuthenticated) {
      return;
    }

    setPosition(defaultPosition);
    setIsOpen(true);
    setActiveDecisionId(decisionId ?? null);
    setAnswer(null);
    setError('');
    if (prompt) {
      setMessage(prompt);
    }
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleOpenFloatingEvo = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      openPanel(customEvent.detail?.message);
    };

    window.addEventListener('open-floating-evo', handleOpenFloatingEvo);

    return () => {
      window.removeEventListener('open-floating-evo', handleOpenFloatingEvo);
    };
  }, []);

  const submitQuestion = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmed = message.trim();

    if (!trimmed) {
      setError('Escribe una pregunta para que Evo pueda ayudarte.');
      return;
    }

    setError('');
    setAnswer(null);

    startTransition(async () => {
      try {
        const role = contextSummary.role as 'alumno' | 'mentor' | 'admin' | 'marketing';

        const result = await askEvo({
          message: trimmed,
          role,
          currentPath: contextSummary.currentPath,
          userDisplayName: contextSummary.userDisplayName,
          userEmail: contextSummary.userEmail,
          permissions: contextSummary.permissions
            .split(',')
            .map((permission: string) => permission.trim())
            .filter(Boolean),
        });

        setAnswer(result);
      } catch (err) {
        console.error('[Evo] Error al consultar el asistente:', err);
        setError('No pude responder en este momento. Intenta de nuevo en unos segundos.');
      }
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    submitQuestion(event);
  };

  const applyDecisionPrompt = (option: (typeof decisionTree)[number]) => {
    openPanel(option.prompt, option.id);
  };

  const togglePanel = () => {
    setIsOpen((current) => !current);
  };

  const activeDecision = decisionTree.find((option) => option.id === activeDecisionId) ?? null;

  if (!isAuthenticated || pathname === '/' || pathname?.startsWith('/auth')) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => openPanel()}
        className="fixed bottom-4 right-4 z-[60] h-14 w-14 rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-[0_20px_80px_rgba(59,130,246,0.35)] transition hover:scale-105"
        aria-label="Abrir Evo"
      >
        <Bot className="h-5 w-5" />
      </Button>

      {isOpen ? (
        <div
          className="fixed z-[70] w-[360px] max-w-[calc(100vw-2rem)]"
          style={{ left: `${position.x}px`, top: `${position.y}px` }}
        >
          <Card className="border-primary/15 bg-background/95 shadow-[0_30px_90px_rgba(15,23,42,0.35)] backdrop-blur overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Evo flotante
                  </div>
                  <CardTitle className="mt-3 text-lg">Guía segura paso a paso</CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    Mueve este panel y consulta a Evo sin salir de la página actual.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={togglePanel}
                    className="h-8 w-8"
                    aria-label="Minimizar Evo"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={closePanel}
                    className="h-8 w-8"
                    aria-label="Cerrar Evo"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div
                data-evo-drag-handle="true"
                onMouseDown={handleDragStart}
                className="mt-3 flex cursor-grab items-center gap-2 rounded-xl border border-dashed border-primary/20 bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
              >
                <Move className="h-3.5 w-3.5" />
                Arrastra este encabezado para mover Evo por la pantalla.
              </div>
            </CardHeader>

            <CardContent className="max-h-[calc(100vh-12rem)] space-y-4 overflow-y-auto pt-0 pr-1">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-100">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  Modo solo guía
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  No edito cursos, perfiles ni datos sensibles. Solo te oriento y te sugiero próximos pasos.
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Árbol de decisión</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {decisionTree.map((option) => {
                    const isActive = activeDecisionId === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => applyDecisionPrompt(option)}
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          isActive
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-background hover:border-primary/40'
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground">{option.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-primary/15 bg-primary/5 px-3 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Guía paso a paso
                </div>
                <p className="mt-2 text-sm text-foreground">
                  Elige una rama para ver las preguntas que te ayudan a profundizar sin salir de la vista actual.
                </p>

                {activeDecision ? (
                  <div className="mt-3 rounded-xl border border-border bg-background px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Preguntas relacionadas</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{activeDecision.label}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                        Rama activa
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {activeDecision.relatedPrompts.map((item) => (
                        <button
                          key={item.prompt}
                          type="button"
                          onClick={() => openPanel(item.prompt, activeDecision.id)}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition hover:border-primary/40"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ejemplo: ¿Qué debo revisar hoy para no perder el ritmo?"
                  className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Ruta actual: <span className="font-semibold text-foreground">{contextSummary.currentPath}</span>
                  </p>
                  <Button
                    type="submit"
                    disabled={isPending}
                    size="sm"
                  >
                    {isPending ? 'Consultando...' : 'Preguntar'}
                  </Button>
                </div>
              </form>

              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <div className="flex items-center gap-2 font-semibold">
                    <CircleAlert className="h-4 w-4" />
                    {error}
                  </div>
                </div>
              ) : null}

              {answer ? (
                <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl border bg-muted/30 p-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Respuesta</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">{answer.response}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Próximos pasos</p>
                    <ul className="mt-2 space-y-2">
                      {answer.nextSteps.map((step) => (
                        <li key={step} className="flex gap-2 text-sm text-foreground">
                          <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Límites</p>
                    <ul className="mt-2 space-y-2">
                      {answer.guardrails.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background/70 p-3 text-sm text-muted-foreground">
                  Aquí verás un resumen corto, los próximos pasos y los límites de seguridad de Evo.
                </div>
              )}

              <div className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Consejo
                </div>
                <p className="mt-1">
                  Usa Evo como guía contextual mientras navegas: te ayuda a entender qué hacer después sin salir de la vista actual.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
