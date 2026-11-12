
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  Send, 
  CheckCircle2, 
  BrainCircuit, 
  Loader2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizWizardProps {
  questions: any[];
  userAnswers: Record<string, any>;
  onAnswerChange: (idx: number, val: any) => void;
  onSubmit: () => void;
  isEvaluating: boolean;
  submitError?: string | null;
  primaryColor?: string;
}

function isAnswerProvided(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean' || typeof value === 'number') return true;
  return String(value).trim() !== '';
}

function hasMultipleChoiceOptions(q: any): boolean {
  return (
    q?.type === 'multiple_choice' &&
    Array.isArray(q?.options) &&
    q.options.some((opt: unknown) => typeof opt === 'string' && opt.trim() !== '')
  );
}

function isOptionSelected(q: any, currentValue: unknown, opt: string, optIdx: number): boolean {
  if (!isAnswerProvided(currentValue)) return false;
  if (currentValue === opt) return true;
  if (typeof currentValue === 'number' && currentValue === optIdx) return true;
  if (typeof currentValue === 'string' && currentValue === String(optIdx) && q?.options?.[optIdx] === opt) {
    return true;
  }
  return false;
}

function formatAnswerDisplay(q: any, value: unknown): string {
  if (!isAnswerProvided(value)) return 'Sin respuesta';
  if (hasMultipleChoiceOptions(q)) {
    if (typeof value === 'number' && q.options[value]) return q.options[value];
    const numericIdx = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : -1;
    if (numericIdx >= 0 && q.options[numericIdx]) return q.options[numericIdx];
  }
  if (q?.type === 'true_false') {
    if (value === true || value === 'true') return 'Verdadero';
    if (value === false || value === 'false') return 'Falso';
  }
  return String(value);
}

