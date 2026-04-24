'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { 
  collection, query, where, doc, getDocs, getDoc, setDoc, 
  serverTimestamp, orderBy, updateDoc, limit 
} from 'firebase/firestore';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  BookOpen, Clock, History, BrainCircuit, MessageSquare, 
  Plus, Save, Loader2, CheckCircle2, 
  FileText, Send, Zap, Calendar, Mail, 
  MessageCircle, HelpCircle, FileSearch, X, Eye,
  User, Globe, Linkedin, Instagram, Twitter, Youtube, Phone, CreditCard, Layers, Sparkles,
  ClipboardList, ChevronRight, Filter, Settings2, ShieldCheck, Target, Info,
  Lightbulb,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { generateStudentProfile } from '@/ai/flows/generate-student-profile';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export default function StudentRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = use(params);
  const { profile: mentorProfile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  
  // Advanced Profiling State
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isProfileDetailDialogOpen, setIsProfileDetailDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profilingFocus, setProfilingFocus] = useState('Identificación de Cliente Ideal y Posicionamiento');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedFollowUpIds, setSelectedFollowUpIds] = useState<string[]>([]);
  const [includeNotes, setIncludeNotes] = useState(true);

  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [isAttemptDialogOpen, setIsAttemptDialogOpen] = useState(false);
  const [attemptQuestions, setAttemptQuestions] = useState<any[]>([]);
  const [loadingAttemptDetails, setLoadingAttemptDetails] = useState(false);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskTitleDesc] = useState('');
  const [taskEvaluationCriteria, setTaskEvaluationCriteria] = useState('');
  const [allowTaskFileUpload, setAllowTaskFileUpload] = useState(false);
  const [isSendingTask, setIsSendingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDetailDialogOpen, setIsTaskDetailDialogOpen] = useState(false);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const [isNewNoteDialogOpen, setIsNewNoteDialogOpen] = useState(false);
  const [isNoteDetailDialogOpen, setIsNoteDetailDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);


  const studentRef = useMemoFirebase(() => doc(db, 'users', studentId), [db, studentId]);
  const { data: studentData, isLoading: studentLoading } = useDoc(studentRef);

  const notesQuery = useMemoFirebase(() => {
    if (!mentorProfile?.uid) return null;
    return query(
      collection(db, 'users', mentorProfile.uid, 'studentNotes'), 
      where('studentId', '==', studentId)
    );
  }, [db, mentorProfile?.uid, studentId]);
  const { data: rawNotes } = useCollection(notesQuery);
  const notes = useMemo(() => rawNotes ? [...rawNotes]
    .filter(n => n.type !== 'ai_profile')
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    }) : null, [rawNotes]);

  const tasksQuery = useMemoFirebase(() => {
    if (!mentorProfile?.uid) return null;
    return query(
      collection(db, 'users', studentId, 'individualTasks')
    );
  }, [db, mentorProfile?.uid, studentId]);
  const { data: rawTasks } = useCollection(tasksQuery);
  const tasks = useMemo(() => rawTasks ? [...rawTasks]
    .filter(t => t.mentorId === mentorProfile?.uid)
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    }) : null, [rawTasks, mentorProfile?.uid]);

  const followUpsQuery = useMemoFirebase(() => {
    if (!mentorProfile?.uid) return null;
    return query(
      collection(db, 'followups'),
      where('studentId', '==', studentId),
      where('mentorId', '==', mentorProfile.uid)
    );
  }, [db, mentorProfile?.uid, studentId]);
  const { data: rawFollowUps } = useCollection(followUpsQuery);
  const followUps = useMemo(() => rawFollowUps ? [...rawFollowUps].sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0);
    const dateB = b.createdAt?.toDate?.() || new Date(0);
    return dateB.getTime() - dateA.getTime();
  }) : null, [rawFollowUps]);

  const profilesQuery = useMemoFirebase(() => {
    if (!mentorProfile?.uid) return null;
    return query(
      collection(db, 'users', mentorProfile.uid, 'studentNotes'),
      where('studentId', '==', studentId)
    );
  }, [db, mentorProfile?.uid, studentId]);
  const { data: rawProfiles } = useCollection(profilesQuery);
  const profiles = useMemo(() => rawProfiles ? [...rawProfiles]
    .filter(p => p.type === 'ai_profile')
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    }) : null, [rawProfiles]);

  const fetchAcademicData = useCallback(async () => {
    if (!mentorProfile || !studentId) return;
    setLoading(true);
    try {
      const coursesSnap = await getDocs(query(collection(db, 'courses'), where('mentorId', '==', mentorProfile.uid)));
      const mentorCourseIds = coursesSnap.docs.map(d => d.id);
      
      if (mentorCourseIds.length === 0) {
        setLoading(false);
        return;
      }

      const enrollSnap = await getDocs(query(
        collection(db, 'enrollments'), 
        where('studentId', '==', studentId),
        where('courseId', 'in', mentorCourseIds)
      ));
      
      const enrolls = await Promise.all(enrollSnap.docs.map(async (edoc) => {
        const data = edoc.data();
        const courseRef = doc(db, 'courses', data.courseId);
        const cSnap = await getDoc(courseRef);
        const courseData = cSnap.data();

        const modsSnap = await getDocs(collection(db, 'courses', data.courseId, 'modules'));
        const modules = modsSnap.docs.map(m => ({ id: m.id, title: m.data().title, order: m.data().order }));
        modules.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        return { ...data, id: edoc.id, course: { ...courseData, modulesCount: modsSnap.size }, modules } as any;
      }));
      
      setEnrollments(enrolls);

      // Pre-seleccionar todos los cursos por defecto para el perfilamiento
      setSelectedCourseIds(enrolls.map(e => e.courseId));

      if (enrolls.length > 0) {
        const enrollIds = enrolls.map(e => e.id);
        let allAttempts: any[] = [];
        
        for (let i = 0; i < enrollIds.length; i += 30) {
          const chunk = enrollIds.slice(i, i + 30);
          const aSnap = await getDocs(query(
            collection(db, 'quiz_attempts'), 
            where('courseEnrollmentId', 'in', chunk)
          ));
          allAttempts = [...allAttempts, ...aSnap.docs.map(d => ({ ...d.data(), id: d.id }))];
        }
        allAttempts.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        setAttempts(allAttempts);
      }
    } catch (e) {
      console.error("Error cargando expediente:", e);
    } finally {
      setLoading(false);
    }
  }, [db, mentorProfile, studentId]);

  useEffect(() => {
    fetchAcademicData();
  }, [fetchAcademicData]);

  // Pre-seleccionar tareas y seguimientos cuando carguen
  useEffect(() => {
    if (tasks) setSelectedTaskIds(tasks.filter(t => t.status === 'completed').map(t => t.id));
    if (followUps) setSelectedFollowUpIds(followUps.map(f => f.id));
  }, [tasks, followUps]);

  const handleSaveNote = useCallback(async () => {
    if (!newNote.trim() || !mentorProfile) return;
    setIsSavingNote(true);
    const noteRef = doc(collection(db, 'users', mentorProfile.uid, 'studentNotes'));
    const noteData = {
      id: noteRef.id,
      studentId,
      content: newNote,
      createdAt: serverTimestamp(),
      authorName: mentorProfile.displayName
    };

    setDoc(noteRef, noteData)
      .then(() => {
        setNewNote('');
        toast({ title: 'Nota guardada' });
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: noteRef.path,
          operation: 'create',
          requestResourceData: noteData
        }));
      })
      .finally(() => setIsSavingNote(false));
  }, [db, mentorProfile, studentId, newNote, toast]);

  const handleSendTask = useCallback(async () => {
    if (!taskTitle || !mentorProfile || !studentId) return;
    setIsSendingTask(true);
    
    const taskRef = doc(collection(db, 'users', studentId, 'individualTasks'));
    const newTaskData = {
      id: taskRef.id,
      mentorId: mentorProfile.uid,
      mentorName: mentorProfile.displayName,
      studentId: studentId,
      studentName: studentData?.displayName || 'Alumno',
      studentEmail: studentData?.email || '',
      title: taskTitle,
      description: taskDesc,
      evaluationCriteria: taskEvaluationCriteria,
      allowFileUpload: allowTaskFileUpload,
      status: 'pending',
      createdAt: serverTimestamp()
    };

    setDoc(taskRef, newTaskData)
      .then(() => {
        setTaskTitle('');
        setTaskTitleDesc('');
        setTaskEvaluationCriteria('');
        setAllowTaskFileUpload(false);
        setIsNewTaskDialogOpen(false);
        toast({ title: 'Tarea asignada exitosamente', description: 'El alumno ha sido notificado del nuevo desafío.' });
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: taskRef.path,
          operation: 'create',
          requestResourceData: newTaskData
        }));
      })
      .finally(() => setIsSendingTask(false));
  }, [db, studentId, mentorProfile, studentData, taskTitle, taskDesc, taskEvaluationCriteria, allowTaskFileUpload, toast]);

  const handleGenerateAIProfile = async () => {
    setIsProfileDialogOpen(false);
    setIsGeneratingProfile(true);
    try {
      // Filtrar Cursos
      const filteredEnrollments = enrollments.filter(e => selectedCourseIds.includes(e.courseId));
      const performanceData = filteredEnrollments.map(e => {
        const courseAttempts = attempts.filter(a => a.courseEnrollmentId === e.id);
        const avgScore = courseAttempts.length > 0 
          ? courseAttempts.reduce((acc, a) => acc + a.score, 0) / courseAttempts.length 
          : 0;
        
        return {
          courseTitle: e.course?.title || 'Curso',
          averageScore: Math.round(avgScore),
          completedModules: e.progress?.completedModules?.length || 0,
          totalModules: e.course?.modulesCount || 1,
          feedbacks: courseAttempts.map(a => a.feedback).filter(Boolean) as string[],
        };
      });

      // Filtrar Tareas
      const filteredTasks = (tasks || []).filter(t => selectedTaskIds.includes(t.id) && t.status === 'completed');
      const tasksData = filteredTasks.map(t => ({
        title: t.title,
        answer: t.answer || '',
        score: t.score || 0,
        aiFeedback: t.aiFeedback || ''
      }));

      // Filtrar Seguimientos
      const filteredFollowUps = (followUps || []).filter(f => selectedFollowUpIds.includes(f.id));
      const followUpsData = await Promise.all(filteredFollowUps.map(async f => {
        const sessionsRef = collection(db, 'followups', f.id, 'sessions');
        try {
          const sessionsSnap = await getDocs(query(
            sessionsRef,
            where('isCompleted', '==', true)
          ));
          return {
            title: f.title,
            goal: f.goal,
            sessionsMinutes: sessionsSnap.docs.map(d => d.data().minutes).filter(Boolean) as string[]
          };
        } catch (e) {
          return { title: f.title, goal: f.goal, sessionsMinutes: [] };
        }
      }));

      const result = await generateStudentProfile({
        studentName: studentData?.displayName || 'Alumno',
        profilingFocus: profilingFocus,
        performanceData: performanceData.length > 0 ? performanceData : undefined,
        tasksData: tasksData.length > 0 ? tasksData : undefined,
        followUpsData: followUpsData.length > 0 ? followUpsData : undefined,
        mentorNotes: includeNotes ? (notes?.map(n => n.content) || []) : undefined,
      });

      // Persistir perfilamiento (Usamos studentNotes porque tiene permisos confirmados)
      if (mentorProfile?.uid) {
        const profileRef = doc(collection(db, 'users', mentorProfile.uid, 'studentNotes'));
        const profileData = {
          ...result,
          id: profileRef.id,
          type: 'ai_profile', // Flag para diferenciar de notas comunes
          studentId,
          focus: profilingFocus,
          createdAt: serverTimestamp(),
          mentorId: mentorProfile.uid,
          mentorName: mentorProfile.displayName
        };

        await setDoc(profileRef, profileData)
          .catch(async (e) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: profileRef.path,
              operation: 'create',
              requestResourceData: profileData
            }));
          });
      }

      setIsProfileDialogOpen(false);
      toast({ title: 'Perfilamiento Generado', description: 'El análisis estratégico ha sido procesado.' });
    } catch (e) {
      if (!(e instanceof FirestorePermissionError)) {
        toast({ variant: 'destructive', title: 'Error IA', description: 'No se pudo generar el perfil. Verifica las fuentes seleccionadas.' });
      }
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  const handleOpenAudit = async (moduleId: string, enroll: any, evalData: any) => {
    setLoadingAttemptDetails(true);
    setIsAttemptDialogOpen(true);
    setSelectedAttempt(null);
    setAttemptQuestions([]);

    const moduleAttempts = attempts.filter(a => a.moduleId === moduleId && a.courseEnrollmentId === enroll.id);
    if (moduleAttempts.length > 0) {
      handleViewAttemptDetail(moduleAttempts[0]);
      return;
    }

    if (evalData.answers && evalData.questions) {
      const summaryAttempt = {
        ...evalData,
        id: 'summary-' + moduleId,
        moduleId,
        courseId: enroll.courseId,
        courseTitle: enroll.course?.title,
        moduleTitle: enroll.moduleTitles?.[moduleId] || 'Clase',
        completedAt: evalData.submittedAt
      };
      setSelectedAttempt(summaryAttempt);
      setAttemptQuestions(evalData.questions);
      setLoadingAttemptDetails(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'quiz_attempts'), 
        where('courseEnrollmentId', '==', enroll.id),
        where('moduleId', '==', moduleId)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const sortedDocs = snap.docs.map(d => ({ ...d.data(), id: d.id } as any)).sort((a: any, b: any) => {
          return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
        });
        handleViewAttemptDetail(sortedDocs[0]);
      } else {
        const fallbackAttempt = {
          courseId: enroll.courseId,
          moduleId: moduleId,
          score: evalData.score,
          feedback: evalData.feedback,
          completedAt: evalData.submittedAt,
          courseTitle: enroll.course?.title,
          moduleTitle: enroll.moduleTitles?.[moduleId] || 'Clase',
          answers: evalData.answers || {} 
        };
        setSelectedAttempt(fallbackAttempt);
        
        const moduleRef = doc(db, 'courses', enroll.courseId, 'modules', moduleId);
        const modSnap = await getDoc(moduleRef);
        if (modSnap.exists()) {
          setAttemptQuestions(modSnap.data().questions || []);
        }
        setLoadingAttemptDetails(false);
      }
    } catch (e) {
      console.error("Error al recuperar auditoría:", e);
      setLoadingAttemptDetails(false);
    }
  };

  const handleViewAttemptDetail = async (attempt: any) => {
    setSelectedAttempt(null);
    setAttemptQuestions([]);
    
    setSelectedAttempt(attempt);
    setIsAttemptDialogOpen(true);
    setLoadingAttemptDetails(true);
    
    if (attempt.questions && attempt.questions.length > 0) {
      setAttemptQuestions(attempt.questions);
      setLoadingAttemptDetails(false);
      return;
    }

    if (!attempt.moduleId || !attempt.courseId) {
      setLoadingAttemptDetails(false);
      return;
    }

    try {
      const moduleRef = doc(db, 'courses', attempt.courseId, 'modules', attempt.moduleId);
      const modSnap = await getDoc(moduleRef);
      if (modSnap.exists()) {
        const modData = modSnap.data();
        const questions = attempt.isSupport ? (modData.supportQuestions || []) : (modData.questions || []);
        setAttemptQuestions(questions);
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al cargar temario' });
    } finally {
      setLoadingAttemptDetails(false);
    }
  };

  const sub = studentData?.subscription;
  const subEndDate = sub?.endDate?.toDate?.() || (sub?.endDate ? new Date(sub.endDate) : null);
  const daysLeft = subEndDate ? differenceInDays(subEndDate, new Date()) : 0;

  if (loading || studentLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-primary h-10 w-10" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-8">
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24 border-4 border-white shadow-2xl">
              <AvatarImage src={studentData?.photoURL} />
              <AvatarFallback className="text-2xl font-bold bg-primary text-white">
                {studentData?.displayName?.[0] || 'A'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">
                  {studentData?.displayName || 'Alumno Institucional'}
                </h1>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Alumno Activo</Badge>
              </div>
              <p className="text-muted-foreground font-medium flex items-center gap-2"><Mail className="h-4 w-4" /> {studentData?.email || enrollments[0]?.inviteEmail}</p>
            </div>
          </div>
          <div className="flex gap-3">
          </div>
        </header>

        <div className="space-y-8">
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="bg-secondary/20 p-1 rounded-2xl h-14 w-full justify-start gap-2 mb-8 overflow-x-auto">
                <TabsTrigger value="summary" className="rounded-xl px-6 font-bold gap-2 shrink-0"><User className="h-4 w-4" /> Información General</TabsTrigger>
                <TabsTrigger value="profiling" className="rounded-xl px-6 font-bold gap-2 shrink-0"><BrainCircuit className="h-4 w-4" /> Perfilamiento IA</TabsTrigger>
                <TabsTrigger value="courses" className="rounded-xl px-6 font-bold gap-2 shrink-0"><BookOpen className="h-4 w-4" /> Cursos y Desempeño</TabsTrigger>
                <TabsTrigger value="followups" className="rounded-xl px-6 font-bold gap-2 shrink-0"><ClipboardList className="h-4 w-4" /> Seguimientos</TabsTrigger>
                <TabsTrigger value="tasks" className="rounded-xl px-6 font-bold gap-2 shrink-0"><Zap className="h-4 w-4" /> Tareas Individuales</TabsTrigger>
                <TabsTrigger value="notes" className="rounded-xl px-6 font-bold gap-2 shrink-0"><MessageSquare className="h-4 w-4" /> Bitácora</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-8 animate-in fade-in duration-500">
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                  <CardHeader className="bg-primary/5 p-8 border-b">
                    <CardTitle className="text-xl font-bold flex items-center gap-3"><Globe className="h-5 w-5 text-primary" /> Perfil del Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    {/* Sección de Biografía y Redes */}

                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Biografía Académica</Label>
                      <div className="bg-secondary/10 p-6 rounded-[2rem] border-none italic text-slate-700 leading-relaxed min-h-[100px]">
                        {studentData?.profile?.bio || 'Sin biografía registrada.'}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Canales de Contacto</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                          { id: 'twitter', label: 'X (Twitter)', icon: Twitter },
                          { id: 'instagram', label: 'Instagram', icon: Instagram },
                          { id: 'youtube', label: 'YouTube', icon: Youtube },
                          { id: 'tiktok', label: 'TikTok', icon: TikTokIcon },
                          { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                          { id: 'phone', label: 'Teléfono', icon: Phone },
                          { id: 'website', label: 'Sitio Web', icon: Globe },
                        ].map((social) => {
                          const val = studentData?.profile?.socials?.[social.id];
                          return val ? (
                            <div key={social.id} className="p-4 bg-white border-2 border-primary/5 rounded-2xl flex items-center gap-3 shadow-sm">
                              <social.icon className="h-4 w-4 text-primary opacity-40" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">{social.label}</p>
                                <p className="text-xs font-bold truncate">{val}</p>
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Estado de Abono Institucional</Label>
                      {sub ? (
                        <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 grid sm:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Badge className="bg-emerald-500 text-white border-none h-5 text-[8px] font-black uppercase tracking-widest">Activo: {sub.planName}</Badge>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center text-primary shadow-sm"><Layers className="h-5 w-5" /></div>
                              <div>
                                <p className="text-xl font-black text-primary leading-none">{sub.maxSimultaneousCourses}</p>
                                <p className="text-[9px] font-bold uppercase text-muted-foreground mt-1">Cursos Simultáneos</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3 flex flex-col justify-center">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              <span>Días de Vigencia</span>
                              <span className="text-primary">{daysLeft} Días</span>
                            </div>
                            <Progress value={Math.min(100, (daysLeft/365)*100)} className="h-1.5 bg-secondary" />
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase text-right">Vence: {subEndDate ? format(subEndDate, 'dd/MM/yyyy') : '-'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-secondary/10 p-10 rounded-[2rem] text-center">
                          <CreditCard className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                          <p className="text-sm font-bold text-muted-foreground">Sin abono activo registrado en el perfil.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profiling" className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-muted-foreground" /> Historial de Perfilamientos
                  </h3>
                  <Button 
                    onClick={() => setIsProfileDialogOpen(true)}
                    disabled={isGeneratingProfile}
                    className="rounded-xl font-bold gap-2 bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20 h-10 px-6"
                  >
                    {isGeneratingProfile ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4" />} Obtener Nuevo Perfil
                  </Button>
                </div>

                <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-xl">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-primary/5">
                        <TableRow className="border-none">
                          <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Diagnóstico / Enfoque</TableHead>
                          <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">Fecha</TableHead>
                          <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-right">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!profiles || profiles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-20 text-center italic text-muted-foreground">
                              No hay diagnósticos IA generados para este alumno.
                            </TableCell>
                          </TableRow>
                        ) : profiles.map((p) => (
                          <TableRow key={p.id} className="hover:bg-primary/5 transition-colors border-b border-border/30 group">
                            <TableCell className="px-10 py-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground text-sm">{p.focus}</span>
                                <span className="text-[10px] text-muted-foreground italic mt-1 leading-relaxed">"{p.summary}"</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-center gap-1.5">
                                <Calendar className="h-3 w-3 opacity-40" /> {p.createdAt ? format(p.createdAt.toDate(), 'dd/MM/yyyy') : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="px-10 text-right">
                              <Button 
                                onClick={() => {
                                  setSelectedProfile(p);
                                  setIsProfileDetailDialogOpen(true);
                                }}
                                variant="ghost" 
                                className="rounded-xl font-bold text-primary gap-2 hover:bg-primary/10"
                              >
                                Ver Detalle <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="courses" className="space-y-6">
                {enrollments.length === 0 ? (
                  <Card className="p-20 text-center border-2 border-dashed bg-muted/5 rounded-[3rem]">
                    <p className="text-muted-foreground font-bold italic">No hay cursos compartidos con este mentor.</p>
                  </Card>
                ) : !selectedCourseId ? (
                  <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-xl animate-in fade-in duration-500">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-primary/5">
                          <TableRow className="border-none">
                            <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Programa</TableHead>
                            <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">Progreso</TableHead>
                            <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">Clases</TableHead>
                            <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-right">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enrollments.map((enroll) => {
                            const completedModules = enroll.progress?.completedModules?.length || 0;
                            const totalModules = enroll.course?.modulesCount || 1;
                            const progress = Math.min(100, Math.round((completedModules / totalModules) * 100));

                            return (
                              <TableRow key={enroll.id} className="hover:bg-primary/5 transition-colors border-b border-border/30 group">
                                <TableCell className="px-10 py-6">
                                  <div className="flex items-center gap-4">
                                    <div className="relative w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border shrink-0">
                                      {enroll.course?.thumbnail ? (
                                        <img src={enroll.course.thumbnail} alt={enroll.course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                          <BookOpen className="h-6 w-6" />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-bold text-foreground text-sm line-clamp-1">{enroll.course?.title}</p>
                                      <Badge className="bg-primary/5 text-primary/60 border-none text-[8px] font-black uppercase h-4 px-1.5 mt-1">
                                        {enroll.course?.category || 'Académico'}
                                      </Badge>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center w-48">
                                  <div className="flex flex-col gap-1.5 px-4">
                                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                      <span>{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-1.5" />
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="rounded-lg h-7 gap-1.5 font-bold border-primary/20 text-primary">
                                    <CheckCircle2 className={cn("h-3 w-3", progress === 100 ? "text-emerald-500" : "text-slate-300")} />
                                    {completedModules}/{totalModules}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-10 text-right">
                                  <Button 
                                    onClick={() => setSelectedCourseId(enroll.courseId)}
                                    variant="ghost" 
                                    className="rounded-xl font-bold text-primary gap-2 hover:bg-primary/10"
                                  >
                                    Ver Desempeño <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                    {(() => {
                      const enroll = enrollments.find(e => e.courseId === selectedCourseId);
                      if (!enroll) return null;
                      
                      const completedModules = enroll.progress?.completedModules?.length || 0;
                      const totalModules = enroll.course?.modulesCount || 1;
                      const progress = Math.min(100, Math.round((completedModules / totalModules) * 100));

                      return (
                        <div className="space-y-6">
                          <header className="flex items-center justify-between gap-4 bg-primary/5 p-6 rounded-[2rem] border border-primary/10">
                            <div className="flex items-center gap-4">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setSelectedCourseId(null)} 
                                className="rounded-xl hover:bg-white shadow-sm"
                              >
                                <X className="h-5 w-5" />
                              </Button>
                              <div>
                                <h3 className="font-bold text-xl text-primary">{enroll.course?.title}</h3>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Desglose de Clases y Auditoría</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-primary leading-none">{progress}%</p>
                              <p className="text-[10px] font-bold uppercase text-muted-foreground mt-1">Total</p>
                            </div>
                          </header>

                          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
                            <CardContent className="p-0">
                              <Table>
                                <TableHeader className="bg-slate-50 border-b">
                                  <TableRow className="border-none">
                                    <TableHead className="py-4 px-8 text-slate-500 uppercase tracking-widest text-[9px] font-bold">Módulo</TableHead>
                                    <TableHead className="py-4 text-center text-slate-500 uppercase tracking-widest text-[9px] font-bold">Fecha</TableHead>
                                    <TableHead className="py-4 text-center text-slate-500 uppercase tracking-widest text-[9px] font-bold">Calificación</TableHead>
                                    <TableHead className="py-4 text-center text-slate-500 uppercase tracking-widest text-[9px] font-bold">Intentos</TableHead>
                                    <TableHead className="py-4 px-8 text-right text-slate-500 uppercase tracking-widest text-[9px] font-bold">Acción</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {enroll.modules?.map((mod: any, index: number) => {
                                    const moduleId = mod.id;
                                    const evalData = enroll.progress?.evaluations?.[moduleId];
                                    const moduleAttempts = attempts.filter(a => a.moduleId === moduleId && a.courseEnrollmentId === enroll.id);
                                    const isPassing = evalData?.score >= 70;

                                    return (
                                      <TableRow key={moduleId} className="hover:bg-primary/5 transition-colors border-b last:border-none group">
                                        <TableCell className="px-8 py-5">
                                          <div className="flex items-center gap-3">
                                            <div className={cn(
                                              "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shadow-inner",
                                              moduleAttempts.length > 0 ? (isPassing ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600") : "bg-slate-50 text-slate-300"
                                            )}>
                                              {index + 1}
                                            </div>
                                            <span className={cn("font-bold text-sm", moduleAttempts.length === 0 ? "text-slate-400" : "text-slate-700")}>
                                              {mod.title}
                                            </span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-center gap-1.5">
                                            {evalData ? (
                                              <>
                                                <Calendar className="h-3 w-3 opacity-40" /> {format(evalData.submittedAt?.toDate?.() || new Date(evalData.submittedAt), 'dd/MM/yyyy')}
                                              </>
                                            ) : '-'}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {evalData ? (
                                            <Badge className={cn(
                                              "h-7 px-3 rounded-lg border-none font-black text-xs",
                                              isPassing ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                            )}>
                                              {evalData.score}%
                                            </Badge>
                                          ) : (
                                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Pendiente</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-center min-w-[200px]">
                                          <div className="flex flex-wrap justify-center gap-1.5 py-1">
                                            {moduleAttempts.length === 0 ? (
                                              <span className="text-[9px] text-slate-300 italic">Sin intentos</span>
                                            ) : (
                                              moduleAttempts.map((attempt) => (
                                                <Badge 
                                                  key={attempt.id} 
                                                  variant="secondary" 
                                                  className="h-6 px-2 rounded-md gap-1 cursor-pointer hover:bg-secondary transition-colors text-[9px] font-bold"
                                                  onClick={() => handleViewAttemptDetail(attempt)}
                                                >
                                                  <span className={attempt.score >= 70 ? "text-emerald-600" : "text-rose-600"}>
                                                    {attempt.score}%
                                                  </span>
                                                </Badge>
                                              ))
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="px-8 text-right">
                                          <Button 
                                            onClick={() => evalData && handleOpenAudit(moduleId, enroll, evalData)}
                                            size="sm"
                                            variant="outline"
                                            disabled={!evalData}
                                            className="h-9 px-4 rounded-xl font-bold gap-2 text-xs border-primary/20 text-primary hover:bg-primary/5"
                                          >
                                            <FileSearch className="h-3.5 w-3.5" /> Detalle Q&A
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>

                          {progress < 100 && (
                            <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-dashed border-slate-200 text-center">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                                <Clock className="h-3.5 w-3.5" /> Faltan {totalModules - completedModules} clases por completar
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="followups" className="space-y-6 animate-in fade-in duration-500">
                <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-xl">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-primary/5">
                        <TableRow className="border-none">
                          <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Seguimiento</TableHead>
                          <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">Estado</TableHead>
                          <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">Iniciado</TableHead>
                          <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-right">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {followUps?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-20 text-center italic text-muted-foreground">
                              No hay seguimientos activos para este alumno.
                            </TableCell>
                          </TableRow>
                        ) : followUps?.map((f) => (
                          <TableRow key={f.id} className="hover:bg-primary/5 transition-colors border-b border-border/30 group">
                            <TableCell className="px-10 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-bold border shrink-0">
                                  <ClipboardList className="h-5 w-5" />
                                </div>
                                <span className="font-bold text-foreground text-sm">{f.title}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={cn(
                                "text-[8px] uppercase font-black px-2 h-5 border-none",
                                f.status === 'active' ? "bg-emerald-500" : "bg-rose-500"
                              )}>
                                {f.status === 'active' ? 'En Curso' : 'Suspendido'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-center gap-1.5">
                                <Calendar className="h-3 w-3" /> {f.startDate ? format(f.startDate?.toDate?.() || new Date(f.startDate), 'dd/MM/yyyy') : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="px-10 text-right">
                              <Link href={`/seguimientos/${f.id}`}>
                                <Button variant="ghost" className="rounded-xl font-bold text-primary gap-2 hover:bg-primary/10">
                                  Detalle <ChevronRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" /> Histórico de Tareas
                  </h3>
                  <Button 
                    onClick={() => setIsNewTaskDialogOpen(true)}
                    className="rounded-xl font-bold gap-2 bg-primary shadow-lg shadow-primary/20 h-10 px-6"
                  >
                    <Plus className="h-4 w-4" /> Asignar Nueva Tarea
                  </Button>
                </div>

                <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-xl">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-primary/5">
                        <TableRow className="border-none">
                          <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Tarea / Desafío</TableHead>
                          <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">Estado</TableHead>
                          <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">Calificación</TableHead>
                          <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-right">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-20 text-center italic text-muted-foreground">
                              No hay tareas individuales asignadas a este alumno.
                            </TableCell>
                          </TableRow>
                        ) : tasks?.map((task) => (
                          <TableRow key={task.id} className="hover:bg-primary/5 transition-colors border-b border-border/30 group">
                            <TableCell className="px-10 py-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground text-sm">{task.title}</span>
                                <span className="text-[10px] text-muted-foreground uppercase mt-1">
                                  {format(task.createdAt?.toDate?.() || new Date(task.createdAt || Date.now()), 'dd/MM/yyyy HH:mm')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={cn(
                                "text-[8px] uppercase font-black px-2 h-5 border-none",
                                task.status === 'completed' ? "bg-emerald-500" : "bg-amber-500"
                              )}>
                                {task.status === 'completed' ? 'Entregada' : 'Pendiente'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {task.status === 'completed' ? (
                                <Badge variant="outline" className="h-6 px-2 rounded-lg font-black text-xs border-primary/20 text-primary">
                                  {task.score}%
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="px-10 text-right">
                              <Button 
                                onClick={() => {
                                  setSelectedTask(task);
                                  setIsTaskDetailDialogOpen(true);
                                }}
                                variant="ghost" 
                                className="rounded-xl font-bold text-primary gap-2 hover:bg-primary/10"
                              >
                                Ver Detalle <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="notes" className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" /> Bitácora del Mentor
                  </h3>
                  <Button 
                    onClick={() => setIsNewNoteDialogOpen(true)}
                    className="rounded-xl font-bold gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-10 px-6"
                  >
                    <Plus className="h-4 w-4" /> Nueva Observación
                  </Button>
                </div>

                <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-xl">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-primary/5">
                        <TableRow className="border-none">
                          <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold">Observación</TableHead>
                          <TableHead className="py-6 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-center">Fecha</TableHead>
                          <TableHead className="py-6 px-10 text-primary/70 uppercase tracking-widest text-[10px] font-bold text-right">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!notes || notes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-20 text-center italic text-muted-foreground">
                              No hay observaciones registradas para este alumno.
                            </TableCell>
                          </TableRow>
                        ) : notes.map((note) => (
                          <TableRow key={note.id} className="hover:bg-primary/5 transition-colors border-b border-border/30 group">
                            <TableCell className="px-10 py-6">
                              <p className="text-sm text-slate-700 line-clamp-1 italic">"{note.content}"</p>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-center gap-1.5">
                                <Calendar className="h-3 w-3 opacity-40" /> {note.createdAt ? format(note.createdAt?.toDate?.() || new Date(note.createdAt), 'dd/MM/yyyy') : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="px-10 text-right">
                              <Button 
                                onClick={() => {
                                  setSelectedNote(note);
                                  setIsNoteDetailDialogOpen(true);
                                }}
                                variant="ghost" 
                                className="rounded-xl font-bold text-primary gap-2 hover:bg-primary/10"
                              >
                                Ver Detalle <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
        </div>
      </div>

      {/* Profiling Dialog - Advanced Version */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="max-w-2xl h-[90vh] rounded-[2rem] p-0 overflow-hidden border-none shadow-3xl flex flex-col">
          <div className="bg-primary p-8 text-white relative shrink-0">
            <Settings2 className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
            <DialogTitle className="text-2xl font-bold flex items-center gap-3"><BrainCircuit className="h-6 w-6 text-emerald-400" /> Perfilamiento Estratégico IA</DialogTitle>
            <DialogDescription className="text-primary-foreground/70 mt-1">Configura el enfoque del análisis y selecciona fuentes granulares.</DialogDescription>
          </div>
          
          <ScrollArea className="flex-1 p-8">
            <div className="space-y-10">
              <section className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">1. ¿Qué queremos descubrir? (Lente del Análisis)</Label>
                <div className="grid gap-4">
                  <Input 
                    value={profilingFocus}
                    onChange={e => setProfilingFocus(e.target.value)}
                    placeholder="Ej: Determinar su cliente ideal, sugerencias de marca personal..."
                    className="h-14 rounded-2xl border-2 border-primary/10 font-bold bg-slate-50"
                  />
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Identificación de Cliente Ideal', 
                      'Posicionamiento de Marca Personal', 
                      'Estrategia de Crecimiento Individual', 
                      'Detección de Bloqueos en Ventas',
                      'Perfil de Liderazgo y Autoridad',
                      'Análisis de Proyección Profesional'
                    ].map(tag => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-primary hover:text-white transition-colors py-1.5 px-4 rounded-xl text-[10px] font-bold"
                        onClick={() => setProfilingFocus(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">2. Fuentes de Información Detalladas</Label>
                
                {/* Cursos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-sm font-bold flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Historial de Cursos</h4>
                    <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold uppercase" onClick={() => setSelectedCourseIds(enrollments.map(e => e.courseId))}>Todos</Button>
                  </div>
                  <div className="grid gap-2">
                    {enrollments.map(e => (
                      <div key={e.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <Checkbox 
                          checked={selectedCourseIds.includes(e.courseId)}
                          onCheckedChange={(checked) => {
                            setSelectedCourseIds(checked ? [...selectedCourseIds, e.courseId] : selectedCourseIds.filter(id => id !== e.courseId));
                          }}
                        />
                        <span className="text-xs font-bold text-slate-700 truncate">{e.course?.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tareas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-sm font-bold flex items-center gap-2"><Zap className="h-4 w-4 text-accent" /> Desafíos Realizados</h4>
                    <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold uppercase" onClick={() => setSelectedTaskIds(tasks?.filter(t => t.status === 'completed').map(t => t.id) || [])}>Todos</Button>
                  </div>
                  <div className="grid gap-2">
                    {(tasks?.filter(t => t.status === 'completed') || []).map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <Checkbox 
                          checked={selectedTaskIds.includes(t.id)}
                          onCheckedChange={(checked) => {
                            setSelectedTaskIds(checked ? [...selectedTaskIds, t.id] : selectedTaskIds.filter(id => id !== t.id));
                          }}
                        />
                        <span className="text-xs font-bold text-slate-700 truncate">{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seguimientos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-sm font-bold flex items-center gap-2"><ClipboardList className="h-4 w-4 text-blue-500" /> Seguimientos Activos</h4>
                    <Button variant="ghost" size="sm" className="h-6 text-[9px] font-bold uppercase" onClick={() => setSelectedFollowUpIds(followUps?.map(f => f.id) || [])}>Todos</Button>
                  </div>
                  <div className="grid gap-2">
                    {(followUps || []).map(f => (
                      <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <Checkbox 
                          checked={selectedFollowUpIds.includes(f.id)}
                          onCheckedChange={(checked) => {
                            setSelectedFollowUpIds(checked ? [...selectedFollowUpIds, f.id] : selectedFollowUpIds.filter(id => id !== f.id));
                          }}
                        />
                        <span className="text-xs font-bold text-slate-700 truncate">{f.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notas Mentor */}
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs font-bold">Incluir mi Bitácora Privada</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Notas cualitativas del mentor</p>
                    </div>
                  </div>
                  <Switch checked={includeNotes} onCheckedChange={setIncludeNotes} />
                </div>
              </section>
            </div>
          </ScrollArea>

          <DialogFooter className="p-8 bg-slate-50 border-t shrink-0">
            <Button 
              onClick={handleGenerateAIProfile} 
              disabled={isGeneratingProfile}
              className="w-full h-16 rounded-[1.5rem] font-bold text-xl shadow-2xl bg-primary text-white gap-3"
            >
              {isGeneratingProfile ? <Loader2 className="animate-spin h-6 w-6" /> : <Sparkles className="h-6 w-6" />} 
              Lanzar Diagnóstico Estratégico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAttemptDialogOpen} onOpenChange={setIsAttemptDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 border-none shadow-3xl rounded-[2.5rem] overflow-hidden">
          <div className="bg-primary p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><BrainCircuit className="h-6 w-6" /></div>
                <div>
                  <DialogTitle className="text-2xl font-bold">Auditoría de Evaluación</DialogTitle>
                  <DialogDescription className="text-primary-foreground/70">
                    {selectedAttempt?.courseTitle} • {selectedAttempt?.moduleTitle}
                  </DialogDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsAttemptDialogOpen(false)} className="rounded-full text-white hover:bg-white/10">
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-8">
            <div className="space-y-10">
              <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10 flex items-start gap-6">
                <div className={cn(
                  "w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-xl shrink-0",
                  (selectedAttempt?.score || 0) >= 70 ? "bg-emerald-500" : "bg-rose-500"
                )}>
                  {selectedAttempt?.score}%
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" /> Devolución de Gemini
                  </h4>
                  <p className="text-sm text-slate-700 italic leading-relaxed">"{selectedAttempt?.feedback || 'Sin feedback registrado'}"</p>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-2 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" /> Desglose de Preguntas ({attemptQuestions.length})
                </h4>
                {loadingAttemptDetails ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground font-bold italic">Sincronizando registros...</p>
                  </div>
                ) : attemptQuestions.length > 0 ? (
                  <div className="flex flex-col gap-6">
                    {attemptQuestions.map((q, idx) => {
                      const answersMap = selectedAttempt?.answers || {};
                      const studentAnswer = answersMap[idx.toString()] ?? answersMap[idx];
                      
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
                                <span className="text-[8px] font-bold uppercase text-muted-foreground block mb-1">Respuesta del Alumno</span>
                                <p className="text-sm font-medium text-slate-700">
                                  {studentAnswer === undefined || studentAnswer === null || studentAnswer === '' ? (
                                    <span className="text-muted-foreground/40 italic">Información en proceso de sincronización...</span>
                                  ) : (
                                    typeof studentAnswer === 'boolean' ? (studentAnswer ? 'Verdadero' : 'Falso') : studentAnswer
                                  )}
                                </p>
                              </div>
                              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                <span className="text-[8px] font-bold uppercase text-emerald-600 block mb-1">Respuesta Correcta / Guía</span>
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
                ) : (
                  <div className="text-center py-16 bg-muted/5 rounded-[2rem] border-2 border-dashed">
                    <FileSearch className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground font-bold italic">Recuperando detalle de respuestas...</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-slate-50 border-t">
            <Button onClick={() => setIsAttemptDialogOpen(false)} variant="secondary" className="rounded-xl font-bold h-12 px-8">Cerrar Auditoría</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl">
          <div className="bg-primary p-8 text-white relative">
            <Plus className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
            <DialogTitle className="text-2xl font-bold flex items-center gap-3"><Send className="h-6 w-6 text-emerald-400" /> Asignar Tarea Individual</DialogTitle>
            <DialogDescription className="text-primary-foreground/70 mt-1">Crea un desafío personalizado para el alumno con evaluación por IA.</DialogDescription>
          </div>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="task-title">Título del Desafío</Label>
                <Input id="task-title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Ej: Análisis de caso práctico Módulo 2" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-desc">Consigna Detallada</Label>
                <Textarea id="task-desc" value={taskDesc} onChange={e => setTaskTitleDesc(e.target.value)} placeholder="Describe qué debe realizar el alumno..." className="min-h-[120px] rounded-2xl" />
              </div>
              
              <div className="space-y-2">
                <Label className="text-accent flex items-center gap-2"><BrainCircuit className="h-4 w-4" /> Criterios de Evaluación IA</Label>
                <Textarea value={taskEvaluationCriteria} onChange={e => setTaskEvaluationCriteria(e.target.value)} placeholder="¿Qué puntos clave debe validar Gemini para calificar esta tarea?" className="min-h-[100px] rounded-2xl bg-accent/5 border-accent/20" />
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/5 rounded-xl border border-dashed border-primary/10">
                <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-primary" /><div className="space-y-0.5"><Label className="text-xs font-bold">Habilitar Adjunto PDF</Label><p className="text-[9px] text-muted-foreground">Permite al alumno subir evidencia.</p></div></div>
                <Switch checked={allowTaskFileUpload} onCheckedChange={setAllowTaskFileUpload} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-slate-50 border-t gap-3">
            <Button onClick={() => setIsNewTaskDialogOpen(false)} variant="ghost" className="rounded-xl font-bold">Cancelar</Button>
            <Button 
              onClick={handleSendTask} 
              disabled={isSendingTask || !taskTitle} 
              className="rounded-xl font-bold px-8 shadow-xl"
            >
              {isSendingTask ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />} Asignar Tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={isTaskDetailDialogOpen} onOpenChange={setIsTaskDetailDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl">
          <div className="bg-slate-900 p-8 text-white relative">
            <div className="absolute right-8 top-8">
              <Badge className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase border-none",
                selectedTask?.status === 'completed' ? "bg-emerald-500" : "bg-amber-500"
              )}>
                {selectedTask?.status === 'completed' ? 'Entregada' : 'Pendiente'}
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-bold pr-20">{selectedTask?.title}</DialogTitle>
            <DialogDescription className="text-slate-400 mt-1">Asignada el {selectedTask?.createdAt ? format(selectedTask.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '-'}</DialogDescription>
          </div>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Target className="h-4 w-4" /> Consigna</h4>
                <div className="p-5 bg-secondary/10 rounded-2xl text-sm leading-relaxed italic text-slate-700">
                  "{selectedTask?.description}"
                </div>
              </div>

              {selectedTask?.status === 'completed' ? (
                <>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2"><User className="h-4 w-4" /> Respuesta del Alumno</h4>
                    <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                      <p className="text-sm leading-relaxed">{selectedTask.answer}</p>
                      {selectedTask.fileUrl && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4 rounded-xl font-bold gap-2 border-primary/20 text-primary hover:bg-white"
                          onClick={() => window.open(selectedTask.fileUrl, '_blank')}
                        >
                          <FileText className="h-4 w-4" /> Ver Documento Adjunto
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2"><BrainCircuit className="h-4 w-4" /> Evaluación IA</h4>
                    <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100 relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <Badge className="bg-emerald-500 text-white border-none h-6 px-3 font-black text-xs">Puntaje: {selectedTask.score}%</Badge>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{format(selectedTask.completedAt?.toDate?.() || new Date(selectedTask.completedAt), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                      <p className="text-sm italic text-emerald-900 leading-relaxed">"{selectedTask.aiFeedback}"</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-10 text-center bg-muted/5 rounded-[2rem] border-2 border-dashed">
                  <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-muted-foreground font-bold italic">Esperando entrega del alumno...</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-slate-50 border-t">
            <Button onClick={() => setIsTaskDetailDialogOpen(false)} variant="secondary" className="rounded-xl font-bold h-12 px-8">Cerrar Detalle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* AI Profile Detail Dialog */}
      <Dialog open={isProfileDetailDialogOpen} onOpenChange={setIsProfileDetailDialogOpen}>
        <DialogContent className="max-w-3xl h-[90vh] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl bg-slate-950 text-white flex flex-col">
          <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 relative overflow-hidden shrink-0">
            <BrainCircuit className="absolute -right-10 -top-10 h-64 w-64 opacity-10 pointer-events-none" />
            <div className="flex items-center gap-5 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <Sparkles className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="font-bold text-2xl leading-tight">{selectedProfile?.focus}</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase text-white/40 tracking-widest mt-1">Diagnóstico Estratégico IA</DialogDescription>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8 pt-2 space-y-6">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                <Label className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest flex items-center gap-2 mb-3"><Lightbulb className="h-4 w-4" /> Resumen de Potencial</Label>
                <p className="text-lg leading-relaxed text-slate-100 italic">"{selectedProfile?.summary}"</p>
              </div>

              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                <h5 className="text-[10px] font-bold uppercase text-white/40 mb-3">Patrón de Marca Detectado</h5>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-4 h-7 font-bold text-xs w-fit">{selectedProfile?.learningStyle}</Badge>
              </div>

              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                <h5 className="text-[10px] font-bold uppercase text-white/40 mb-3">Justificación del Razonamiento</h5>
                <p className="text-sm text-slate-400 leading-relaxed">{selectedProfile?.justification}</p>
              </div>

              <div className="bg-white/10 p-8 rounded-[2rem] border border-white/20">
                <h4 className="text-[10px] font-bold uppercase text-amber-400 mb-4 flex items-center gap-2"><Target className="h-4 w-4" /> Hoja de Ruta Sugerida</h4>
                <p className="text-base font-medium text-slate-100 leading-relaxed">{selectedProfile?.recommendation}</p>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-8 bg-slate-900/50 border-t border-white/10 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Generado el {selectedProfile?.createdAt ? format(selectedProfile.createdAt?.toDate?.() || new Date(selectedProfile.createdAt), 'dd/MM/yyyy HH:mm') : '-'}</span>
            <Button onClick={() => setIsProfileDetailDialogOpen(false)} variant="ghost" className="rounded-xl font-bold text-white hover:bg-white/10 border border-white/10 px-8">Cerrar Diagnóstico</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Note Dialog */}
      <Dialog open={isNewNoteDialogOpen} onOpenChange={setIsNewNoteDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl">
          <div className="bg-primary p-8 text-white relative">
            <MessageSquare className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
            <DialogTitle className="text-2xl font-bold flex items-center gap-3"><Plus className="h-6 w-6 text-emerald-400" /> Nueva Observación</DialogTitle>
            <DialogDescription className="text-primary-foreground/70 mt-1">Registra detalles cualitativos sobre el avance del alumno.</DialogDescription>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Contenido de la nota</Label>
              <Textarea 
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Escribe aquí tus observaciones..."
                className="min-h-[200px] rounded-2xl border-2 border-primary/10 font-medium bg-slate-50 p-4"
              />
            </div>
          </div>
          <DialogFooter className="p-8 bg-slate-50 border-t">
            <Button 
              onClick={() => {
                handleSaveNote().then(() => setIsNewNoteDialogOpen(false));
              }} 
              disabled={isSavingNote || !newNote.trim()}
              className="w-full h-16 rounded-[1.5rem] font-bold text-xl shadow-2xl bg-primary text-white gap-3"
            >
              {isSavingNote ? <Loader2 className="animate-spin h-6 w-6" /> : <Save className="h-6 w-6" />} 
              Guardar en Bitácora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Detail Dialog */}
      <Dialog open={isNoteDetailDialogOpen} onOpenChange={setIsNoteDetailDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl flex flex-col max-h-[80vh]">
          <div className="bg-slate-900 p-8 text-white relative shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-3"><MessageSquare className="h-5 w-5 text-emerald-400" /> Detalle de Observación</DialogTitle>
            <DialogDescription className="text-white/40 mt-1 uppercase text-[9px] font-bold tracking-widest">
              Registrado el {selectedNote?.createdAt ? format(selectedNote.createdAt?.toDate?.() || new Date(selectedNote.createdAt), 'dd/MM/yyyy HH:mm') : '-'}
            </DialogDescription>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-8 space-y-6">
              <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/10">
                <p className="text-lg leading-relaxed text-slate-700 italic">"{selectedNote?.content}"</p>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-8 bg-slate-50 border-t shrink-0">
            <Button onClick={() => setIsNoteDetailDialogOpen(false)} variant="secondary" className="rounded-xl font-bold h-12 px-8 w-full">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
