'use client';

import { useMemo, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles, ShieldCheck, CircleAlert, Lightbulb } from 'lucide-react';
import { useAuth } from '@/components/auth-context';
import { askEvo, type EvoAssistantOutput } from '@/ai/flows/evo-assistant';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const starterPrompts = [
  '¿Qué puedo hacer hoy con mis cursos y desafíos?',
  '¿Qué permisos tengo y cómo me ayudan en esta plataforma?',
  '¿Cómo está mi progreso actual en mis objetos?',
  '¿Qué debería revisar antes de tomar una decisión importante?',
];

export function EvoAssistant({ userObjects }: { userObjects?: string }) {
  const { profile } = useAuth();
  const pathname = usePathname();
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState<EvoAssistantOutput | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();

    if (!trimmed) {
      setError('Escribe una pregunta para que Evo pueda ayudarte.');
      return;
    }

    window.dispatchEvent(
      new CustomEvent('open-floating-evo', {
        detail: { message: trimmed },
      }),
    );

    setError('');
    setAnswer(null);

    startTransition(async () => {
      try {
        const result = await askEvo({
          message: trimmed,
          role: contextSummary.role as 'alumno' | 'mentor' | 'admin' | 'marketing',
          currentPath: contextSummary.currentPath,
          userDisplayName: contextSummary.userDisplayName,
          userEmail: contextSummary.userEmail,
          permissions: contextSummary.permissions
            .split(',')
            .map((permission: string) => permission.trim())
            .filter(Boolean),
          userObjects,
        });

        setAnswer(result);
      } catch (err) {
        console.error('[Evo] Error al consultar el asistente:', err);
        setError('No pude responder en este momento. Reintenta en unos segundos.');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Evo • Asistente independiente
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Guía segura dentro de la plataforma</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Evo te ayuda a entender tu rol, tus próximos pasos y cómo moverte en la plataforma sin tocar datos ni hacer cambios.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Modo solo guía
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            No editaré cursos, perfiles ni datos de la plataforma.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card className="border-primary/10 bg-card/80">
          <CardHeader>
            <CardTitle>Haz tu pregunta a Evo</CardTitle>
            <CardDescription>
              Escribe algo breve y Evo te dará un plan claro, consejos y próximos pasos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ejemplo: ¿Qué puedo revisar hoy para prepararme mejor?"
                className="min-h-32 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm outline-none transition focus:border-primary"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Contexto activo: <span className="font-semibold text-foreground">{contextSummary.role}</span>
                </p>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Consultando...' : 'Preguntar a Evo'}
                </Button>
              </div>
            </form>

            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <div className="flex items-center gap-2 font-semibold">
                  <CircleAlert className="h-4 w-4" />
                  {error}
                </div>
              </div>
            ) : null}

            {answer ? (
              <div className="space-y-4 rounded-2xl border bg-background/80 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Respuesta</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">{answer.response}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Próximos pasos</p>
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
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Límites</p>
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
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Tu respuesta aparecerá aquí con una guía clara y acciones seguras para continuar.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-card/80">
          <CardHeader>
            <CardTitle>Qué puede hacer Evo</CardTitle>
            <CardDescription>
              Este MVP está pensado para orientar, explicar y priorizar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="rounded-xl border bg-muted/40 p-3">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Orientación contextual
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Resume tu rol, la ruta actual y te sugiere el próximo paso más útil.
                </p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-3">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Guía sin modificaciones
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  No altera cursos, perfiles ni datos. Solo explica y propone acciones seguras.
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Preguntas de ejemplo</p>
              <div className="mt-3 space-y-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setMessage(prompt)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition hover:border-primary/40"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
