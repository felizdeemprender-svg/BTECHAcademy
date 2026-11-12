
'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EvaluationData } from '@/types/student';

// Hooks
import { useCourseProgressV3 } from '@/hooks/student/useCourseProgressV3';
import { resolveCoursePrimaryColor, resolveCourseBrand } from '@/lib/landing-styles';

// Components
import { VideoPlayer } from '@/components/courses/VideoPlayer';
import { CourseNavigation } from '@/components/courses/CourseNavigation';
import { QuizWizard } from '@/components/courses/QuizWizard';
import { CourseContent } from '@/components/courses/CourseContent';

export default function CourseViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const searchParams = useSearchParams();
  const isolatedModuleId = searchParams.get('isolated');
  const { profile: authProfile, user } = useAuth();
  const { toast } = useToast();

  // Data & Logic from Hook
  const {
    course,
    mentorProfile,
    modules,
    enrollment,
    isLoading,
    activeModule,
    activeModuleIndex,
    setActiveModuleIndex,
    userAnswers,
    setUserAnswers,
    progressPercent
  } = useCourseProgressV3(courseId);

  // Local UI State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationData | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverSyncState, setServerSyncState] = useState<{
    completedModules: string[];
    progressPercent: number;
  } | null>(null);

  const effectiveCompletedModules = useMemo(() => {
    const base = Array.isArray(enrollment?.progress?.completedModules)
      ? enrollment.progress.completedModules
      : [];
    const extra = serverSyncState?.completedModules ?? [];
    return Array.from(new Set([...base, ...extra]));
  }, [enrollment?.progress?.completedModules, serverSyncState]);

  const isCompleted = !!(activeModule?.id && effectiveCompletedModules.includes(activeModule.id));
  const effectiveProgressPercent = Math.max(
    progressPercent,
    serverSyncState?.progressPercent ?? 0
  );

  // Sync isolated module if present
  useEffect(() => {
    if (isolatedModuleId && modules.length > 0) {
      const idx = modules.findIndex(m => m.id === isolatedModuleId);
      if (idx !== -1 && idx !== activeModuleIndex) {
        setActiveModuleIndex(idx);
      }
    }
  }, [isolatedModuleId, modules, activeModuleIndex, setActiveModuleIndex]);

  // Determine questions to show (Main vs Support/Reinforcement)
  const currentQuestions = useMemo(() => {
    if (!activeModule) return [];
    
    const hasEvaluation = !!evaluationResult;
    const hasSupportEnabled = !!activeModule.enableSupportQuestions;
    const supportQs = activeModule.supportQuestions || [];
    
    // Si ya falló una vez, el refuerzo está activado, y NO es ya una evaluación de refuerzo
    if (hasEvaluation && !isCompleted && hasSupportEnabled && supportQs.length > 0 && !evaluationResult?.isSupport) {
      return supportQs;
    }
    
    return activeModule.questions || [];
  }, [activeModule, evaluationResult, isCompleted]);

  // Sync evaluation result with enrollment data
  useEffect(() => {
    if (enrollment?.progress?.evaluations && activeModule?.id) {
      const prevEval = enrollment.progress.evaluations[activeModule.id];
      if (prevEval) {
        setEvaluationResult({
          score: prevEval.score,
          feedback: prevEval.feedback,
          submittedAt: prevEval.submittedAt || new Date().toISOString(),
          isSupport: prevEval.isSupport,
          strengths: prevEval.strengths || [],
          areasToImprove: prevEval.areasToImprove || []
        });
      } else {
        setEvaluationResult(null);
      }
    }
  }, [activeModule?.id, enrollment?.progress?.evaluations]);

  const handleQuizSubmit = async () => {
    console.log('[Quiz] handleQuizSubmit disparado', {
      courseId,
      moduleId: activeModule?.id,
      hasProfile: !!authProfile,
      hasUser: !!user,
      answers: userAnswers,
    });
    if (!activeModule) {
      setSubmitError('No se pudo identificar el módulo activo.');
      return;
    }
    if (!authProfile || !user) {
      const msg = 'Tu sesión expiró. Recarga la página e inicia sesión nuevamente.';
      setSubmitError(msg);
      toast({ variant: 'destructive', title: 'Sesión expirada', description: msg });
      return;
    }

    const targetQuestions = currentQuestions;
    const allAnswered = targetQuestions.every((_, idx) => {
      const val = userAnswers[idx.toString()];
      return val !== undefined && val !== null && String(val).trim() !== '';
    });

    if (!allAnswered) {
      const msg = 'Debes responder todas las preguntas antes de finalizar.';
      setSubmitError(msg);
      toast({
        variant: 'destructive',
        title: 'Evaluación Incompleta',
        description: msg
      });
      return;
    }

    setSubmitError(null);
    setIsEvaluating(true);
    try {
      const supportQuestions = activeModule?.supportQuestions || [];
      const currentIsSupport = supportQuestions.length > 0 &&
        targetQuestions.length === supportQuestions.length &&
        targetQuestions[0]?.question === supportQuestions[0]?.question;

      const token = await user.getIdToken();
      const res = await fetch(`/api/courses/${courseId}/submit-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          moduleId: activeModule.id,
          answers: userAnswers,
          isSupport: currentIsSupport,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      console.log('[Quiz] submit-quiz response:', res.status, payload);
      if (!res.ok) {
        throw new Error(payload?.error || 'No se pudo completar la evaluación. Intenta de nuevo.');
      }

      const data = payload?.data;
      if (!data?.evaluation) {
        throw new Error('Respuesta inválida del servidor al evaluar el desafío.');
      }

      setEvaluationResult(data.evaluation);
      setServerSyncState({
        completedModules: Array.isArray(data.completedModules) ? data.completedModules : [],
        progressPercent: typeof data.progressPercent === 'number' ? data.progressPercent : 0,
      });

      if (data.isPassing) {
        try {
          localStorage.removeItem(`btech_draft_${authProfile.uid}_${courseId}_${activeModule.id}`);
        } catch {}
        toast({ title: '¡Felicitaciones!', description: 'Has aprobado este módulo y desbloqueado el siguiente.' });
      } else {
        toast({ variant: 'destructive', title: 'Desafío no superado', description: 'Revisa el feedback e inténtalo de nuevo.' });
      }
      setShowQuiz(false);
    } catch (e: any) {
      const msg = e?.message || 'No se pudo completar la evaluación. Intenta de nuevo.';
      console.error('[Quiz] Error al evaluar:', e);
      console.error('[Quiz] Error details:', e?.code, e?.stack);
      setSubmitError(msg);
      toast({ variant: 'destructive', title: 'Error en evaluación', description: msg });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextModule = () => {
    if (activeModuleIndex < modules.length - 1) {
      setActiveModuleIndex(activeModuleIndex + 1);
      setEvaluationResult(null);
      setShowQuiz(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading) return <DashboardLayout><div className="flex h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div></DashboardLayout>;
  if (!course || !enrollment) return <DashboardLayout><div className="p-20 text-center"><p className="text-muted-foreground font-bold">No tienes acceso a este curso.</p></div></DashboardLayout>;

  const courseBrand = resolveCourseBrand(course?.brandingOverride, mentorProfile?.profile);
  const primaryColor = courseBrand.primary;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-20" style={{ fontFamily: courseBrand.bodyFont }}>
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between gap-4">
            <Link href="/my-courses" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mis cursos
            </Link>
            <div className="hidden md:flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estás viendo:</span>
                <span className="text-sm font-bold text-primary">{course.title}</span>
            </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Area */}
          <div className={isolatedModuleId ? "lg:col-span-12 space-y-10 max-w-5xl mx-auto w-full" : "lg:col-span-8 space-y-10"}>
            {/* 1. Video Player */}
            <div className="space-y-4">
                <VideoPlayer 
                    url={activeModule?.videoUrl} 
                    title={activeModule?.title} 
                    primaryColor={primaryColor}
                    courseId={course.id}
                />
                <div className="flex justify-between items-center px-4">
                    <h1 className="text-2xl md:text-3xl font-black leading-tight" style={{ fontFamily: courseBrand.headingFont, color: primaryColor }}>{activeModule?.title}</h1>
                    <Badge className="bg-secondary/20 text-muted-foreground border-none font-bold">Módulo {activeModuleIndex + 1}</Badge>
                </div>
            </div>

            {/* 2. Lessons Content & Resources or Quiz */}
            <div className="bg-white rounded-lg p-6 md:p-10 border border-muted">
               {showQuiz ? (
                 <QuizWizard 
                    questions={currentQuestions}
                    userAnswers={userAnswers}
                    onAnswerChange={(idx, val) => {
                      const next = {...userAnswers, [idx.toString()]: val};
                      setUserAnswers(next);
                    }}
                    onSubmit={handleQuizSubmit}
                    isEvaluating={isEvaluating}
                    submitError={submitError}
                    primaryColor={primaryColor}
                 />
               ) : (
                 <CourseContent 
                    activeModule={activeModule}
                    evaluationResult={evaluationResult}
                    onContinue={handleNextModule}
                    onStartQuiz={() => {
                      setSubmitError(null);
                      setUserAnswers({}); // Limpiar respuestas anteriores para el reintento
                      setShowQuiz(true);
                    }}
                    isCompleted={isCompleted}
                    allowRetries={activeModule?.allowRetries !== false}
                    isLastModule={!!isolatedModuleId || activeModuleIndex === modules.length - 1}
                    isSupportNext={currentQuestions === activeModule?.supportQuestions && (!evaluationResult?.isSupport)}
                    primaryColor={primaryColor}
                 />
               )}
            </div>
          </div>

          {/* Sidebar Navigation */}
          {!isolatedModuleId && (
            <div className="lg:col-span-4 sticky top-24">
              <CourseNavigation 
                  modules={modules}
                  activeModuleIndex={activeModuleIndex}
                  onSelectModule={(idx) => {
                      setActiveModuleIndex(idx);
                      setEvaluationResult(null);
                  }}
                  completedModuleIds={effectiveCompletedModules}
                  courseTitle={course.title}
                  progressPercent={effectiveProgressPercent}
                  primaryColor={primaryColor}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
