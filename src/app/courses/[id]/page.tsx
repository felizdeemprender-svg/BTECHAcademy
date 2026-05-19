
'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Loader2, ArrowLeft } from 'lucide-react';
import { evaluateQuizPerformance, EvaluationOutput } from '@/ai/flows/evaluate-quiz-performance';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

// Hooks
import { useCourseProgressV3 } from '@/hooks/student/useCourseProgressV3';

// Components
import { VideoPlayer } from '@/components/courses/VideoPlayer';
import { CourseNavigation } from '@/components/courses/CourseNavigation';
import { QuizWizard } from '@/components/courses/QuizWizard';
import { CourseContent } from '@/components/courses/CourseContent';

export default function CourseViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const { profile: authProfile } = useAuth();
  const db = useFirestore();
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

  const isCompleted = enrollment?.progress?.completedModules?.includes(activeModule?.id);

  // Sync evaluation result from enrollment when module changes
  useEffect(() => {
    if (enrollment?.progress?.evaluations?.[activeModule?.id]) {
      setEvaluationResult(enrollment.progress.evaluations[activeModule.id]);
    } else {
      setEvaluationResult(null);
    }
  }, [activeModule?.id, enrollment]);

  // Local UI State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationOutput | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

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
          isSupport: prevEval.isSupport, // ¡AHORA SÍ GUARDAMOS ESTO!
          strengths: prevEval.strengths || [],
          areasToImprove: prevEval.areasToImprove || []
        });
      } else {
        setEvaluationResult(null);
      }
    }
  }, [activeModule?.id, enrollment?.progress?.evaluations]);

  const handleQuizSubmit = async () => {
    if (!activeModule || !authProfile) return;
    
    const targetQuestions = currentQuestions;
    const answeredCount = Object.keys(userAnswers).length;
    
    if (answeredCount < targetQuestions.length) {
      toast({
        variant: 'destructive',
        title: 'Evaluación Incompleta',
        description: `Debes responder todas las preguntas antes de finalizar.`
      });
      return;
    }

    setIsEvaluating(true);
    try {
      const result = await evaluateQuizPerformance({
        questions: targetQuestions,
        answers: userAnswers,
        studentName: authProfile?.displayName
      });
      
      const currentIsSupport = activeModule?.supportQuestions?.length > 0 && 
                             targetQuestions.length === activeModule?.supportQuestions?.length && 
                             targetQuestions[0]?.question === activeModule?.supportQuestions[0]?.question;

      const fullResult = {
        score: result.score,
        feedback: result.feedback,
        submittedAt: new Date().toISOString(),
        isSupport: currentIsSupport,
        answers: userAnswers,
        questions: targetQuestions
      };
      
      setEvaluationResult(fullResult);
      
      if (enrollment) {
        const completedModules = enrollment.progress?.completedModules || [];
        const minPassing = activeModule.minPassingScore ?? 70;
        const isPassing = result.score >= minPassing;
        
        // Log attempt
        const attemptRef = doc(collection(db, 'quiz_attempts'));
        await setDoc(attemptRef, {
          id: attemptRef.id,
          courseEnrollmentId: enrollment.id,
          courseId,
          moduleId: activeModule.id,
          studentId: authProfile.uid,
          score: result.score,
          feedback: result.feedback,
          answers: userAnswers,
          questions: targetQuestions,
          completedAt: new Date().toISOString()
        });

        const nextCompletedModules = isPassing && !completedModules.includes(activeModule.id) 
          ? [...completedModules, activeModule.id] 
          : completedModules;

        // Calcular el progreso global consolidado
        let processedCount = 0;
        const currentIsSupport = activeModule?.supportQuestions?.length > 0 && targetQuestions.length === activeModule?.supportQuestions?.length && targetQuestions[0]?.question === activeModule?.supportQuestions[0]?.question;

        modules.forEach(mod => {
          const isCompletedMod = nextCompletedModules.includes(mod.id);
          const isCurrentMod = mod.id === activeModule.id;
          const modEval = isCurrentMod ? { isSupport: currentIsSupport } : enrollment.progress?.evaluations?.[mod.id];
          const hasEval = !!modEval;
          const allowsRetries = mod.allowRetries !== false;

          if (isCompletedMod) {
            processedCount++;
          } else if (hasEval && !allowsRetries) {
            const needsSupport = mod.enableSupportQuestions && mod.supportQuestions?.length > 0;
            if (!needsSupport || modEval.isSupport) {
              processedCount++;
            }
          }
        });

        const newProgressPercent = Math.round((processedCount / modules.length) * 100);

        // Reconstruir el objeto de progreso para asegurar que se guarde todo
        const currentProgress = enrollment.progress || {};
        const updatedEvaluations = {
          ...(currentProgress.evaluations || {}),
          [activeModule.id]: {
            score: result.score,
            feedback: result.feedback,
            submittedAt: new Date().toISOString(),
            answers: userAnswers,
            questions: targetQuestions,
            isSupport: currentIsSupport
          }
        };

        const updatePayload = {
          progress: {
            ...currentProgress,
            evaluations: updatedEvaluations,
            completedModules: nextCompletedModules
          },
          progressPercent: newProgressPercent
        };

        await updateDoc(doc(db, 'enrollments', enrollment.id), updatePayload);
        
        if (isPassing) {
            toast({ title: '¡Felicitaciones!', description: 'Has aprobado este módulo y desbloqueado el siguiente.' });
        } else {
            toast({ variant: 'destructive', title: 'Desafío no superado', description: 'Revisa el feedback e inténtalo de nuevo.' });
        }
      }
      setShowQuiz(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error en evaluación' });
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

  const primaryColor = course?.brandingOverride?.primaryColor || mentorProfile?.profile?.branding?.primaryColor || '#3B2D86';

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
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
          <div className="lg:col-span-8 space-y-10">
            {/* 1. Video Player */}
            <div className="space-y-4">
                <VideoPlayer 
                    url={activeModule?.videoUrl} 
                    title={activeModule?.title} 
                    primaryColor={primaryColor}
                />
                <div className="flex justify-between items-center px-4">
                    <h1 className="text-2xl md:text-3xl font-black text-primary leading-tight">{activeModule?.title}</h1>
                    <Badge className="bg-secondary/20 text-muted-foreground border-none font-bold">Módulo {activeModuleIndex + 1}</Badge>
                </div>
            </div>

            {/* 2. Lessons Content & Resources or Quiz */}
            <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-slate-100">
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
                    primaryColor={primaryColor}
                 />
               ) : (
                 <CourseContent 
                    activeModule={activeModule}
                    evaluationResult={evaluationResult}
                    onContinue={handleNextModule}
                    onStartQuiz={() => {
                      setUserAnswers({}); // Limpiar respuestas anteriores para el reintento
                      setShowQuiz(true);
                    }}
                    isCompleted={isCompleted}
                    allowRetries={activeModule?.allowRetries !== false}
                    isLastModule={activeModuleIndex === modules.length - 1}
                    isSupportNext={currentQuestions === activeModule?.supportQuestions && (!evaluationResult?.isSupport)}
                    primaryColor={primaryColor}
                 />
               )}
            </div>
          </div>

          {/* Sidebar Navigation */}
          <div className="lg:col-span-4 sticky top-24">
            <CourseNavigation 
                modules={modules}
                activeModuleIndex={activeModuleIndex}
                onSelectModule={(idx) => {
                    setActiveModuleIndex(idx);
                    setEvaluationResult(null);
                }}
                completedModuleIds={enrollment?.progress?.completedModules || []}
                courseTitle={course.title}
                progressPercent={progressPercent}
                primaryColor={primaryColor}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