export function QuizWizard({
  questions,
  userAnswers,
  onAnswerChange,
  onSubmit,
  isEvaluating,
  submitError,
  primaryColor = '#3B2D86'
}: QuizWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  // Auto-jump to the first unanswered question on mount
  useEffect(() => {
    const firstUnanswered = questions.findIndex((_, idx) => !isAnswerProvided(userAnswers[idx.toString()]));
    if (firstUnanswered !== -1) {
      setCurrentStep(firstUnanswered);
    }
  }, [questions.length]);

  const progress = ((currentStep) / questions.length) * 100;
  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;

  if (questions.length === 0) return null;

  const isSingleQuestion = questions.length === 1;
  const submitErrorBanner = submitError ? (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm font-medium">
      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
      <span>{submitError}</span>
    </div>
  ) : null;

  if (showSummary) {
    return (
      <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-success/10 rounded-3xl flex items-center justify-center mx-auto text-success">
            <HelpCircle className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-black text-primary">Revisión Final</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">Repasa tus respuestas antes de enviar el desafío para la evaluación por IA.</p>
        </div>

        <div className="space-y-6">
          {questions.map((q, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border shadow-sm space-y-3">
              <div className="flex justify-between items-start gap-4">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pregunta {idx + 1}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setShowSummary(false); setCurrentStep(idx); }} className="h-7 text-xs font-bold text-accent">Editar</Button>
              </div>
              <p className="font-bold text-foreground text-sm">{q.question || q.text}</p>
              <div className="p-4 bg-secondary/10 rounded-xl italic text-sm text-muted-foreground border-l-4 border-success/30">
                {formatAnswerDisplay(q, userAnswers[idx.toString()])}
              </div>
            </div>
          ))}
        </div>

        {submitErrorBanner}

        <div className="flex flex-col gap-4">
          <Button 
            type="button"
            onClick={onSubmit} 
            disabled={isEvaluating}
            aria-busy={isEvaluating}
            className="h-16 rounded-2xl text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 w-full"
          >
            {isEvaluating ? <><Loader2 className="animate-spin mr-2" /> Evaluando con IA...</> : <><Send className="mr-2" /> Confirmar y Enviar</>}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setShowSummary(false)} className="font-bold text-muted-foreground">Volver al editor</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Progress */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Desafío de Módulo</span>
            <h3 className="text-2xl font-black text-primary">Pregunta {currentStep + 1} de {questions.length}</h3>
          </div>
          <span className="text-xs font-bold text-muted-foreground">{Math.round(progress)}% completado</span>
        </div>
        <Progress value={progress} className="h-2 rounded-full bg-secondary/20" style={{'--progress-foreground': primaryColor} as React.CSSProperties} />
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-lg p-6 md:p-10 border border-muted space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">
            <BrainCircuit className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase">IA Ready</span>
          </div>
          <h4 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
            {currentQuestion.question || currentQuestion.text}
          </h4>
        </div>

        <div className="space-y-3">
          <Label htmlFor={`q-${currentStep}`} className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">
            {hasMultipleChoiceOptions(currentQuestion) || currentQuestion.type === 'true_false'
              ? 'Selecciona una opción'
              : 'Tu Análisis'}
          </Label>
          {hasMultipleChoiceOptions(currentQuestion) ? (
            <div className="grid gap-3">
              {currentQuestion.options.map((opt: string, optIdx: number) => {
                if (!opt || !opt.trim()) return null;
                const selected = isOptionSelected(currentQuestion, userAnswers[currentStep.toString()], opt, optIdx);
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => onAnswerChange(currentStep, opt)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4',
                      selected
                        ? 'border-primary bg-primary/5 text-foreground shadow-sm'
                        : 'border-muted bg-secondary/5 hover:border-primary/40 text-foreground'
                    )}
                    style={selected ? { borderColor: primaryColor } : undefined}
                  >
                    <span
                      className={cn(
                        'w-8 h-8 rounded-lg font-bold text-sm flex items-center justify-center shrink-0 transition-colors',
                        selected ? 'text-white' : 'bg-muted text-muted-foreground'
                      )}
                      style={selected ? { backgroundColor: primaryColor } : undefined}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="text-sm md:text-base font-medium">{opt}</span>
                  </button>
                );
              })}
            </div>
          ) : currentQuestion.type === 'true_false' ? (
            <div className="grid grid-cols-2 gap-3">
              {['Verdadero', 'Falso'].map((opt) => {
                const rawVal = userAnswers[currentStep.toString()];
                const selected =
                  rawVal === opt ||
                  (opt === 'Verdadero' && (rawVal === true || rawVal === 'true')) ||
                  (opt === 'Falso' && (rawVal === false || rawVal === 'false'));
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onAnswerChange(currentStep, opt)}
                    className={cn(
                      'p-4 rounded-xl border-2 font-bold text-sm md:text-base transition-all text-center',
                      selected
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-muted bg-secondary/5 hover:border-primary/40 text-foreground'
                    )}
                    style={selected ? { borderColor: primaryColor, color: primaryColor } : undefined}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <Textarea
              id={`q-${currentStep}`}
              name={`question-${currentStep}`}
              value={userAnswers[currentStep.toString()] || ''}
              onChange={(e) => onAnswerChange(currentStep, e.target.value)}
              placeholder="Escribe tu respuesta aquí..."
              className="min-h-[200px] md:min-h-[250px] rounded-[1.5rem] p-6 text-base md:text-lg bg-secondary/5 border-none focus-visible:ring-accent"
            />
          )}
        </div>

        <div className="flex items-center gap-4 p-4 bg-warn/10/50 rounded-2xl border border-warn/15">
          <AlertCircle className="h-5 w-5 text-warn shrink-0" />
          <p className="text-[10px] md:text-xs text-warn font-medium leading-relaxed">
            Tu progreso se guarda automáticamente. Puedes salir y retomar en cualquier momento desde esta misma pregunta.
          </p>
        </div>
      </div>

      {submitErrorBanner}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button 
          type="button"
          variant="outline"
          disabled={currentStep === 0 || isEvaluating}
          onClick={() => setCurrentStep(prev => prev - 1)}
          className="h-14 px-8 rounded-xl font-bold border-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
        </Button>

        {isLastStep && isSingleQuestion ? (
          <Button 
            type="button"
            onClick={onSubmit}
            disabled={isEvaluating || !isAnswerProvided(userAnswers[currentStep.toString()])}
            aria-busy={isEvaluating}
            className="h-14 px-10 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
          >
            {isEvaluating ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Evaluando con IA...</> : <><Send className="mr-2 h-4 w-4" /> Confirmar y Enviar</>}
          </Button>
        ) : isLastStep ? (
          <Button 
            type="button"
            onClick={() => setShowSummary(true)}
            disabled={!isAnswerProvided(userAnswers[currentStep.toString()])}
            className="h-14 px-10 rounded-xl font-bold bg-primary"
            style={{ backgroundColor: primaryColor }}
          >
            Revisar respuestas <CheckCircle2 className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button 
            type="button"
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={!isAnswerProvided(userAnswers[currentStep.toString()])}
            className="h-14 px-10 rounded-xl font-bold bg-primary"
            style={{ backgroundColor: primaryColor }}
          >
            Siguiente <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
