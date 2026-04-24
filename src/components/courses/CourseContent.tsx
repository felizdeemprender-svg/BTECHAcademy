
'use client';

import { 
  FileText, 
  Download, 
  Trophy, 
  BrainCircuit, 
  ArrowRight,
  Info,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Module, EvaluationData } from '@/types/student';

interface CourseContentProps {
  activeModule: Module | null;
  evaluationResult: EvaluationData | null;
  onContinue: () => void;
  onStartQuiz: () => void; 
  primaryColor?: string;
  isCompleted?: boolean;
  allowRetries?: boolean;
  isLastModule?: boolean; 
  isSupportNext?: boolean; 
}

export function CourseContent({
  activeModule,
  evaluationResult,
  onContinue,
  onStartQuiz,
  primaryColor = '#3B2D86',
  isCompleted = false,
  allowRetries = true,
  isLastModule = false,
  isSupportNext = false
}: CourseContentProps) {
  const { toast } = useToast();

  const handleDownload = (url: string, filename: string) => {
    if (!url) return;
    try {
      const link = document.body.appendChild(document.createElement('a'));
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Fallo al descargar.' });
    }
  };

  const publicSupportMaterials = activeModule?.supportMaterials?.filter((m: any) => !m.isMaster) || [];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* 1. Description */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: primaryColor }} />
            <h3 className="font-bold text-xl text-primary">Descripción de la Clase</h3>
        </div>
        <p className="text-slate-600 leading-relaxed text-sm md:text-base">
          {activeModule?.description || 'En esta sesión aprenderás los fundamentos estratégicos necesarios para avanzar en el programa BTECH.'}
        </p>
      </div>

      {/* 2. Resources (Always Visible) */}
      {publicSupportMaterials.length > 0 && (
        <div className="space-y-4 p-6 md:p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-lg text-slate-800">Recursos y Materiales</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {publicSupportMaterials.map((m: any, idx: number) => (
              <div 
                key={idx} 
                className="p-4 bg-white rounded-2xl border flex items-center justify-between hover:border-primary/30 transition-colors group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/30 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{m.title || 'Recurso'}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Material de Apoyo</p>
                  </div>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 rounded-lg text-[10px] font-bold text-primary"
                    onClick={() => handleDownload(m.url, m.title)}
                >
                    Descargar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Evaluation Results (Show if exists, regardless of completion) */}
      {evaluationResult && (
        <div className={cn(
          "rounded-[2.5rem] p-6 md:p-8 border shadow-sm space-y-6 animate-in slide-in-from-bottom-4 duration-500",
          isCompleted ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
        )}>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <Badge className={cn(
                "text-white border-none px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest",
                isCompleted ? "bg-emerald-500" : "bg-amber-500"
              )}>
                {isCompleted ? 'Módulo Completado' : 'Revisión Necesaria'}
              </Badge>
              <h3 className={cn(
                "text-2xl font-black",
                isCompleted ? "text-emerald-900" : "text-amber-900"
              )}>
                {isCompleted ? 'Tu Desempeño' : 'Feedback de la IA'}
              </h3>
            </div>
            <div className="text-right">
              <span className={cn(
                "text-4xl font-black leading-none",
                isCompleted ? "text-emerald-600" : "text-amber-600"
              )}>{evaluationResult.score}%</span>
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-widest mt-1",
                isCompleted ? "text-emerald-700" : "text-amber-700"
              )}>Score Final</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border relative overflow-hidden">
             <BrainCircuit className={cn(
               "absolute -right-4 -top-4 h-20 w-20 opacity-5",
               isCompleted ? "text-emerald-500" : "text-amber-500"
             )} />
             <p className={cn(
               "text-sm italic leading-relaxed relative z-10 font-medium",
               isCompleted ? "text-emerald-800" : "text-amber-800"
             )}>
               "{evaluationResult.feedback}"
             </p>
          </div>

          {isLastModule && (isCompleted || evaluationResult?.isSupport) ? (
            <div className={cn(
              "p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] text-center space-y-4 md:space-y-6 animate-in zoom-in duration-500 border-2",
              isCompleted ? "bg-emerald-500/10 border-emerald-500/20" : "bg-slate-50 border-slate-200"
            )}>
              <div className={cn(
                "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto shadow-lg",
                isCompleted ? "bg-emerald-50 shadow-emerald-200" : "bg-slate-500 shadow-slate-200"
              )}>
                <Trophy className="text-white h-8 w-8 md:h-10 md:h-10" />
              </div>
              <div className="space-y-2">
                <h3 className={cn(
                  "text-2xl md:text-3xl font-black",
                  isCompleted ? "text-emerald-900" : "text-slate-900"
                )}>
                  {isCompleted ? '¡Felicitaciones!' : 'Entrenamiento Finalizado'}
                </h3>
                <p className={cn(
                  "text-sm md:text-base font-medium max-w-md mx-auto",
                  isCompleted ? "text-emerald-700" : "text-slate-600"
                )}>
                  {isCompleted 
                    ? 'Has aprobado con éxito todos los módulos de este entrenamiento. ¡Tu dedicación ha dado frutos!'
                    : 'Has completado todos los módulos de tu ruta de aprendizaje. Te recomendamos seguir repasando los materiales para perfeccionar tus conocimientos.'}
                </p>
              </div>
              <Button 
                onClick={() => window.location.href = '/my-courses'}
                className={cn(
                  "h-14 md:h-16 w-full md:w-auto md:px-12 rounded-2xl text-white font-black text-base md:text-lg shadow-xl transition-all hover:scale-105 active:scale-95",
                  isCompleted ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-slate-800 hover:bg-slate-900 shadow-slate-200"
                )}
              >
                Volver al Dashboard
              </Button>
            </div>
          ) : isCompleted ? (
            <Button 
              onClick={onContinue}
              className="w-full h-14 rounded-2xl text-lg font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg text-white"
            >
              Siguiente Módulo <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-amber-700 font-black uppercase tracking-wider">
                  {allowRetries ? 'Debes alcanzar al menos un 70% para continuar' : (isSupportNext ? 'Refuerzo académico requerido' : 'No se permiten reintentos en este módulo')}
                </p>
                {(!allowRetries || isSupportNext) && (
                  <p className="text-xs text-amber-600 font-medium max-w-xs mx-auto leading-relaxed">
                    Te recomendamos volver a ver el video, revisar detenidamente los documentos anexados y contestar las preguntas de refuerzo para consolidar tu aprendizaje.
                  </p>
                )}
              </div>
              
              {(allowRetries || isSupportNext) ? (
                <Button 
                  onClick={onStartQuiz}
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-amber-600 hover:bg-amber-700 shadow-lg text-white"
                >
                  {isSupportNext ? 'Contestar Preguntas de Refuerzo' : 'Reintentar Desafío'} <BrainCircuit className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  onClick={onContinue}
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-slate-800 hover:bg-slate-900 shadow-lg text-white"
                >
                  Continuar al Siguiente Módulo <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Start Quiz (Only if no previous evaluation exists) */}
      {!evaluationResult && !isCompleted && (
        <div className="bg-primary/5 rounded-[2.5rem] p-8 md:p-10 border border-primary/10 text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-black text-primary uppercase tracking-tight">¿Listo para el Desafío?</h3>
            <p className="text-sm text-slate-600">
              Pon a prueba lo aprendido en esta clase para desbloquear el siguiente nivel de tu formación académica.
            </p>
          </div>
          <Button 
            onClick={onStartQuiz}
            className="h-16 px-10 rounded-2xl text-lg font-bold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-white transition-all hover:scale-[1.02]"
          >
            Comenzar Evaluación <BrainCircuit className="ml-2 h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
}
