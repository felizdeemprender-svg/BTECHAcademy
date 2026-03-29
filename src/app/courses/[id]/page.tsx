
'use client';

import { useState, useEffect, use, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, where, updateDoc, getDoc, setDoc, serverTimestamp, addDoc, or, and, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  BookOpen, 
  CheckCircle2, 
  FileText, 
  Loader2, 
  Download, 
  Trophy,
  AlertCircle,
  Lock,
  Zap,
  Star,
  Instagram,
  Linkedin,
  Globe,
  MessageCircle,
  ShieldCheck,
  ShieldAlert,
  EyeOff,
  Clock,
  Info,
  ArrowRight,
  UserPlus,
  Eye,
  X,
  Play,
  Trash2
} from 'lucide-react';
import { evaluateQuizPerformance, EvaluationOutput } from '@/ai/flows/evaluate-quiz-performance';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth-context';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/**
 * Genera una URL de video segura con parámetros restrictivos para YouTube y Vimeo.
 */
function getSecureVideoUrl(url: string) {
  if (!url) return '';
  let videoId = '';
  
  // YouTube Handler
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1].split('?')[0];
    } else if (url.includes('/shorts/')) {
      videoId = url.split('/shorts/')[1].split('?')[0];
    } else if (url.includes('/live/')) {
      videoId = url.split('/live/')[1].split('?')[0];
    } else {
      // Si no coincide con ningún formato, devolver la URL original
      return url;
    }
    
    return `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&iv_load_policy=3&controls=1&hl=es&disablekb=1&fs=0&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
  }
  
  // Vimeo Handler
  if (url.includes('vimeo.com')) {
    const vimeoId = url.split('/').pop()?.split('?')[0];
    return `https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0`;
  }
  
  return url;
}

export default function CourseViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile: authProfile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const courseRef = useMemoFirebase(() => id ? doc(db, 'courses', id) : null, [db, id]);
  const { data: course, isLoading: courseLoading } = useDoc(courseRef);

  const modulesQuery = useMemoFirebase(() => 
    id ? query(collection(db, 'courses', id, 'modules'), orderBy('order', 'asc')) : null
  , [db, id]);
  const { data: modules, isLoading: modulesLoading } = useCollection(modulesQuery);

  const enrollQuery = useMemoFirebase(() => {
    if (!id || !authProfile?.uid || !authProfile?.email) return null;
    return query(
      collection(db, 'enrollments'), 
      and(
        where('courseId', '==', id),
        or(
          where('studentId', '==', authProfile.uid),
          where('inviteEmail', '==', authProfile.email.toLowerCase().trim())
        )
      )
    );
  }, [db, id, authProfile?.uid, authProfile?.email]);
  
  const { data: enrollments } = useCollection(enrollQuery);
  const enrollment = enrollments?.[0];

  const [mentorProfile, setMentorProfile] = useState<any>(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationOutput | null>(null);
  const [showSupportQuiz, setShowSupportQuiz] = useState(false);
  const [showDetailedReview, setShowDetailedReview] = useState(false);
  const [reviewData, setReviewData] = useState<{questions: any[], answers: any} | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (course?.mentorId) {
      getDoc(doc(db, 'users', course.mentorId)).then(snap => {
        if (snap.exists()) setMentorProfile(snap.data());
      });
    }
  }, [db, course?.mentorId]);

  const activeModule = modules?.[activeModuleIndex];
  const branding = course?.brandingOverride || {};
  const primaryColor = branding.primaryColor || mentorProfile?.profile?.branding?.primaryColor || 'hsl(var(--primary))';
  const logoUrl = branding.logoUrl || mentorProfile?.profile?.branding?.logoUrl || '';
  const socials = branding.socials || mentorProfile?.profile?.socials || {};

  const publicSupportMaterials = activeModule?.supportMaterials?.filter((m: any) => !m.isMaster) || [];
  const completedCount = enrollment?.progress?.completedModules?.length || 0;
  const totalCount = modules?.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  useEffect(() => {
    if (enrollment?.progress?.evaluations && activeModule?.id) {
      const prevEval = enrollment.progress.evaluations[activeModule.id];
      if (prevEval) {
        setEvaluationResult({
          score: prevEval.score,
          feedback: prevEval.feedback,
          strengths: [],
          areasToImprove: []
        });
        setReviewData({
          questions: prevEval.questions || [],
          answers: prevEval.answers || {}
        });
      } else {
        setEvaluationResult(null);
        setReviewData(null);
      }
    } else {
      setEvaluationResult(null);
      setReviewData(null);
    }
    setUserAnswers({});
    setShowSupportQuiz(false);
    setShowDetailedReview(false);
    setIsPlaying(false);
  }, [activeModule?.id, enrollment?.progress?.evaluations]);

  const handleAnswerChange = (qIndex: number, answer: any) => {
    setUserAnswers(prev => ({ ...prev, [qIndex.toString()]: answer }));
  };

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

  const togglePlayback = () => {
    if (!iframeRef.current || !activeModule?.videoUrl) return;
    
    const isYouTube = activeModule.videoUrl.includes('youtube.com') || activeModule.videoUrl.includes('youtu.be');
    const isVimeo = activeModule.videoUrl.includes('vimeo.com');
    
    if (isYouTube) {
      const command = isPlaying ? 'pauseVideo' : 'playVideo';
      iframeRef.current.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: command, args: '' }), '*');
    } else if (isVimeo) {
      const command = isPlaying ? 'pause' : 'play';
      iframeRef.current.contentWindow?.postMessage(JSON.stringify({ method: command }), '*');
    }
    
    setIsPlaying(!isPlaying);
  };

  const handleRequestAccess = async () => {
    if (!authProfile || !course) return;
    setIsRequesting(true);
    
    const enrollId = Math.random().toString(36).substring(2, 15);
    const enrollRef = doc(db, 'enrollments', enrollId);
    
    const enrollData = {
      id: enrollId,
      courseId: course.id,
      studentId: authProfile.uid,
      studentName: authProfile.displayName || authProfile.email.split('@')[0],
      inviteEmail: authProfile.email.toLowerCase().trim(),
      status: 'pending',
      requestedAt: serverTimestamp(),
      progress: { completedModules: [] }
    };

    try {
      await setDoc(enrollRef, enrollData);
      toast({ 
        title: 'Solicitud Enviada', 
        description: 'El mentor revisará tu solicitud para habilitar el acceso al programa.' 
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al procesar solicitud' });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!authProfile || !course) return;
    
    // Verificar que el usuario es mentor o admin
    if (!isOwner && !isAdmin) {
      toast({ variant: 'destructive', title: 'No tienes permisos para eliminar módulos' });
      return;
    }

    try {
      // Eliminar el módulo
      await deleteDoc(doc(db, 'courses', course.id, 'modules', moduleId));
      
      toast({ 
        title: 'Módulo Eliminado', 
        description: 'El módulo ha sido eliminado exitosamente.' 
      });
      
      // Recargar la página para actualizar la lista de módulos
      window.location.reload();
      
    } catch (e) {
      console.error('Error al eliminar módulo:', e);
      toast({ variant: 'destructive', title: 'Error al eliminar módulo' });
    }
  };

  const handleSubmitEvaluation = async (isSupport: boolean = false) => {
    const targetQuestions = isSupport ? (activeModule?.supportQuestions || []) : (activeModule?.questions || []);
    if (!activeModule || targetQuestions.length === 0) return;
    
    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < targetQuestions.length) {
      toast({
        variant: 'destructive',
        title: 'Evaluación Incompleta',
        description: `Debes responder todas las preguntas (${answeredCount}/${targetQuestions.length}) antes de finalizar.`
      });
      return;
    }

    const answersToSubmit = { ...userAnswers };

    setIsEvaluating(true);
    try {
      const result = await evaluateQuizPerformance({
        questions: targetQuestions,
        answers: answersToSubmit,
        studentName: authProfile?.displayName
      });
      setEvaluationResult(result);
      setReviewData({ questions: targetQuestions, answers: answersToSubmit });
      
      if (enrollment) {
        const completedModules = enrollment.progress?.completedModules || [];
        const minPassing = activeModule.minPassingScore ?? 70;
        const isPassing = result.score >= minPassing;
        
        const attemptRef = doc(collection(db, 'quiz_attempts'));
        const attemptData = {
          id: attemptRef.id,
          courseEnrollmentId: enrollment.id,
          courseId: id,
          courseTitle: course?.title,
          moduleId: activeModule.id,
          moduleTitle: activeModule.title,
          studentId: authProfile?.uid,
          score: result.score,
          feedback: result.feedback,
          answers: answersToSubmit,
          questions: targetQuestions,
          isSupport: isSupport,
          completedAt: new Date().toISOString()
        };

        setDoc(attemptRef, attemptData).catch(e => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: attemptRef.path,
            operation: 'create',
            requestResourceData: attemptData
          }));
        });

        const updatePayload: any = {
          [`progress.evaluations.${activeModule.id}`]: {
            score: result.score,
            feedback: result.feedback,
            submittedAt: new Date().toISOString(),
            isSupport: isSupport,
            answers: answersToSubmit,
            questions: targetQuestions
          }
        };
        if (isPassing && !completedModules.includes(activeModule.id)) {
          updatePayload['progress.completedModules'] = [...completedModules, activeModule.id];
        }
        
        updateDoc(doc(db, 'enrollments', enrollment.id), updatePayload);
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error en evaluación' });
    } finally {
      setIsEvaluating(false);
    }
  };

  if (courseLoading || modulesLoading) return <DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div></DashboardLayout>;

  const isApproved = course?.status === 'approved' || course?.status === 'published';
  const isOwner = course?.mentorId === authProfile?.uid;
  const isAdmin = authProfile?.roles.includes('admin');
  
  // Diagnóstico temporal
  console.log('🔍 PERMISOS - Editor Académico:', {
    userEmail: authProfile?.email,
    userUID: authProfile?.uid,
    courseMentorId: course?.mentorId,
    isOwner,
    isAdmin,
    canDelete: isOwner || isAdmin
  });
  
  const hasAccessPermission = enrollment?.status === 'active' || isOwner || isAdmin;
  const isAccessActive = hasAccessPermission && (isApproved || isOwner || isAdmin);
  const currentQuestions = (showSupportQuiz ? activeModule?.supportQuestions : activeModule?.questions) || [];

  return (
    <DashboardLayout>
      <div className="grid lg:grid-cols-4 gap-8" style={{ '--course-primary': primaryColor } as any}>
        <div className="lg:col-span-3 space-y-6">
          <header className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border mb-4">
             <div className="flex items-center gap-3">
                {socials.instagram && <a href={socials.instagram} target="_blank" className="text-muted-foreground hover:text-primary"><Instagram className="h-4 w-4" /></a>}
                {socials.linkedin && <a href={socials.linkedin} target="_blank" className="text-muted-foreground hover:text-primary"><Linkedin className="h-4 w-4" /></a>}
                {socials.whatsapp && <a href={`https://wa.me/${socials.whatsapp}`} target="_blank" className="text-muted-foreground hover:text-primary"><MessageCircle className="h-4 w-4" /></a>}
             </div>
             <div className="flex items-center gap-4">
                <div className="text-right">
                   <h2 className="font-bold text-primary text-xl leading-tight" style={{ color: primaryColor }}>{course?.title}</h2>
                   <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{course?.category}</p>
                   {course?.description && (
                     <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                       {course.description}
                     </p>
                   )}
                </div>
                {logoUrl && <div className="w-12 h-12 relative flex-shrink-0"><Image src={logoUrl} alt="Logo" fill sizes="48px" className="object-contain" unoptimized /></div>}
             </div>
          </header>

          <div 
            className="aspect-video bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative border-4 border-white group/video-container"
            onContextMenu={(e) => e.preventDefault()}
          >
            {!isAccessActive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-950 p-10 text-center z-50">
                {enrollment?.status === 'pending' ? (
                  <>
                    <Clock className="h-16 w-16 mb-6 text-amber-500 animate-pulse" />
                    <h3 className="text-2xl font-bold mb-2">Solicitud en Revisión</h3>
                    <p className="text-slate-400 max-w-sm mb-6">Tu pedido de invitación está siendo evaluado por el mentor.</p>
                    <Link href="/courses">
                      <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-xl font-bold">Volver al Catálogo</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Lock className="h-16 w-16 mb-6 text-rose-500" />
                    <h3 className="text-2xl font-bold mb-2">Acceso Restringido</h3>
                    <p className="text-slate-400 max-w-sm mb-8">No tienes una invitación activa para este programa académico.</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button 
                        onClick={handleRequestAccess} 
                        disabled={isRequesting}
                        className="bg-primary text-white h-14 px-8 rounded-xl font-bold shadow-xl flex items-center gap-2"
                      >
                        {isRequesting ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
                        Solicitar Invitación
                      </Button>
                      <Link href="/courses">
                        <Button variant="ghost" className="text-white hover:bg-white/10 h-14 px-8 rounded-xl font-bold">Explorar Otros</Button>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : activeModule?.contentType === 'video' && activeModule.videoUrl ? (
              <div className="relative w-full h-full overflow-hidden select-none">
                <iframe 
                  ref={iframeRef}
                  className="w-full h-full" 
                  src={getSecureVideoUrl(activeModule.videoUrl)} 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen 
                />
                
                {/* MÁSCARA DE SEGURIDAD TOTAL: Bloquea clic derecho y botones nativos (Share, Copy Link) */}
                <div 
                  className="absolute inset-0 z-30 bg-transparent cursor-pointer"
                  onClick={togglePlayback}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {/* Ocultamiento Superior (Título y Botones de Compartir de YT/Vimeo) */}
                  <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/20 to-transparent pointer-events-auto" />
                  
                  {/* Bloqueo Inferior (Barra de progreso para alumnos) */}
                  {!isOwner && !isAdmin && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-auto cursor-not-allowed" />
                  )}

                  {/* Icono de reproducción central (Visible solo cuando está pausado) */}
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/20 shadow-2xl">
                        <Play className="h-8 w-8 text-white fill-white ml-1" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Marca de Agua Permanente e Institucional */}
                <div className="absolute top-6 left-6 z-40 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 opacity-0 group-hover/video-container:opacity-100 transition-opacity">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  <span className="text-[8px] font-black uppercase text-white tracking-widest">Contenido Protegido • Evolución Académica</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                <FileText className="h-20 w-20 opacity-20 mb-4" />
                <p className="font-bold text-xl">{activeModule?.title}</p>
              </div>
            )}
          </div>

          {isAccessActive && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-primary" style={{ color: primaryColor }}>{activeModule?.title}</h1>
                {activeModule?.description && (
                  <p className="text-muted-foreground text-base leading-relaxed max-w-3xl">
                    {activeModule.description}
                  </p>
                )}
              </div>
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="mb-6 h-12 bg-secondary/30 p-1 rounded-xl">
                  <TabsTrigger value="content" className="rounded-lg px-8 font-bold">Bibliografía</TabsTrigger>
                  <TabsTrigger value="quiz" className="rounded-lg px-8 font-bold">Evaluación</TabsTrigger>
                </TabsList>
                
                <TabsContent value="content">
                  <div className="space-y-4">
                    {publicSupportMaterials.length > 0 ? publicSupportMaterials.map((doc: any) => (
                      <Card key={doc.id} className="bg-white border-none shadow-sm rounded-xl transition-all hover:shadow-md">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted text-muted-foreground"><FileText className="h-5 w-5" /></div>
                            <div><p className="text-sm font-bold">{doc.name}</p><p className="text-[9px] uppercase font-bold text-muted-foreground mt-0.5">Bibliografía Clase</p></div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(doc.content, doc.name)} className="rounded-lg h-9 gap-2 font-bold text-xs"><Download className="h-4 w-4" /> Bajar</Button>
                        </CardContent>
                      </Card>
                    )) : <div className="text-center py-16 border-2 border-dashed rounded-3xl bg-muted/5 opacity-40 italic">Sin bibliografía externa</div>}
                  </div>
                </TabsContent>
                
                <TabsContent value="quiz">
                  {evaluationResult ? (
                    <div className="space-y-6 animate-in zoom-in">
                      <Card className="text-white p-12 text-center rounded-3xl shadow-xl relative overflow-hidden" style={{ backgroundColor: evaluationResult.score >= (activeModule?.minPassingScore ?? 70) ? primaryColor : 'hsl(var(--destructive))' }}>
                        <Zap className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
                        <p className="text-6xl font-bold mb-4">{evaluationResult.score}%</p>
                        <p className="italic text-lg opacity-90 leading-relaxed max-w-xl mx-auto">"{evaluationResult.feedback}"</p>
                      </Card>
                      
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button 
                          variant="outline" 
                          className="flex-1 h-14 rounded-xl font-bold border-2 gap-2"
                          onClick={() => setShowDetailedReview(!showDetailedReview)}
                        >
                          {showDetailedReview ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          {showDetailedReview ? 'Ocultar Corrección' : 'Ver Corrección'}
                        </Button>
                        {evaluationResult.score < (activeModule?.minPassingScore ?? 70) && activeModule?.enableSupportQuestions && !showSupportQuiz && (
                          <Button className="flex-1 h-14 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setEvaluationResult(null); setShowSupportQuiz(true); setUserAnswers({}); setShowDetailedReview(false); }}>Activar Refuerzo</Button>
                        )}
                        {(activeModule?.allowRetries || evaluationResult.score < (activeModule?.minPassingScore ?? 70)) && (
                          <Button variant="outline" className="flex-1 h-14 rounded-xl font-bold border-2" onClick={() => { setEvaluationResult(null); setShowSupportQuiz(false); setUserAnswers({}); setShowDetailedReview(false); }}>Reintentar Evaluación</Button>
                        )}
                      </div>

                      {showDetailedReview && reviewData && (
                        <div className="space-y-6 pt-6 border-t border-dashed animate-in slide-in-from-top-2">
                          <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                            <CheckCircle2 className="h-5 w-5" /> Desglose de Respuestas
                          </h3>
                          {reviewData.questions.map((q: any, idx: number) => {
                            const studentAnswer = reviewData.answers[idx.toString()];
                            let isCorrect = false;
                            if (q.type === 'multiple_choice' || q.type === 'true_false') {
                              isCorrect = String(studentAnswer).toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim();
                            }

                            return (
                              <Card key={idx} className="border-none shadow-sm rounded-2xl overflow-hidden bg-slate-50 border-l-4 border-l-primary/20">
                                <div className="p-6 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-widest">{q.type?.replace('_', ' ')}</Badge>
                                    {q.type !== 'free_response' && (
                                      <Badge className={cn(
                                        "text-[9px] uppercase font-bold",
                                        isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                      )}>
                                        {isCorrect ? 'Correcta' : 'Incorrecta'}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="font-bold text-slate-900 leading-snug">{q.question}</p>
                                  
                                  <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 bg-white rounded-xl border border-primary/5">
                                      <span className="text-[8px] font-bold uppercase text-muted-foreground block mb-1">Tu Respuesta</span>
                                      <p className="text-sm font-medium text-slate-700">
                                        {studentAnswer === undefined || studentAnswer === null || studentAnswer === '' ? (
                                          <span className="text-muted-foreground/40 italic">No respondida</span>
                                        ) : (
                                          typeof studentAnswer === 'boolean' ? (studentAnswer ? 'Verdadero' : 'Falso') : studentAnswer
                                        )}
                                      </p>
                                    </div>
                                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                      <span className="text-[8px] font-bold uppercase text-emerald-600 block mb-1">Respuesta Correcta</span>
                                      <p className="text-sm font-medium text-emerald-800">
                                        {typeof q.correctAnswer === 'boolean' ? (q.correctAnswer ? 'Verdadero' : 'Falso') : q.correctAnswer}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {currentQuestions.length > 0 ? (
                        <>
                          <div className="flex items-center gap-2 mb-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <Info className="h-4 w-4 text-primary" />
                            <p className="text-xs font-bold text-primary">Responde todas las preguntas para que Gemini pueda generar tu devolución.</p>
                          </div>
                          {currentQuestions.map((q: any, i: number) => (
                            <Card key={i} className="p-8 rounded-2xl border-none shadow-sm bg-white">
                              <Badge variant="secondary" className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest mb-6">{q.type?.replace('_', ' ')}</Badge>
                              <p className="font-bold text-lg mb-8 leading-snug">{q.question}</p>
                              {q.type === 'multiple_choice' && (
                                <div className="grid gap-3">
                                  {q.options?.map((opt: string, j: number) => (
                                    <Button key={j} variant={userAnswers[i.toString()] === opt ? 'default' : 'outline'} className={cn("justify-start h-auto py-4 px-6 rounded-xl text-left border-2 whitespace-normal font-medium", userAnswers[i.toString()] === opt ? "shadow-md ring-2 ring-primary/20" : "")} style={userAnswers[i.toString()] === opt ? {backgroundColor: primaryColor, borderColor: primaryColor} : {}} onClick={() => handleAnswerChange(i, opt)}>{opt}</Button>
                                  ))}
                                </div>
                              )}
                              {q.type === 'true_false' && (
                                <div className="flex gap-4">
                                  <Button variant={userAnswers[i.toString()] === true ? 'default' : 'outline'} className="flex-1 h-12 rounded-xl border-2" style={userAnswers[i.toString()] === true ? {backgroundColor: primaryColor, borderColor: primaryColor} : {}} onClick={() => handleAnswerChange(i, true)}>Verdadero</Button>
                                  <Button variant={userAnswers[i.toString()] === false ? 'default' : 'outline'} className="flex-1 h-12 rounded-xl border-2" style={userAnswers[i.toString()] === false ? {backgroundColor: primaryColor, borderColor: primaryColor} : {}} onClick={() => handleAnswerChange(i, false)}>Falso</Button>
                                </div>
                              )}
                              {q.type === 'free_response' && <Textarea value={userAnswers[i.toString()] || ''} onChange={(e) => handleAnswerChange(i, e.target.value)} placeholder="Redacta tu respuesta..." className="min-h-[140px] rounded-xl p-6 bg-secondary/10 border-none" />}
                            </Card>
                          ))}
                          <Button onClick={() => handleSubmitEvaluation(showSupportQuiz)} disabled={isEvaluating} className="w-full h-14 text-lg font-bold rounded-xl shadow-lg mt-4" style={{ backgroundColor: primaryColor }}>{isEvaluating ? <Loader2 className="animate-spin" /> : 'Finalizar Evaluación'}</Button>
                        </>
                      ) : <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/5 font-bold text-muted-foreground opacity-40">Esta clase no requiere evaluación</div>}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="text-white p-8 rounded-3xl shadow-xl relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
            <Trophy className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
            <p className="text-[10px] uppercase font-bold tracking-widest opacity-70 mb-2">Tu Progreso</p>
            <p className="text-4xl font-bold mb-4">{progressPercent}%</p>
            <Progress value={progressPercent} className="bg-white/20 h-1.5" />
          </Card>
          
          <Card className="rounded-2xl overflow-hidden border-none shadow-md bg-white">
            <CardHeader className="p-6 pb-2"><CardTitle className="text-lg font-bold flex items-center gap-2" style={{ color: primaryColor }}><BookOpen className="h-5 w-5" /> Temario</CardTitle></CardHeader>
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-2">
                {modules?.map((mod, idx) => {
                  const isCompleted = enrollment?.progress?.completedModules?.includes(mod.id);
                  const isActive = activeModuleIndex === idx;
                  return (
                    <div key={mod.id} className="group relative">
                      <button onClick={() => isAccessActive && setActiveModuleIndex(idx)} className={cn("w-full text-left p-4 rounded-xl transition-all border-2", !isAccessActive ? 'opacity-40 grayscale cursor-not-allowed' : isActive ? 'text-white border-primary shadow-md' : isCompleted ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-muted/50 border-transparent')} style={isActive ? {backgroundColor: primaryColor, borderColor: primaryColor} : {}}>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[8px] uppercase font-bold tracking-widest opacity-60">Clase {idx + 1}</p>
                          <div className="flex items-center gap-2">
                            {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                            {(isOwner || isAdmin) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`¿Estás seguro de que quieres eliminar el módulo "${mod.title}"?`)) {
                                    handleDeleteModule(mod.id);
                                  }
                                }}
                                className="opacity-70 hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 text-red-500"
                                title="Eliminar módulo"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs font-bold line-clamp-1">{mod.title}</p>
                      </button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
