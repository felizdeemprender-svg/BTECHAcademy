
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
  primaryColor?: string;
}

export function QuizWizard({
  questions,
  userAnswers,
  onAnswerChange,
  onSubmit,
  isEvaluating,
  primaryColor = '#3B2D86'
}: QuizWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  // Auto-jump to the first unanswered question on mount
  useEffect(() => {
    const firstUnanswered = questions.findIndex((_, idx) => !userAnswers[idx.toString()]);
    if (firstUnanswered !== -1) {
      setCurrentStep(firstUnanswered);
    }
  }, [questions.length]);

  const progress = ((currentStep) / questions.length) * 100;
  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;

  if (questions.length === 0) return null;

  if (showSummary) {
    return (
      <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto text-emerald-600">
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
                <Button variant="ghost" size="sm" onClick={() => { setShowSummary(false); setCurrentStep(idx); }} className="h-7 text-xs font-bold text-accent">Editar</Button>
              </div>
              <p className="font-bold text-slate-800 text-sm">{q.question}</p>
              <div className="p-4 bg-secondary/10 rounded-xl italic text-sm text-slate-600 border-l-4 border-emerald-500/30">
                {userAnswers[idx.toString()] || 'Sin respuesta'}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <Button 
            onClick={onSubmit} 
            disabled={isEvaluating}
            className="h-16 rounded-2xl text-lg font-bold shadow-2xl bg-emerald-600 hover:bg-emerald-700 w-full"
          >
            {isEvaluating ? <><Loader2 className="animate-spin mr-2" /> Evaluando con IA...</> : <><Send className="mr-2" /> Confirmar y Enviar</>}
          </Button>
          <Button variant="ghost" onClick={() => setShowSummary(false)} className="font-bold text-muted-foreground">Volver al editor</Button>
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
        <Progress value={progress} className="h-2 rounded-full bg-secondary/20" style={{'--progress-foreground': primaryColor} as any} />
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-slate-100 space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">
            <BrainCircuit className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase">IA Ready</span>
          </div>
          <h4 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">
            {currentQuestion.question}
          </h4>
        </div>

        <div className="space-y-3">
          <Label htmlFor={`q-${currentStep}`} className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Tu Análisis</Label>
          <Textarea 
            id={`q-${currentStep}`}
            name={`question-${currentStep}`}
            value={userAnswers[currentStep.toString()] || ''}
            onChange={(e) => onAnswerChange(currentStep, e.target.value)}
            placeholder="Escribe tu respuesta aquí..."
            className="min-h-[200px] md:min-h-[250px] rounded-[1.5rem] p-6 text-base md:text-lg bg-secondary/5 border-none shadow-inner focus-visible:ring-accent"
          />
        </div>

        <div className="flex items-center gap-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-[10px] md:text-xs text-amber-800 font-medium leading-relaxed">
            Tu progreso se guarda automáticamente. Puedes salir y retomar en cualquier momento desde esta misma pregunta.
          </p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button 
          variant="outline"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(prev => prev - 1)}
          className="h-14 px-8 rounded-xl font-bold border-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
        </Button>

        {isLastStep ? (
          <Button 
            onClick={() => setShowSummary(true)}
            disabled={!userAnswers[currentStep.toString()]}
            className="h-14 px-10 rounded-xl font-bold bg-primary shadow-xl"
            style={{ backgroundColor: primaryColor }}
          >
            Finalizar <CheckCircle2 className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button 
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={!userAnswers[currentStep.toString()]}
            className="h-14 px-10 rounded-xl font-bold bg-primary shadow-xl"
            style={{ backgroundColor: primaryColor }}
          >
            Siguiente <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
