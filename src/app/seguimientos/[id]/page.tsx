
'use client';

import { useState, useEffect, use, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { sendWelcomeEmailAction } from '@/app/actions/email-actions';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, setDoc, serverTimestamp, orderBy, getDocs, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StudentPageHeader } from '@/components/student/PageHeader';
import { AssignTaskForm, TaskFormData } from '@/components/tasks/AssignTaskForm';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardList, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Save, 
  Loader2, 
  Zap, 
  TrendingUp, 
  FileText, 
  MessageSquare,
  ArrowLeft,
  X,
  History,
  Target,
  BarChart3,
  BookOpen,
  Send,
  Upload,
  BrainCircuit,
  Info,
  CalendarDays,
  ExternalLink,
  Download,
  AlertCircle,
  Sparkles,
  PauseCircle,
  Play,
  Users,
  Search,
  UserPlus
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { evaluateQuizPerformance } from '@/ai/flows/evaluate-quiz-performance';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Switch } from '@/components/ui/switch';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

const MENTOR_ORGANIZER_EMAIL = 'felizdeemprender@gmail.com';

export default function FollowUpDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: followUpId } = use(params);
  const { profile } = useAuth();
  const db = useFirestore();
  const { storage } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const { connect, checkAvailability, createEvent, fetchEvents, isConnected, isConnecting } = useGoogleCalendar();
  const [activeTab, setActiveTab] = useState('sessions');
  const [mentorCourses, setMentorCourses] = useState<any[]>([]);
  const [studentEnrollments, setStudentEnrollments] = useState<Record<string, any>>({});
  const [studentEmail, setStudentEmail] = useState('');
  const [mentorEmail, setMentorEmail] = useState('');
  const [isUploadingGuide, setIsUploadingGuide] = useState(false);

  // Group Mentorship States
  const [groupEnrollments, setGroupEnrollments] = useState<any[]>([]);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [addStudentType, setAddStudentType] = useState<'select' | 'manual'>('select');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [manualStudentEmail, setManualStudentEmail] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  
  // Filters for Add Student Dialog
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentProgramFilter, setStudentProgramFilter] = useState('all');
  const [mentorFollowUps, setMentorFollowUps] = useState<any[]>([]);

  const isMentor = profile?.roles.includes('mentor') || profile?.roles.includes('admin');
  const isStudent = profile?.roles.includes('alumno') && !isMentor;

  const clearUILocks = useCallback(() => {
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
    document.documentElement.style.pointerEvents = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.removeAttribute('inert');
    document.body.classList.remove('pointer-events-none');
    document.documentElement.classList.remove('pointer-events-none');
  }, []);

  const followUpRef = useMemoFirebase(() => doc(db, 'followups', followUpId), [db, followUpId]);
  const { data: followUp, isLoading: followUpLoading } = useDoc(followUpRef);

  const sessionsQuery = useMemoFirebase(() => 
    query(collection(db, 'followups', followUpId, 'sessions'))
  , [db, followUpId]);
  const { data: sessions } = useCollection(sessionsQuery);

  const sortedSessions = useMemo(() => {
    if (!sessions) return [];
    return [...sessions].sort((a, b) => {
      if (a.date && b.date) {
        const dateTimeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
        const dateTimeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
        if (dateTimeA !== dateTimeB) return dateTimeA - dateTimeB;
      }
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return (a.orderIndex || 0) - (b.orderIndex || 0);
    });
  }, [sessions]);

  const tasksQuery = useMemoFirebase(() => 
    query(collection(db, 'followups', followUpId, 'tasks'), orderBy('createdAt', 'desc'))
  , [db, followUpId]);
  const { data: tasks } = useCollection(tasksQuery);

  const [editingSession, setEditingSession] = useState<any>(null);
  const [sessionForm, setSessionData] = useState({
    date: '',
    time: '',
    duration: 60,
    topics: [] as string[],
    newTopic: '',
    minutes: '',
    isCompleted: false,
    calendarEventId: '',
    calendarEventLink: ''
  });

  const [answeringTaskId, setAnsweringTaskId] = useState<string | null>(null);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<'idle' | 'checking' | 'free' | 'busy'>('idle');
  const [conflictTitle, setConflictTitle] = useState<string>('');

  useEffect(() => {
    if (!isConnected || !sessionForm.date || !sessionForm.time) {
      setAvailabilityStatus('idle');
      setConflictTitle('');
      return;
    }
    
    let isMounted = true;
    const checkTimer = setTimeout(async () => {
      try {
        if (isMounted) setAvailabilityStatus('checking');
        
        const [year, month, day] = sessionForm.date.split('-');
        const [hour, minute] = sessionForm.time.split(':');
        const start = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        const end = new Date(start.getTime() + (sessionForm.duration || 60) * 60000);
        
        const status = await checkAvailability(start.toISOString(), end.toISOString());
        if (isMounted) {
          if (status.isFree) {
            setAvailabilityStatus('free');
            setConflictTitle('');
          } else {
            setAvailabilityStatus('busy');
            setConflictTitle(status.title || '');
          }
        }
      } catch (err) {
        if (isMounted) {
          setAvailabilityStatus('idle');
          setConflictTitle('');
        }
      }
    }, 600);
    
    return () => {
      isMounted = false;
      clearTimeout(checkTimer);
    };
  }, [sessionForm.date, sessionForm.time, sessionForm.duration, isConnected, checkAvailability]);

  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [showGoogleEvents, setShowGoogleEvents] = useState(false);

  const handleFetchEvents = async () => {
    try {
      setLoading(true);
      const token = await connect();
      if (token) {
        const events = await fetchEvents(token);
        setGoogleEvents(events);
        setShowGoogleEvents(true);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event: any) => {
    if (event.start?.dateTime && event.end?.dateTime) {
      const startDate = new Date(event.start.dateTime);
      const endDate = new Date(event.end.dateTime);
      const durationMs = endDate.getTime() - startDate.getTime();
      const duration = Math.round(durationMs / 60000);
      
      const dateStr = startDate.toLocaleDateString('en-CA'); // YYYY-MM-DD local
      const timeStr = startDate.toTimeString().slice(0, 5); // HH:mm local
      
      setSessionData({
        ...sessionForm,
        date: dateStr,
        time: timeStr,
        duration,
        calendarEventId: event.id,
        calendarEventLink: event.htmlLink || ''
      });
      setShowGoogleEvents(false);
      toast({ title: 'Evento Importado', description: 'Se han autocompletado la fecha y hora.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'El evento seleccionado no tiene un formato de fecha/hora válido (podría ser de todo el día).' });
    }
  };
  useEffect(() => {
    if (!editingSession && !answeringTaskId) {
      const timer = setTimeout(clearUILocks, 300);
      return () => clearTimeout(timer);
    }
  }, [editingSession, answeringTaskId, clearUILocks]);

  useEffect(() => {
    if (isMentor) {
      getDocs(query(collection(db, 'courses'), where('mentorId', '==', profile?.uid))).then(snap => {
        setMentorCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      getDocs(query(collection(db, 'followups'), where('mentorId', '==', profile?.uid))).then(snap => {
        setMentorFollowUps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [db, profile, isMentor]);

  useEffect(() => {
    if (followUp?.studentId) {
      getDoc(doc(db, 'users', followUp.studentId)).then(snap => {
        if (snap.exists()) setStudentEmail(snap.data().email || '');
      });

      getDocs(query(collection(db, 'enrollments'), where('studentId', '==', followUp.studentId))).then(snap => {
        const mapping: Record<string, any> = {};
        snap.docs.forEach(d => {
          mapping[d.data().courseId] = d.data();
        });
        setStudentEnrollments(mapping);
      });
    } else if (followUp?.type === 'group' && followUp?.id) {
      // Load group enrollments
      const fetchGroupEnrollments = async () => {
        try {
          const q1 = query(collection(db, 'enrollments'), where('productId', '==', followUp.id));
          const q2 = query(collection(db, 'enrollments'), where('courseId', '==', followUp.id));
          const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
          
          const enrollmentsMap = new Map();
          snap1.docs.forEach(d => enrollmentsMap.set(d.id, { id: d.id, ...d.data() }));
          snap2.docs.forEach(d => enrollmentsMap.set(d.id, { id: d.id, ...d.data() }));
          
          setGroupEnrollments(Array.from(enrollmentsMap.values()));
        } catch (e) {
          console.error("Error fetching group enrollments:", e);
        }
      };
      fetchGroupEnrollments();
    }
    
    if (followUp?.mentorId) {
      getDoc(doc(db, 'users', followUp.mentorId)).then(snap => {
        if (snap.exists()) setMentorEmail(snap.data().email || '');
      });
    }
  }, [db, followUp, isMentor, profile?.uid]);

  useEffect(() => {
    if (isMentor) {
      const fetchStudents = async () => {
        const allProgramIds = [...mentorCourses.map(c => c.id), ...mentorFollowUps.map(f => f.id)];
        let enrollments: any[] = [];
        
        try {
          const enrollQuery = query(collection(db, 'enrollments'), where('mentorId', '==', profile?.uid));
          const mentorIdSnap = await getDocs(enrollQuery);
          enrollments = [...mentorIdSnap.docs.map(d => ({ id: d.id, ...d.data() }))];

          if (allProgramIds.length > 0) {
            for (let i = 0; i < allProgramIds.length; i += 30) {
              const chunk = allProgramIds.slice(i, i + 30);
              const snap1 = await getDocs(query(collection(db, 'enrollments'), where('courseId', 'in', chunk)));
              const snap2 = await getDocs(query(collection(db, 'enrollments'), where('productId', 'in', chunk)));
              enrollments = [...enrollments, ...snap1.docs.map(d => ({ id: d.id, ...d.data() })), ...snap2.docs.map(d => ({ id: d.id, ...d.data() }))];
            }
          }

          const studentMap = new Map();
          enrollments.forEach(data => {
            const userEmail = data.inviteEmail || data.studentEmail || data.email;
            if (userEmail) {
              const existing = studentMap.get(userEmail) || {
                id: data.studentId || data.userId || data.id,
                email: userEmail,
                displayName: data.studentName || data.displayName || userEmail,
                enrolledProducts: new Set()
              };
              if (data.courseId) existing.enrolledProducts.add(data.courseId);
              if (data.productId) existing.enrolledProducts.add(data.productId);
              studentMap.set(userEmail, existing);
            }
          });
          
          setAllStudents(Array.from(studentMap.values()).map(s => ({
            ...s, 
            enrolledProducts: Array.from(s.enrolledProducts)
          })));
        } catch (error) {
          console.error("Error fetching students:", error);
        }
      };
      fetchStudents();
    }
  }, [db, isMentor, profile?.uid, mentorCourses, mentorFollowUps]);

  const handleAddAdditionalSession = async () => {
    if (!followUp) return;
    setLoading(true);
    const sessionId = Math.random().toString(36).substring(2, 15);
    const sessionRef = doc(db, 'followups', followUpId, 'sessions', sessionId);
    
    const maxIndex = sessions?.reduce((max, s) => Math.max(max, s.orderIndex || 0), 0) || 0;

    const sessionData = {
      id: sessionId,
      followUpId,
      orderIndex: maxIndex + 1,
      isAdditional: true,
      isCompleted: false,
      status: 'pending',
      topics: [],
      minutes: '',
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(sessionRef, sessionData);
      toast({ title: 'Sesión Extra Añadida', description: 'Se ha incorporado una sesión adicional al plan.' });
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: sessionRef.path,
        operation: 'create',
        requestResourceData: sessionData
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleEditSession = (session: any) => {
    setEditingSession(session);
    setSessionData({
      date: session.date || '',
      time: session.time || '',
      duration: session.duration || 60,
      topics: session.topics || [],
      newTopic: '',
      minutes: session.minutes || '',
      isCompleted: session.isCompleted || false,
      calendarEventId: session.calendarEventId || '',
      calendarEventLink: session.calendarEventLink || ''
    });
  };

  const handleSaveSession = async () => {
    if (!editingSession) return;
    setLoading(true);
    const ref = doc(db, 'followups', followUpId, 'sessions', editingSession.id);
    const isNowCompleted = sessionForm.isCompleted;
    const isScheduled = !!sessionForm.date;
    const data = {
      ...sessionForm,
      isCompleted: isNowCompleted,
      status: isNowCompleted ? 'completed' : (isScheduled ? 'scheduled' : 'pending'),
      updatedAt: serverTimestamp()
    };
    delete (data as any).newTopic;

    try {
      if (isConnected && sessionForm.date && sessionForm.time && !sessionForm.calendarEventId) {
        const [year, month, day] = sessionForm.date.split('-');
        const [hour, minute] = sessionForm.time.split(':');
        const start = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        const end = new Date(start.getTime() + (sessionForm.duration || 60) * 60000);
        
        const title = `${editingSession.isAdditional ? 'Sesión Extra' : 'Sesión ' + editingSession.orderIndex}: ${followUp?.title}`;
        const details = `Programa de Mentoría: ${followUp?.goal}\n\nMentor: ${mentorEmail || 'Mentor Institucional'}\nAlumno: ${followUp?.studentName}\n\nTemas Previstos:\n${sessionForm.topics.map((t: string) => `• ${t}`).join('\n')}`;
        
        const attendees = [];
        const guestEmail = isMentor ? studentEmail : (mentorEmail || MENTOR_ORGANIZER_EMAIL);
        if (guestEmail) {
          attendees.push({ email: guestEmail });
        }

        const event = await createEvent({
          summary: title,
          description: details,
          start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
          end: { dateTime: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
          attendees
        });

        (data as any).calendarEventId = event.id;
        (data as any).calendarEventLink = event.htmlLink;
      }

      await updateDoc(ref, data);
      
      toast({ title: 'Datos Guardados', description: 'La sesión ha sido actualizada en el cronograma.' });
      
      setEditingSession(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: e.message || 'Verifica los permisos.' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickUploadGuide = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !followUp || !profile) return;

    setIsUploadingGuide(true);
    try {
      const guideRef = ref(storage, `followup_guides/${profile.uid}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(guideRef, file);
      const url = await getDownloadURL(uploadResult.ref);

      await updateDoc(doc(db, 'followups', followUpId), {
        planGuideUrl: url,
        updatedAt: serverTimestamp()
      });

      toast({ title: 'Guía Institucional Cargada', description: 'El documento ahora está disponible para el alumno.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al subir guía' });
    } finally {
      setIsUploadingGuide(false);
    }
  };

  const generateGoogleCalendarLink = (form: any, orderIndex: number, isAdditional: boolean) => {
    if (!form.date || !form.time) return null;
    
    try {
      const [year, month, day] = form.date.split('-');
      const [hour, minute] = form.time.split(':');
      
      const start = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
      const end = new Date(start.getTime() + (form.duration || 60) * 60000);
      
      const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, '');
      
      const title = `${isAdditional ? 'Sesión Extra' : 'Sesión ' + orderIndex}: ${followUp?.title}`;
      const details = `Programa de Mentoría: ${followUp?.goal}\n\nMentor: ${mentorEmail || 'Mentor Institucional'}\nAlumno: ${followUp?.studentName}\n\nTemas Previstos:\n${form.topics.map((t: string) => `• ${t}`).join('\n')}`;
      
      const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
      
      let guestToAdd = '';
      if (isMentor) {
        guestToAdd = studentEmail;
      } else {
        guestToAdd = mentorEmail || MENTOR_ORGANIZER_EMAIL;
      }

      const params = [
        `text=${encodeURIComponent(title)}`,
        `dates=${formatDate(start)}/${formatDate(end)}`,
        `details=${encodeURIComponent(details)}`,
        guestToAdd ? `add=${encodeURIComponent(guestToAdd)}` : ''
      ].filter(Boolean).join('&');
      
      return `${baseUrl}&${params}`;
    } catch (e) {
      return null;
    }
  };

  const handleCreateTask = async (taskForm: TaskFormData) => {
    const isFree = taskForm.type === 'free';
    const isValid = isFree ? !!taskForm.description : (taskForm.type === 'module' ? !!taskForm.courseId && !!taskForm.moduleId : !!taskForm.courseId);
    if (!isValid || !followUp) return;

    setLoading(true);
    const taskId = Math.random().toString(36).substring(2, 15);
    const taskRef = doc(db, 'followups', followUpId, 'tasks', taskId);
    
    const course = mentorCourses.find(c => c.id === taskForm.courseId);
    
    if ((taskForm.type === 'course' || taskForm.type === 'module') && taskForm.courseId) {
      const studentSnap = await getDoc(doc(db, 'users', followUp.studentId));
      const studentData = studentSnap.data();
      const targetEmail = studentData?.email?.toLowerCase().trim() || '';

      let existingEnrollment = false;

      // 1. Verificar por email si el alumno ya está inscripto
      if (targetEmail) {
        const qByEmail = query(
          collection(db, 'enrollments'),
          where('courseId', '==', taskForm.courseId),
          where('inviteEmail', '==', targetEmail)
        );
        const snapByEmail = await getDocs(qByEmail);
        if (!snapByEmail.empty) {
          existingEnrollment = true;
        }
      }

      // 2. Verificar por studentId si no se encontró por email
      if (!existingEnrollment) {
        const qById = query(
          collection(db, 'enrollments'),
          where('courseId', '==', taskForm.courseId),
          where('studentId', '==', followUp.studentId)
        );
        const snapById = await getDocs(qById);
        if (!snapById.empty) {
          existingEnrollment = true;
        }
      }

      if (!existingEnrollment) {
        const newEnrollRef = doc(collection(db, 'enrollments'));
        await setDoc(newEnrollRef, {
          id: newEnrollRef.id,
          courseId: taskForm.courseId,
          studentId: followUp.studentId,
          studentName: followUp.studentName,
          inviteEmail: targetEmail,
          status: 'active',
          enrolledAt: serverTimestamp(),
          progress: { completedModules: [] },
          progressPercent: 0
        });

        // Enviar correo de felicitación via Server Action (Admin SDK en servidor)
          if (targetEmail) {
            await sendWelcomeEmailAction(
              targetEmail,
              followUp.studentName,
              course?.title || 'tu curso',
              profile?.displayName || 'Tutor',
              profile?.email || undefined
            );
          }
      }
    }

    const taskData = {
      id: taskId,
      followUpId,
      ...taskForm,
      title: taskForm.title || (taskForm.type === 'free' ? 'Desafío Libre' : `Curso: ${course?.title}`),
      description: isFree ? taskForm.description : (taskForm.type === 'module' ? `Completar el módulo: ${taskForm.moduleTitle}` : `Completar el programa académico: ${course?.title}`),
      courseTitle: course?.title || null,
      status: 'pending',
      progress: 0,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(taskRef, taskData);
      toast({ title: 'Tarea Asignada' });
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: taskRef.path,
        operation: 'create',
        requestResourceData: taskData
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitStudentTask = async (taskId: string) => {
    if (!studentAnswer.trim() || !followUp) return;
    setIsSubmittingTask(true);
    try {
      let fileUrl = null;
      if (studentFile) {
        const fileRef = ref(storage, `followup_tasks/${followUp.studentId}/${taskId}/${Date.now()}_${studentFile.name}`);
        await uploadBytes(fileRef, studentFile);
        fileUrl = await getDownloadURL(fileRef);
      }

      const task = tasks?.find(t => t.id === taskId);

      const aiResult = await evaluateQuizPerformance({
        questions: [{
          question: task.description,
          type: 'free_response',
          correctAnswer: task.evaluationCriteria || 'Evalúa la profundidad conceptual y aplicación práctica basándote en la consigna de mentoría.'
        }],
        answers: { "0": studentAnswer },
        studentName: followUp.studentName
      });

      const taskRef = doc(db, 'followups', followUpId, 'tasks', taskId);
      await updateDoc(taskRef, {
        answer: studentAnswer,
        fileUrl,
        aiFeedback: aiResult.feedback,
        score: aiResult.score,
        progress: 100,
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });

      toast({ title: 'Tarea enviada' });
      setAnsweringTaskId(null);
      setStudentAnswer('');
      setStudentFile(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al enviar tarea' });
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleUpdateTaskProgress = async (taskId: string, progress: number, status: string) => {
    const ref = doc(db, 'followups', followUpId, 'tasks', taskId);
    await updateDoc(ref, { progress, status, updatedAt: serverTimestamp() });
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, 'followups', followUpId, 'tasks', taskId));
    toast({ title: 'Tarea eliminada' });
  };

  const filteredStudents = useMemo(() => {
    return allStudents.filter(s => {
      const matchName = (s.displayName || '').toLowerCase().includes(studentSearchTerm.toLowerCase()) || 
                        (s.email || '').toLowerCase().includes(studentSearchTerm.toLowerCase());
      const matchProgram = studentProgramFilter === 'all' || s.enrolledProducts.includes(studentProgramFilter);
      return matchName && matchProgram;
    });
  }, [allStudents, studentSearchTerm, studentProgramFilter]);

  if (followUpLoading) return <DashboardLayout><div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div></DashboardLayout>;

  const plannedSessionsList = sessions?.filter(s => !s.isAdditional) || [];
  const extraSessionsList = sessions?.filter(s => s.isAdditional) || [];
  
  const completedPlanned = plannedSessionsList.filter(s => s.isCompleted).length;
  const totalPlanned = followUp?.totalSessions || plannedSessionsList.length || 0;
  
  const completedExtra = extraSessionsList.filter(s => s.isCompleted).length;
  const totalExtra = extraSessionsList.length;

  const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
  const totalTasks = tasks?.length || 0;
  const avgProgress = totalTasks > 0 ? tasks!.reduce((acc, t) => acc + (t.progress || 0), 0) / totalTasks : 0;

  const handleAddGroupStudent = async () => {
    setAddingStudent(true);
    try {
      if (addStudentType === 'manual') {
        let finalStudentEmail = manualStudentEmail.toLowerCase().trim();
        let finalStudentName = finalStudentEmail.split('@')[0];
        
        if (!finalStudentEmail) {
          toast({ variant: 'destructive', title: 'Error', description: 'Ingresa un correo' });
          setAddingStudent(false);
          return;
        }

        const isEnrolled = groupEnrollments.some(e => e.inviteEmail === finalStudentEmail);
        if (isEnrolled) {
          toast({ variant: 'destructive', title: 'Error', description: 'El alumno ya está inscrito en esta mentoría' });
          setAddingStudent(false);
          return;
        }

        const newEnrollRef = doc(collection(db, 'enrollments'));
        await setDoc(newEnrollRef, {
          id: newEnrollRef.id,
          courseId: followUpId, 
          productId: followUpId,
          productType: 'followup',
          studentId: '',
          studentName: finalStudentName,
          inviteEmail: finalStudentEmail,
          status: 'active',
          progress: { completedModules: [], evaluations: {} },
          enrolledAt: serverTimestamp(),
        });

        toast({ title: 'Alumno Añadido a la Cohorte' });
        setIsAddStudentOpen(false);
        setManualStudentEmail('');
        setGroupEnrollments(prev => [...prev, {
          id: newEnrollRef.id,
          studentId: '',
          studentName: finalStudentName,
          inviteEmail: finalStudentEmail,
          status: 'active',
        }]);

      } else {
        const studentsToAdd = allStudents.filter(s => selectedStudentIds.includes(s.id));
        if (studentsToAdd.length === 0) {
          toast({ variant: 'destructive', title: 'Error', description: 'Selecciona al menos un alumno' });
          setAddingStudent(false);
          return;
        }

        const batch = writeBatch(db);
        const newEnrollments: any[] = [];
        
        for (const student of studentsToAdd) {
            const finalStudentEmail = student.email || '';
            const finalStudentId = student.id || '';
            
            const isEnrolled = groupEnrollments.some(e => 
                (finalStudentEmail && e.inviteEmail === finalStudentEmail) ||
                (finalStudentId && e.studentId === finalStudentId)
            );

            if (isEnrolled) continue;

            const newEnrollRef = doc(collection(db, 'enrollments'));
            batch.set(newEnrollRef, {
                id: newEnrollRef.id,
                courseId: followUpId, 
                productId: followUpId,
                productType: 'followup',
                studentId: finalStudentId,
                studentName: student.displayName || 'Alumno',
                inviteEmail: finalStudentEmail,
                status: 'active',
                progress: { completedModules: [], evaluations: {} },
                enrolledAt: serverTimestamp(),
            });

            newEnrollments.push({
                id: newEnrollRef.id,
                studentId: finalStudentId,
                studentName: student.displayName || 'Alumno',
                inviteEmail: finalStudentEmail,
                status: 'active',
            });
        }
        
        await batch.commit();

        if (newEnrollments.length > 0) {
            toast({ title: `${newEnrollments.length} alumnos añadidos a la cohorte` });
            setGroupEnrollments(prev => [...prev, ...newEnrollments]);
        } else {
            toast({ title: 'No se añadieron alumnos (ya estaban inscritos)' });
        }

        setIsAddStudentOpen(false);
        setSelectedStudentIds([]);
      }
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error al añadir alumnos' });
    } finally {
      setAddingStudent(false);
    }
  };

  const isGmailSession = studentEmail?.toLowerCase().endsWith('@gmail.com') || mentorEmail?.toLowerCase().endsWith('@gmail.com') || MENTOR_ORGANIZER_EMAIL.toLowerCase().endsWith('@gmail.com');
  const isSuspended = followUp?.status === 'suspended';

  return (
    <DashboardLayout>
      <div className={cn("space-y-8 pb-20", isSuspended && "opacity-80")}>
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-8">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" onClick={() => router.push('/seguimientos')} className="rounded-full h-12 w-12 hover:bg-secondary"><ArrowLeft className="h-6 w-6" /></Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">{followUp?.title}</h1>
                {followUp?.type === 'group' ? (
                  <Badge className="bg-primary/20 text-primary border-none px-3 py-1">Grupal (Cohorte)</Badge>
                ) : (
                  <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground px-3 py-1">1 a 1</Badge>
                )}
                <Badge variant="outline" className={cn(
                  "border-none px-3 py-1",
                  isSuspended ? "bg-danger/10 text-danger" : "bg-success/10 text-success border-success/20"
                )}>
                  {isSuspended ? <PauseCircle className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {isSuspended ? 'Suspendido' : 'En Curso'}
                </Badge>
              </div>
              <p className="text-muted-foreground font-medium flex items-center gap-2"><Target className="h-4 w-4" /> Alumno: {followUp?.studentName}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cumplimiento Plan</p>
              <p className="text-2xl font-black text-primary">{Math.round((completedPlanned / (totalPlanned || 1)) * 100)}%</p>
            </div>
          </div>
        </header>

        {isSuspended && (
          <div className="bg-danger/10 border-l-4 border-danger p-6 rounded-r-2xl flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-6 w-6 text-danger shrink-0 mt-0.5" />
            <div className="text-sm text-danger space-y-1">
              <p className="font-bold">Mentoría Suspendida Institucionalmente</p>
              <p>Este programa de acompañamiento se encuentra pausado. Las tareas y el registro de sesiones han sido inhabilitados temporalmente.</p>
            </div>
          </div>
        )}

        <div className={cn("grid lg:grid-cols-4 gap-8", isSuspended && "pointer-events-none select-none grayscale-[0.5]")}>
          <div className="lg:col-span-3 space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <TabsList className="bg-secondary/20 p-1 rounded-2xl h-auto w-full md:w-auto justify-start flex-wrap gap-2">
                  <TabsTrigger value="sessions" className="rounded-xl px-6 font-bold gap-2"><History className="h-4 w-4" /> Sesiones y Minutas</TabsTrigger>
                  <TabsTrigger value="tasks" className="rounded-xl px-6 font-bold gap-2"><Zap className="h-4 w-4" /> Plan de Acción</TabsTrigger>
                  <TabsTrigger value="report" className="rounded-xl px-6 font-bold gap-2"><BarChart3 className="h-4 w-4" /> Reporte de Avance</TabsTrigger>
                  {followUp?.type === 'group' && (
                    <TabsTrigger value="alumnos" className="rounded-xl px-6 font-bold gap-2"><Users className="h-4 w-4" /> Alumnos Inscritos</TabsTrigger>
                  )}
                </TabsList>
                {activeTab === 'sessions' && isMentor && !isSuspended && (
                  <Button onClick={handleAddAdditionalSession} disabled={loading} className="h-12 px-6 rounded-xl font-bold bg-accent text-white shadow-lg gap-2 shrink-0">
                    <Plus className="h-4 w-4" /> Sesión Extra
                  </Button>
                )}
              </div>

              <TabsContent value="sessions" className="space-y-6">
                <div className="grid gap-4">
                  {sortedSessions.map((session) => (
                    <Card key={session.id} className={cn(
                      "border-none shadow-md rounded-lg overflow-hidden transition-all",
                      session.isCompleted ? "bg-white" : "bg-muted border-2 border-dashed opacity-70",
                      session.isAdditional && !session.isCompleted && "bg-warn/10 border-warn/20"
                    )}>
                      <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm",
                            session.isCompleted 
                              ? "bg-primary text-white" 
                              : session.isAdditional 
                                ? "bg-warn text-white" 
                                : "bg-muted text-muted-foreground"
                          )}>
                            {session.isAdditional ? <Plus className="h-5 w-5" /> : session.orderIndex}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-bold text-lg">
                                {session.isCompleted 
                                  ? `Sesión Realizada: ${format(new Date(session.date + 'T' + session.time), 'dd/MM/yyyy')}` 
                                  : session.date 
                                    ? `Programada para: ${format(new Date(session.date + 'T' + session.time), 'dd/MM/yyyy HH:mm')}`
                                    : session.isAdditional ? 'Sesión Extra - Por Programar' : `Sesión ${session.orderIndex} - Pendiente`
                                }
                              </h3>
                              {session.isAdditional && <Badge className="bg-warn/15 text-warn border-none text-[8px] uppercase tracking-widest font-black">Adicional</Badge>}
                            </div>
                            <p className="text-xs font-medium text-muted-foreground">
                              {session.isCompleted ? `${session.duration} min • ${session.topics.length} temas tratados` : 'Agenda tu próximo encuentro'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {isMentor && !isSuspended && (
                            <Button onClick={() => handleEditSession(session)} variant={session.isCompleted ? 'outline' : 'default'} className="rounded-xl font-bold h-11 px-6 shadow-sm">
                              {session.isCompleted ? 'Ver / Editar Minuta' : 'Registrar Sesión'}
                            </Button>
                          )}
                          {!isMentor && session.isCompleted && (
                            <Badge className="bg-success/10 text-success border-none font-bold">Realizada</Badge>
                          )}
                        </div>
                      </div>
                      {session.isCompleted && (
                        <div className="px-6 pb-6 pt-0 space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {session.topics.map((t: string, i: number) => <Badge key={i} className="bg-primary/10 text-primary border-none text-[9px] uppercase font-bold">{t}</Badge>)}
                          </div>
                          <p className="text-sm text-muted-foreground italic line-clamp-2 bg-muted/20 p-4 rounded-xl border border-black/5 leading-relaxed">"{session.minutes}"</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-8">
                {isMentor && !isSuspended && (
                  <AssignTaskForm 
                    mentorCourses={mentorCourses} 
                    onSubmit={handleCreateTask} 
                    loading={loading} 
                  />
                )}

                <div className="space-y-4">
                  <h3 className="font-bold text-lg px-2 flex items-center gap-2 text-primary/80"><ClipboardList className="h-5 w-5" /> Plan de Acción Vigente ({tasks?.length})</h3>
                  {tasks?.map((task) => {
                    const isLinkedCourse = task.type === 'course' || task.type === 'module';
                    const isLinkedModule = task.type === 'module';
                    const enrollment = isLinkedCourse ? studentEnrollments[task.courseId] : null;
                    const courseInfo = isLinkedCourse ? mentorCourses.find(c => c.id === task.courseId) : null;
                    
                    let displayProgress = task.progress || 0;
                    let displayStatus = task.status || 'pending';
                    let displayScore = task.score;
                    let displayFeedback = task.aiFeedback;

                    if (isLinkedCourse && enrollment) {
                      if (isLinkedModule && task.moduleId) {
                        const isModuleCompleted = enrollment.progress?.completedModules?.includes(task.moduleId);
                        displayProgress = isModuleCompleted ? 100 : 0;
                        displayStatus = isModuleCompleted ? 'completed' : 'pending';
                        
                        const moduleEval = enrollment.progress?.evaluations?.[task.moduleId];
                        if (moduleEval) {
                          displayScore = moduleEval.score;
                          displayFeedback = moduleEval.feedback || "Módulo completado satisfactoriamente.";
                        }
                      } else {
                        const completedModules = enrollment.progress?.completedModules || [];
                        const totalModules = courseInfo?.modulesCount || 1;
                        displayProgress = Math.min(100, Math.round((completedModules.length / totalModules) * 100));
                        displayStatus = displayProgress >= 100 ? 'completed' : (displayProgress > 0 ? 'in_progress' : 'pending');
                        
                        if (displayProgress >= 100 && enrollment.progress?.evaluations) {
                          const evals = Object.values(enrollment.progress.evaluations) as any[];
                          if (evals.length > 0) {
                            displayScore = Math.round(evals.reduce((sum, e) => sum + (e.score || 0), 0) / evals.length);
                            displayFeedback = displayFeedback || "Programa completado satisfactoriamente según el registro de evaluaciones.";
                          }
                        }
                      }
                    }

                    return (
                      <Card key={task.id} className="p-6 rounded-3xl border-none shadow-sm bg-white hover:shadow-md transition-all relative group">
                        {isMentor && !isSuspended && displayStatus !== 'completed' && <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-destructive rounded-full hover:bg-destructive/10"><X className="h-4 w-4" /></Button>}
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-1">
                            <h4 className="font-bold text-primary text-lg leading-tight">{task.title || task.description}</h4>
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-widest bg-secondary/50 border-none">
                                {isLinkedModule ? `MÓDULO VINCULADO` : isLinkedCourse ? `VINCULADO: ${task.courseTitle}` : 'CONSIGNA LIBRE'}
                              </Badge>
                              {task.deadline && <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Clock className="h-3 w-3" /> Límite: {format(new Date(task.deadline), 'dd/MM/yyyy')}</span>}
                            </div>
                          </div>
                          <Badge className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase border-none shadow-sm",
                            displayStatus === 'completed' ? "bg-success text-white" : displayStatus === 'in_progress' ? "bg-blue-500 text-white" : "bg-warn text-white"
                          )}>
                            {displayStatus === 'completed' ? 'Completada' : displayStatus === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3 pt-4 border-t border-dashed border-black/5">
                          <div className="flex justify-between items-end mb-1">
                            <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Estado de Avance: {displayProgress}%</span>
                            {isMentor && !isLinkedCourse && !isSuspended && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-6 text-[9px] font-bold uppercase px-2 hover:bg-muted" onClick={() => handleUpdateTaskProgress(task.id, 0, 'pending')}>Reset</Button>
                                <Button size="sm" variant="ghost" className="h-6 text-[9px] font-bold uppercase px-2 text-blue-600 hover:bg-blue-50" onClick={() => handleUpdateTaskProgress(task.id, 50, 'in_progress')}>50%</Button>
                                <Button size="sm" variant="ghost" className="h-6 text-[9px] font-bold uppercase px-2 text-success hover:bg-success/10" onClick={() => handleUpdateTaskProgress(task.id, 100, 'completed')}>Listo</Button>
                              </div>
                            )}
                            {isStudent && isLinkedModule && task.status !== 'completed' && !isSuspended && (
                              <Button size="sm" onClick={() => window.open(`/courses/${task.courseId}?isolated=${task.moduleId}`, '_blank')} className="h-8 rounded-lg font-bold text-[10px] gap-2 shadow-md bg-primary">
                                <Play className="h-3 w-3" /> Comenzar Módulo
                              </Button>
                            )}
                            {isStudent && !isLinkedCourse && task.status !== 'completed' && !isSuspended && (
                              <Button size="sm" onClick={() => { setAnsweringTaskId(task.id); setStudentAnswer(''); setStudentFile(null); }} className="h-8 rounded-lg font-bold text-[10px] gap-2 shadow-md bg-primary">
                                <Plus className="h-3 w-3" /> Responder Desafío
                              </Button>
                            )}
                          </div>
                          <Progress value={displayProgress} className="h-1.5 bg-secondary/50" />
                        </div>

                        {displayStatus === 'completed' && (
                          <div className="mt-4 space-y-4 pt-4 border-t border-dashed border-black/5">
                            {!isLinkedCourse && task.answer && (
                              <div className="bg-secondary/10 p-4 rounded-xl border border-black/5">
                                <span className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">Respuesta del Alumno</span>
                                <p className="text-sm font-medium text-foreground leading-relaxed">{task.answer}</p>
                                {task.fileUrl && (
                                  <Button variant="link" size="sm" className="h-auto p-0 text-[10px] font-bold mt-2 text-primary" onClick={() => window.open(task.fileUrl, '_blank')}>
                                    <FileText className="h-3 w-3 mr-1" /> Ver Documento Adjunto
                                  </Button>
                                )}
                              </div>
                            )}
                            {(displayScore !== undefined || displayFeedback) && (
                              <div className="bg-success/10/50 p-4 rounded-xl border border-success/15 relative overflow-hidden">
                                <BrainCircuit className="absolute -right-2 -top-2 h-16 w-16 opacity-5 text-success" />
                                <h5 className="text-[10px] font-bold uppercase text-success mb-2 flex items-center gap-2">
                                  {isLinkedCourse ? <CheckCircle2 className="h-3 w-3" /> : <BrainCircuit className="h-3 w-3" />} 
                                  {isLinkedCourse ? 'Resultado Académico' : 'Evaluación IA'}
                                </h5>
                                {displayFeedback && <p className="text-sm italic text-success leading-relaxed font-medium">"{displayFeedback}"</p>}
                                {displayScore !== undefined && (
                                  <div className="mt-3 flex justify-between items-center">
                                    <Badge className="bg-success text-white border-none h-5 text-[9px] font-black">Puntaje: {displayScore}%</Badge>
                                    {task.completedAt && <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">{format(new Date(task.completedAt), 'dd/MM/yyyy HH:mm')}</span>}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="report" className="space-y-8">
                <Card className="border-none rounded-lg bg-foreground text-white overflow-hidden p-12 relative">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><Sparkles className="h-64 w-64" /></div>
                  <header className="flex justify-between items-start mb-12 relative z-10">
                    <div>
                      <h2 className="text-3xl font-headline font-bold text-white tracking-tight">Informe de Evolución</h2>
                      <p className="text-muted-foreground font-medium">Análisis de acompañamiento institucional</p>
                    </div>
                    <Badge className="bg-white/10 text-white border-white/20 h-8 px-4 font-bold uppercase tracking-widest text-[10px]">REPORTE MENTORED v1.5</Badge>
                  </header>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mb-12 relative z-10">
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center backdrop-blur-md">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Plan Original</p>
                      <p className="text-4xl font-black text-white">{completedPlanned} / {totalPlanned}</p>
                    </div>
                    <div className="p-6 bg-warn/10 rounded-3xl border border-warn/20 text-center backdrop-blur-md">
                      <p className="text-[10px] font-bold text-warn uppercase tracking-widest mb-2">Sesiones Extras</p>
                      <p className="text-4xl font-black text-warn">{completedExtra} / {totalExtra}</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center backdrop-blur-md">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Tareas Completadas</p>
                      <p className="text-4xl font-black text-white">{completedTasks} / {totalTasks}</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center backdrop-blur-md">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Progreso General</p>
                      <p className="text-4xl font-black text-success">{Math.round(avgProgress)}%</p>
                    </div>
                    <div className="p-6 bg-success text-foreground rounded-3xl shadow-success/20 text-center transform hover:scale-105 transition-transform">
                      <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-2">Estado del Plan</p>
                      <p className="text-2xl font-black uppercase">Consistente</p>
                    </div>
                  </div>

                  <div className="space-y-10 relative z-10">
                    <div className="space-y-4">
                      <h3 className="font-bold text-xl flex items-center gap-3 text-white"><Zap className="h-6 w-6 text-success" /> Logros Académicos</h3>
                      <div className="grid gap-4">
                        {tasks?.filter(t => t.status === 'completed').length === 0 ? (
                          <p className="text-muted-foreground italic text-sm py-4">Aún no se han registrado hitos completados.</p>
                        ) : tasks?.filter(t => t.status === 'completed').map(t => (
                          <div key={t.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                            <span className="font-medium text-border line-clamp-1">{t.title || t.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-bold text-xl flex items-center gap-3 text-white"><MessageSquare className="h-6 w-6 text-blue-400" /> Observaciones del Mentor</h3>
                      <ScrollArea className="h-[250px] pr-4">
                        <div className="space-y-4">
                          {sessions?.filter(s => s.isCompleted).length === 0 ? (
                            <p className="text-muted-foreground italic text-sm">No hay minutas registradas para este periodo.</p>
                          ) : sessions?.filter(s => s.isCompleted).map(s => (
                            <div key={s.id} className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/8 transition-colors">
                              <div className="flex justify-between items-center mb-3">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sesión {s.isAdditional ? 'Extra' : s.orderIndex} • {format(new Date(s.date + 'T' + s.time), 'dd/MM/yyyy')}</p>
                                {s.isAdditional && <Badge className="bg-warn/20 text-warn border-none h-4 text-[8px]">Adicional</Badge>}
                              </div>
                              <p className="text-sm text-border italic leading-relaxed">"{s.minutes}"</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {followUp?.type === 'group' && (
                <TabsContent value="alumnos" className="space-y-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-bold font-headline">Cohorte de Alumnos</h3>
                      <p className="text-muted-foreground text-sm">Gestiona los participantes de esta mentoría grupal.</p>
                    </div>
                    {isMentor && (
                      <Button onClick={() => setIsAddStudentOpen(true)} className="rounded-xl h-12 px-6 font-bold gap-2">
                        <UserPlus className="h-4 w-4" /> Añadir Alumno
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4">
                    {groupEnrollments.length === 0 ? (
                      <div className="text-center py-12 bg-secondary/5 rounded-3xl border-2 border-dashed">
                        <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h4 className="text-lg font-bold">Sin alumnos inscritos</h4>
                        <p className="text-muted-foreground">Todavía no hay alumnos asignados a esta mentoría grupal.</p>
                      </div>
                    ) : (
                      groupEnrollments.map((enroll) => (
                        <Card key={enroll.id} className="border-none shadow-sm rounded-2xl">
                          <div className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xl">
                                {(enroll.studentName || enroll.inviteEmail || 'A').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-bold">{enroll.studentName || 'Alumno Pendiente'}</h4>
                                <p className="text-sm text-muted-foreground">{enroll.inviteEmail}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className={cn("rounded-full px-4", enroll.status === 'active' ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground")}>
                              {enroll.status === 'active' ? 'Activo' : 'Pendiente'}
                            </Badge>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>

          <div className="space-y-8">
            <Card className="sticky top-8">
              <CardHeader className="bg-primary p-8 text-white border-b relative">
                <Target className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
                <CardTitle className="text-lg font-bold flex items-center gap-3 relative z-10"><Target className="h-5 w-5 text-accent" /> Objetivo del Programa</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="bg-secondary/10 p-6 rounded-3xl border-l-4 border-primary">
                  <p className="text-sm leading-relaxed text-foreground font-medium italic">"{followUp?.goal}"</p>
                </div>

                {followUp?.planGuideUrl ? (
                  <Button 
                    onClick={() => window.open(followUp.planGuideUrl, '_blank')}
                    className="w-full h-12 rounded-xl font-bold bg-success hover:bg-success text-white gap-2 shadow-lg shadow-success/20 transition-all hover:scale-[1.02]"
                  >
                    <Download className="h-4 w-4" /> Ver Guía del Plan
                  </Button>
                ) : isMentor && !isSuspended && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Documento Maestro (Plan)</Label>
                    <div className="p-4 border-2 border-dashed rounded-xl bg-secondary/5 flex flex-col items-center gap-2 relative hover:bg-secondary/10 transition-all border-primary/10">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleQuickUploadGuide}
                        disabled={isUploadingGuide}
                      />
                      {isUploadingGuide ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-primary/40" />
                          <p className="text-[10px] font-bold text-primary/60 text-center">Subir guía institucional para el alumno</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-dashed border-black/5">
                  <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <span>Cronograma Plan</span>
                    <span className="text-primary font-black">{Math.round((completedPlanned/(totalPlanned || 1))*100)}%</span>
                  </div>
                  <Progress value={(completedPlanned/(totalPlanned || 1))*100} className="h-2 bg-secondary/50" />
                  <div className="flex flex-col gap-2 text-[10px] font-bold text-muted-foreground uppercase mt-4">
                    <p className="flex items-center gap-2 bg-muted p-2 rounded-lg border border-black/5"><Calendar className="h-3.5 w-3.5 text-primary/40" /> Inicio: {followUp?.startDate ? format(new Date(followUp.startDate), 'dd/MM/yyyy') : '-'}</p>
                    <p className="flex items-center gap-2 bg-muted p-2 rounded-lg border border-black/5"><Clock className="h-3.5 w-3.5 text-primary/40" /> Fin Previsto: {followUp?.endDate ? format(new Date(followUp.endDate), 'dd/MM/yyyy') : '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Session Editor Dialog */}
      <Dialog open={!!editingSession} onOpenChange={open => !open && setEditingSession(null)}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] p-0 gap-0">
          <div className={cn("text-white flex justify-between items-center relative px-8 pt-8 pb-8 shrink-0", editingSession?.isAdditional ? "bg-warn" : "bg-primary")}>
            <div className="relative z-10">
              <DialogTitle className="text-2xl font-bold text-white">
                {editingSession?.isAdditional ? 'Sesión Extraordinaria' : `Sesión ${editingSession?.orderIndex}`}
              </DialogTitle>
              <DialogDescription className="text-white/70">Registra el avance o agenda el encuentro.</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditingSession(null)} className="rounded-full text-white hover:bg-white/10 shrink-0 relative z-10"><X className="h-6 w-6" /></Button>
            {editingSession?.isAdditional && <Zap className="absolute -right-4 -top-4 h-32 w-32 opacity-10 pointer-events-none" />}
          </div>
          <div className="space-y-8 px-8 pb-8 pt-8">
            <div className="grid sm:grid-cols-3 gap-6 relative">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Fecha Encuentro</Label>
                <Input type="date" value={sessionForm.date} onChange={e => setSessionData({...sessionForm, date: e.target.value})} className="bg-secondary/5 border font-bold rounded-xl"  size="lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Hora Inicio</Label>
                <Input type="time" value={sessionForm.time} onChange={e => setSessionData({...sessionForm, time: e.target.value})} className="bg-secondary/5 border font-bold rounded-xl"  size="lg" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Duración (Min)</Label>
                <Input type="number" value={sessionForm.duration} onChange={e => setSessionData({...sessionForm, duration: parseInt(e.target.value) || 0})} className="bg-secondary/5 border font-bold rounded-xl"  size="lg" />
              </div>
            </div>

            {/* Calendar & Availability */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold -mt-2">
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-primary" 
                onClick={() => window.open(sessionForm.calendarEventLink || 'https://calendar.google.com', '_blank')}
              >
                <CalendarDays className="h-4 w-4 mr-1" /> 
                {sessionForm.calendarEventLink ? 'Ver Evento en Google Calendar' : 'Abrir Google Calendar (Referencia)'}
              </Button>
              
              {(sessionForm.date && sessionForm.time) && (
                <div className="flex items-center gap-2 border-l pl-4 border-black/10">
                  {!isConnected ? (
                    <Button variant="ghost" size="sm" onClick={connect} className="h-8 text-primary border border-primary/20 bg-primary/5 rounded-lg">Validar Disponibilidad</Button>
                  ) : (
                    <>
                      {availabilityStatus === 'checking' && <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-3 w-3" /> Verificando...</span>}
                      {availabilityStatus === 'free' && <span className="flex items-center gap-2 text-success bg-success/10 px-3 py-1.5 rounded-lg"><CheckCircle2 className="h-4 w-4" /> Libre</span>}
                      {availabilityStatus === 'busy' && <span className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg"><X className="h-4 w-4" /> Ocupado: {conflictTitle || 'Evento existente'}</span>}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Temas Tratados / Por Tratar</Label>
              <div className="flex gap-2">
                <Input value={sessionForm.newTopic} onChange={e => setSessionData({...sessionForm, newTopic: e.target.value})} onKeyDown={e => e.key === 'Enter' && sessionForm.newTopic && setSessionData({...sessionForm, topics: [...sessionForm.topics, sessionForm.newTopic], newTopic: ''})} placeholder="Ej: Análisis FODA..." className="flex-1 bg-secondary/5 border rounded-xl"  size="lg" />
                <Button onClick={() => sessionForm.newTopic && setSessionData({...sessionForm, topics: [...sessionForm.topics, sessionForm.newTopic], newTopic: ''})} className="h-12 px-6 rounded-xl font-bold bg-primary shadow-md"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {sessionForm.topics.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic ml-1">No se han definido temas aún.</p>
                ) : sessionForm.topics.map((t, i) => (
                  <Badge key={i} className="bg-primary/10 text-primary border-none py-1.5 px-4 rounded-xl gap-2 font-bold group shadow-sm">
                    {t}
                    <button onClick={() => setSessionData({...sessionForm, topics: sessionForm.topics.filter((_, idx) => idx !== i)})} className="hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Minuta / Conclusiones Académicas</Label>
              <Textarea value={sessionForm.minutes} onChange={e => setSessionData({...sessionForm, minutes: e.target.value})} placeholder="Registra las conclusiones una vez terminada la sesión..." className="min-h-[150px] p-6 bg-secondary/5 border rounded-xl leading-relaxed text-sm" />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary/5 rounded-xl border border-dashed border-primary/10">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <Label className="text-xs font-bold cursor-pointer" htmlFor="toggle-completed">Marcar Sesión como Completada</Label>
              </div>
              <Switch id="toggle-completed" checked={sessionForm.isCompleted} onCheckedChange={(val) => setSessionData({...sessionForm, isCompleted: val})} />
            </div>

            <DialogFooter>
              <Button onClick={handleSaveSession} disabled={loading || !sessionForm.date || !sessionForm.time || availabilityStatus === 'busy'} className="w-full h-14 rounded-xl font-bold text-lg shadow-sm bg-primary text-white">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} {sessionForm.isCompleted ? 'Finalizar Sesión' : 'Guardar y Agendar'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Task Response Dialog */}
      <Dialog open={!!answeringTaskId} onOpenChange={open => !open && setAnsweringTaskId(null)}>
        <DialogContent className="mw-2xl">
          <div className="flex justify-between items-center relative px-8 pt-8">
            <div className="relative z-10">
              <DialogTitle className="text-2xl font-bold">Enviar Respuesta</DialogTitle>
              <DialogDescription className="text-muted-foreground">Tu respuesta será analizada integralmente por la IA institucional.</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setAnsweringTaskId(null)} className="rounded-full text-muted-foreground hover:bg-muted shrink-0 relative z-10"><X className="h-6 w-6" /></Button>
            <BrainCircuit className="absolute -right-4 -top-4 h-32 w-32 opacity-10 pointer-events-none" />
          </div>
          <div className="space-y-6 px-8 pb-8">
            <div className="bg-accent/5 p-6 rounded-xl border border-accent/10">
              <p className="text-xs font-black text-accent uppercase tracking-[0.2em] mb-2">Consigna Académica:</p>
              <p className="text-sm font-medium italic text-foreground leading-relaxed">"{tasks?.find(t => t.id === answeringTaskId)?.description}"</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Tu Análisis / Desarrollo</Label>
              <Textarea 
                value={studentAnswer} 
                onChange={e => setStudentAnswer(e.target.value)} 
                placeholder="Escribe aquí tu respuesta detallada, reflexiones y hallazgos..." 
                className="min-h-[200px] rounded-xl p-6 bg-secondary/5 border leading-relaxed text-sm" 
              />
            </div>

            {tasks?.find(t => t.id === answeringTaskId)?.allowFileUpload && (
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Documento de Respaldo (PDF)</Label>
                <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center gap-3 relative bg-muted/5 group hover:bg-muted/10 transition-all border-accent/20">
                  <input 
                    type="file" 
                    accept=".pdf" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={e => setStudentFile(e.target.files?.[0] || null)} 
                  />
                  <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                    {studentFile ? <FileText className="text-accent h-7 w-7" /> : <Upload className="text-accent h-7 w-7" />}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground">{studentFile ? studentFile.name : 'Seleccionar Archivo PDF'}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">El archivo será leído por Gemini para integrarlo a tu feedback.</p>
                  </div>
                  {studentFile && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-8 w-8 rounded-full text-muted-foreground hover:text-destructive z-10"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStudentFile(null); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button onClick={() => handleSubmitStudentTask(answeringTaskId!)} disabled={isSubmittingTask || !studentAnswer.trim()} className="w-full h-16 rounded-xl font-bold text-xl bg-accent hover:bg-accent/90 transition-all hover:scale-[1.01] shadow-none">
                {isSubmittingTask ? <><Loader2 className="animate-spin mr-2 h-6 w-6" /> Procesando con Gemini...</> : <><Send className="mr-3 h-6 w-6" /> Enviar para Evaluación IA</>}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Añadir Alumno a Grupo */}
      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
        <DialogContent className="mw-md">
          <DialogHeader className="text-left">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><UserPlus className="text-primary h-6 w-6" /></div>
            <DialogTitle className="text-xl md:text-2xl font-bold">Añadir Alumno</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Inscribe un nuevo participante a la cohorte.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="flex bg-secondary/10 p-1 rounded-2xl border-2 border-transparent">
              <Button onClick={() => setAddStudentType('select')} variant="ghost" className={cn("flex-1 h-12 rounded-xl font-bold text-xs", addStudentType === 'select' ? "bg-white shadow-sm border" : "text-muted-foreground")}>Base de Datos</Button>
              <Button onClick={() => setAddStudentType('manual')} variant="ghost" className={cn("flex-1 h-12 rounded-xl font-bold text-xs", addStudentType === 'manual' ? "bg-white shadow-sm border" : "text-muted-foreground")}>Ingreso Manual</Button>
            </div>

            {addStudentType === 'select' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Buscar Alumno</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Nombre o correo..." 
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        className="pl-10 h-12 bg-secondary/5 border-2 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Filtrar por Programa</Label>
                    <Select onValueChange={setStudentProgramFilter} value={studentProgramFilter}>
                      <SelectTrigger className="h-12 bg-secondary/5 border-2 rounded-xl px-4">
                        <SelectValue placeholder="Todos los programas" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px] rounded-xl">
                        <SelectItem value="all" className="font-bold">Todos los programas</SelectItem>
                        {[...mentorCourses, ...mentorFollowUps].map(p => (
                          <SelectItem key={p.id} value={p.id} className="py-2">
                            {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-2 rounded-2xl overflow-hidden bg-secondary/5">
                  <ScrollArea className="h-[280px]">
                    {filteredStudents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm font-bold text-muted-foreground">No se encontraron alumnos</p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {filteredStudents.map(s => (
                          <div 
                            key={s.id} 
                            onClick={() => setSelectedStudentIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                              selectedStudentIds.includes(s.id) ? "bg-primary text-white border-primary shadow-md" : "hover:bg-white border-transparent hover:border-black/5"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                              selectedStudentIds.includes(s.id) ? "bg-white/20" : "bg-primary/10 text-primary"
                            )}>
                              {(s.displayName || s.email || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{s.displayName}</p>
                              <p className={cn("text-[10px] truncate", selectedStudentIds.includes(s.id) ? "text-white/70" : "text-muted-foreground")}>{s.email}</p>
                            </div>
                            {selectedStudentIds.includes(s.id) && <CheckCircle2 className="h-5 w-5 shrink-0" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Correo Electrónico (Email)</Label>
                <Input 
                  type="email" 
                  value={manualStudentEmail} 
                  onChange={e => setManualStudentEmail(e.target.value)} 
                  placeholder="alumno@ejemplo.com" 
                  className="h-14 bg-secondary/5 border-2 rounded-2xl px-4" 
                />
                <p className="text-[10px] text-muted-foreground italic ml-1">Si el correo no existe, se creará un acceso temporal para el alumno.</p>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button onClick={handleAddGroupStudent} disabled={addingStudent || (addStudentType === 'manual' ? !manualStudentEmail : selectedStudentIds.length === 0)} className="w-full h-14 rounded-2xl text-lg font-bold shadow-sm">
                {addingStudent ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />} Inscribir a la Cohorte
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
