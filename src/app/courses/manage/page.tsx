'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, deleteDoc, getDocs, updateDoc, setDoc, serverTimestamp, getDoc, orderBy, getCountFromServer, writeBatch } from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  MoreHorizontal, 
  Loader2, 
  Users, 
  Search, 
  Power, 
  PowerOff, 
  Pencil, 
  Palette, 
  Mail, 
  UserPlus, 
  ShieldAlert, 
  Globe, 
  ShieldCheck, 
  ShieldX, 
  Clock, 
  BrainCircuit, 
  Scale,
  CheckCircle2,
  History,
  AlertTriangle,
  Tags,
  Link2,
  ArrowRight,
  Sparkles,
  Check,
  X,
  FileText
} from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ScrollArea } from '@/components/ui/scroll-area';
import { moderateCourseContent } from '@/ai/flows/moderate-content-flow';
import { extractDocumentText } from '@/ai/flows/extract-document-text-flow';
import { generateTagSuggestions } from '@/ai/flows/generate-tag-suggestions';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

function CourseStatsCells({ courseId }: { courseId: string }) {
  const db = useFirestore();
  const [stats, setStats] = useState({ modules: 0, enrolled: 0, completed: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [modSnap, enrollSnap] = await Promise.all([
          getDocs(collection(db, 'courses', courseId, 'modules')),
          getDocs(query(collection(db, 'enrollments'), where('courseId', '==', courseId)))
        ]);
        const enrolls = enrollSnap.docs.map(d => d.data());
        setStats({
          modules: modSnap.size,
          enrolled: enrolls.length,
          completed: enrolls.filter(e => e.status === 'completed').length
        });
      } catch (e) {}
    };
    fetchStats();
  }, [db, courseId]);

  return (
    <>
      <TableCell className="text-center font-semibold text-foreground/80">{stats.modules}</TableCell>
      <TableCell className="text-center font-semibold text-foreground/80">{stats.enrolled}</TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] h-5 px-1.5">
          {stats.enrolled > 0 ? Math.round((stats.completed / stats.enrolled) * 100) : 0}%
        </Badge>
      </TableCell>
    </>
  );
}

function EnrollmentRow({ enrollment, onApprove, onToggleStatus, onDelete }: { 
  enrollment: any, 
  onApprove: (id: string) => void, 
  onToggleStatus: (id: string, current: string) => void,
  onDelete: (id: string) => void
}) {
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const db = useFirestore();

  useEffect(() => {
    if (enrollment.studentId) {
      getDoc(doc(db, 'users', enrollment.studentId)).then(snap => {
        if (snap.exists()) setStudentProfile(snap.data());
      });
    }
  }, [db, enrollment.studentId]);

  return (
    <div className={cn("flex flex-col gap-2 p-3 bg-white rounded border transition-colors", enrollment.isInvited ? "border-amber-400 bg-amber-50/20 shadow-sm" : "border-border/50 hover:border-accent/30")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded flex items-center justify-center font-bold text-xs uppercase border", enrollment.isInvited ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-primary/5 text-primary")}>
            {enrollment.studentName?.[0] || <Mail className="h-3 w-3" />}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-xs text-foreground truncate max-w-[150px]">{enrollment.studentName || 'Alumno'}</p>
              {studentProfile?.signInProvider === 'google.com' && <Globe className="h-2.5 w-2.5 text-accent" />}
              {(enrollment.isInvited || enrollment.isDirect) && (
                <Badge className={cn(
                  "border-none text-[8px] h-4 px-1.5 uppercase font-bold tracking-widest shadow-none",
                  enrollment.isDirect ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                )}>
                  {enrollment.isDirect ? 'Carga Directa' : 'Invitado'}
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{enrollment.inviteEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {enrollment.status === 'pending' ? (
            <Button size="sm" variant="default" className="h-7 text-[10px] px-3 font-bold bg-accent hover:bg-accent/90" onClick={() => onApprove(enrollment.id)}>Validar</Button>
          ) : (
            <div className="flex items-center gap-2 px-2 py-1 bg-secondary/30 rounded border">
              <span className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground">{enrollment.status === 'active' ? 'Acceso OK' : 'Bloqueado'}</span>
              <Switch checked={enrollment.status === 'active'} onCheckedChange={() => onToggleStatus(enrollment.id, enrollment.status)} className="scale-75" />
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full"><MoreHorizontal className="h-3 w-3" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => onDelete(enrollment.id)} className="text-destructive font-bold"><Trash2 className="h-3 w-3 mr-2" /> Eliminar Inscripción</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default function ManageCoursesPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEnrollmentsDialogOpen, setIsEnrollmentsDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isAssociatedDialogOpen, setIsAssociatedDialogOpen] = useState(false);
  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [moderationLogs, setModerationLogs] = useState<any[]>([]);
  const [loadingInscriptions, setLoadingInscriptions] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [isInvitation, setIsInvitation] = useState(false);
  const [isAuditing, setIsAuditing] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [associatedSearchTerm, setAssociatedSearchTerm] = useState('');
  const [tempAssociatedIds, setTempAssociatedIds] = useState<string[]>([]);
  const [isSavingAssociations, setIsSavingAssociations] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isUpdatingTerms, setIsUpdatingTerms] = useState(false);

  // AI Tag states
  const [isAiTagDialogOpen, setIsAiTagDialogOpen] = useState(false);
  const [branchInput, setBranchInput] = useState('');
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [aiTagSuggestions, setAiTagSuggestions] = useState<any[]>([]);
  const [selectedAiTags, setSelectedAiTags] = useState<string[]>([]);
  const [isSavingAiTags, setIsSavingAiTags] = useState(false);

  const clearUILocks = useCallback(() => {
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
    document.documentElement.style.pointerEvents = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.removeAttribute('inert');
    document.body.classList.remove('pointer-events-none');
    document.documentElement.classList.remove('pointer-events-none');
  }, []);

  useEffect(() => {
    if (!isDeleteDialogOpen && !isEnrollmentsDialogOpen && !isHistoryDialogOpen && !isPublishDialogOpen && !isAssociatedDialogOpen && !isAiTagDialogOpen && !isTermsDialogOpen) {
      const timer = setTimeout(clearUILocks, 300);
      return () => clearTimeout(timer);
    }
  }, [isDeleteDialogOpen, isEnrollmentsDialogOpen, isHistoryDialogOpen, isPublishDialogOpen, isAssociatedDialogOpen, isAiTagDialogOpen, isTermsDialogOpen, clearUILocks]);

  // Completely disabled to prevent Firestore errors
  const modConfigRef = useMemoFirebase(() => doc(db, 'config', 'moderation'), [db]);
  const { data: modConfig } = { data: null };

  const termsConfigRef = useMemoFirebase(() => doc(db, 'config', 'terms_courses'), [db]);
  const { data: termsConfig } = { data: null };

  const tagsQuery = useMemoFirebase(() => query(collection(db, 'tags')), [db]);
  // Completely disabled to prevent Firestore errors
  const { data: rawTags } = { data: [] };

  const allTags = useMemo(() => {
    return [];
  }, []);

  const isAdmin = profile?.roles.includes('admin');
  const isMentor = profile?.roles.includes('mentor');
  const hasPermission = isAdmin || isMentor;

  const coursesQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    const coursesRef = collection(db, 'courses');
    if (isAdmin) return query(coursesRef);
    return query(coursesRef, where('mentorId', '==', profile.uid));
  }, [db, profile?.uid, isAdmin]);

  // Consulta a Firestore restaurada para mostrar cursos
  const { data: courses, isLoading } = useCollection(coursesQuery);

  const sub = profile?.subscription;
  const isExpired = sub ? new Date(sub.endDate) < new Date() : true;
  const limitCount = sub?.maxSimultaneousCourses || 0;
  const activeCount = courses?.filter((c: any) => c.isActive !== false).length || 0;

  const handleNewCourse = () => {
    if (isAdmin) {
      router.push('/courses/create');
      return;
    }

    // Verificar límites de suscripción
    if (isExpired) {
      setUpgradeDialogOpen(true);
      return;
    }

    if (activeCount >= limitCount) {
      toast({
        variant: 'destructive',
        title: 'Límite de cursos alcanzado',
        description: `Tu plan actual permite ${limitCount} cursos simultáneos. Actualiza tu plan para crear más.`
      });
      setUpgradeDialogOpen(true);
      return;
    }

    // Permitir crear curso
    router.push('/courses/create');
  };

  const handleGenerateAiTags = async () => {
    if (!branchInput.trim()) return;
    setIsGeneratingTags(true);
    setAiTagSuggestions([]);
    setSelectedAiTags([]);

    try {
      const existingNames = allTags?.map((t: any) => t.name.toLowerCase()) || [];
      const result = await generateTagSuggestions({
        branch: branchInput,
        existingTags: existingNames
      });

      const uniqueSuggestions = result.suggestions.filter(s => 
        !existingNames.includes(s.name.toLowerCase())
      );

      setAiTagSuggestions(uniqueSuggestions);
      if (uniqueSuggestions.length === 0) {
        toast({ title: 'Sin novedades', description: 'La IA no encontró nuevas categorías SEO para esta rama.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error de generación', description: 'No se pudo conectar con Gemini.' });
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleLoadAiSelectedTags = async () => {
    if (selectedAiTags.length === 0) return;
    setIsSavingAiTags(true);
    try {
      const batch = writeBatch(db);
      const newTagIds: string[] = [];

      for (const name of selectedAiTags) {
        const suggestion = aiTagSuggestions.find(s => s.name === name);
        if (suggestion) {
          const newTagRef = doc(collection(db, 'tags'));
          batch.set(newTagRef, {
            ...suggestion,
            id: newTagRef.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          newTagIds.push(newTagRef.id);
        }
      }
      
      await batch.commit();
      setSelectedTags(prev => [...prev, ...newTagIds]);
      toast({ title: 'Taxonomía SEO Actualizada', description: `Se han incorporado ${newTagIds.length} etiquetas clave.` });
      setIsAiTagDialogOpen(false);
      setAiTagSuggestions([]);
      setBranchInput('');
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'tags',
        operation: 'create',
        requestResourceData: { tags: selectedAiTags }
      }));
    } finally {
      setIsSavingAiTags(false);
    }
  };

  const sortedInscriptions = [...inscriptions].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return 0;
  });

  const handleDeleteConfirm = () => {
    if (!selectedId) return;
    const docRef = doc(db, 'courses', selectedId);
    deleteDoc(docRef).then(() => {
      toast({ title: 'Curso eliminado' });
      setIsDeleteDialogOpen(false);
    }).catch(async (error: any) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
    });
  };

  const handleManualAudit = async (course: any, currentTags?: string[]) => {
    setIsAuditing(course.id);
    try {
      const modulesSnap = await getDocs(query(collection(db, 'courses', course.id, 'modules')));
      const modules = modulesSnap.docs.map(d => d.data());
      const allQuestions: string[] = [];
      const masterContents: string[] = [];

      for (const m of modules) {
        if (m.questions) m.questions.forEach((q: any) => allQuestions.push(q.question));
        if (m.supportQuestions) m.supportQuestions.forEach((q: any) => allQuestions.push(q.question));
        const masterDoc = m.supportMaterials?.find((mat: any) => mat.isMaster);
        if (masterDoc?.content) {
          try {
            const extraction = await extractDocumentText({ documentUrl: masterDoc.content, documentName: masterDoc.name });
            if (extraction.extractedText) masterContents.push(extraction.extractedText);
          } catch (e) {}
        }
      }

      const modResult = await moderateCourseContent({
        courseTitle: course.title,
        courseDescription: course.description || '',
        moduleTitles: modules.map(m => m.title),
        masterContent: masterContents.join('\n\n---\n\n'),
        questions: allQuestions,
        sensitiveTopics: modConfig?.sensitiveTopics || []
      });

      const logRef = doc(collection(db, 'moderation-logs'));
      const logData = {
        id: logRef.id,
        courseId: course.id,
        courseTitle: course.title,
        isSensitive: modResult.isSensitive,
        flaggedTopics: modResult.flaggedTopics,
        reason: modResult.reason,
        auditedBy: profile?.uid,
        createdAt: serverTimestamp()
      };
      await setDoc(logRef, logData);

      const finalStatus = modResult.isSensitive ? 'pending' : 'published';
      const updateData: any = { 
        status: finalStatus,
        isActive: finalStatus === 'published',
        publicListing: finalStatus === 'published',
        moderationReason: modResult.isSensitive ? modResult.reason : null,
        updatedAt: serverTimestamp() 
      };

      if (currentTags) {
        updateData.tagIds = currentTags;
      }

      await updateDoc(doc(db, 'courses', course.id), updateData);

      toast({ 
        title: modResult.isSensitive ? 'Alerta de Seguridad' : 'Auditoría Completada',
        description: modResult.isSensitive ? 'Se detectaron temas sensibles. Consulta el historial.' : 'El contenido es apto para el catálogo.'
      });
      return finalStatus;
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error en Auditoría' });
      return null;
    } finally {
      setIsAuditing(null);
    }
  };

  const openPublishDialog = (course: any) => {
    // Si el curso nunca ha aceptado términos, abrimos el flujo legal primero
    if (!course.termsAccepted || course.status === 'pending_terms') {
      setSelectedCourse(course);
      setTermsAccepted(false);
      setIsTermsDialogOpen(true);
      return;
    }
    
    if (course.isActive) {
      const courseRef = doc(db, 'courses', course.id);
      updateDoc(courseRef, { isActive: false }).then(() => {
        toast({ title: 'Curso Ocultado' });
      }).catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: courseRef.path,
          operation: 'update',
          requestResourceData: { isActive: false }
        }));
      });
      return;
    }

    setSelectedCourse(course);
    setSelectedTags(course.tagIds || []);
    setIsPublishDialogOpen(true);
  };

  const handleAcceptTermsInManage = async () => {
    if (!selectedCourse || !termsAccepted) return;
    setIsUpdatingTerms(true);
    try {
      const courseRef = doc(db, 'courses', selectedCourse.id);
      const updateData = {
        termsAccepted: true,
        termsAcceptedAt: serverTimestamp(),
        status: 'draft', // Cambiamos de pending_terms a draft
        updatedAt: serverTimestamp()
      };
      await updateDoc(courseRef, updateData);
      
      toast({ title: 'Protocolo Aceptado' });
      setIsTermsDialogOpen(false);
      
      // Una vez aceptados, abrimos el diálogo de publicación (SEO)
      setSelectedTags(selectedCourse.tagIds || []);
      setIsPublishDialogOpen(true);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al actualizar términos' });
    } finally {
      setIsUpdatingTerms(false);
    }
  };

  const confirmPublication = async () => {
    if (!selectedCourse) return;
    setIsPublishDialogOpen(false);
    toast({ title: 'Iniciando Auditoría IA', description: 'Validando contenido antes de publicar...' });
    await handleManualAudit(selectedCourse, selectedTags);
  };

  const openAssociatedDialog = (course: any) => {
    setSelectedCourse(course);
    setSelectedId(course.id);
    setTempAssociatedIds(course.associatedCourseIds || []);
    setAssociatedSearchTerm('');
    setIsAssociatedDialogOpen(true);
  };

  const saveAssociations = async () => {
    if (!selectedId) return;
    setIsSavingAssociations(true);
    const ref = doc(db, 'courses', selectedId);
    const updateData = { 
      associatedCourseIds: tempAssociatedIds,
      updatedAt: serverTimestamp() 
    };
    updateDoc(ref, updateData).then(() => {
      toast({ title: 'Ruta de aprendizaje actualizada' });
      setIsAssociatedDialogOpen(false);
    }).catch(async (e) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: ref.path,
        operation: 'update',
        requestResourceData: updateData
      }));
    }).finally(() => setIsSavingAssociations(false));
  };

  const toggleAssociation = (id: string) => {
    setTempAssociatedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleApproveTerms = (courseId: string) => {
    if (!isAdmin) return;
    const courseRef = doc(db, 'courses', courseId);
    const updateData = { 
      status: 'draft', 
      termsAccepted: true, 
      termsAcceptedAt: serverTimestamp(), 
      updatedAt: serverTimestamp() 
    };
    updateDoc(courseRef, updateData).then(() => toast({ title: 'Términos Validados Administrativamente' }))
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: courseRef.path,
          operation: 'update',
          requestResourceData: updateData
        }));
      });
  };

  const handleModerateCourse = (courseId: string, approved: boolean) => {
    if (!isAdmin) return;
    const courseRef = doc(db, 'courses', courseId);
    const updateData = { 
      status: approved ? 'published' : 'rejected', 
      isActive: approved, 
      publicListing: approved, 
      updatedAt: serverTimestamp() 
    };
    updateDoc(courseRef, updateData)
      .then(() => toast({ title: approved ? 'Curso Autorizado' : 'Curso Rechazado' }))
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: courseRef.path,
          operation: 'update',
          requestResourceData: updateData
        }));
      });
  };

  const openEnrollments = async (course: any) => {
    setSelectedId(course.id);
    setSelectedCourse(course);
    setIsEnrollmentsDialogOpen(true);
    setLoadingInscriptions(true);
    try {
      const q = query(collection(db, 'enrollments'), where('courseId', '==', course.id));
      const snap = await getDocs(q);
      setInscriptions(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    } finally { setLoadingInscriptions(false); }
  };

  const handleApproveEnrollment = async (enrollId: string) => {
    const ref = doc(db, 'enrollments', enrollId);
    const updateData = { status: 'active', approvedAt: serverTimestamp() };
    updateDoc(ref, updateData)
      .then(() => {
        setInscriptions(prev => prev.map(ins => ins.id === enrollId ? { ...ins, status: 'active' } : ins));
        toast({ title: 'Inscripción aprobada' });
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ref.path,
          operation: 'update',
          requestResourceData: updateData
        }));
      });
  };

  const handleToggleEnrollmentStatus = async (enrollId: string, current: string) => {
    const nextStatus = current === 'active' ? 'blocked' : 'active';
    const ref = doc(db, 'enrollments', enrollId);
    const updateData = { status: nextStatus };
    updateDoc(ref, updateData)
      .then(() => {
        setInscriptions(prev => prev.map(ins => ins.id === enrollId ? { ...ins, status: nextStatus } : ins));
        toast({ title: nextStatus === 'active' ? 'Acceso restaurado' : 'Acceso suspendido' });
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ref.path,
          operation: 'update',
          requestResourceData: updateData
        }));
      });
  };

  const handleDeleteEnrollment = async (enrollId: string) => {
    const ref = doc(db, 'enrollments', enrollId);
    deleteDoc(ref)
      .then(() => {
        setInscriptions(prev => prev.filter(ins => ins.id !== enrollId));
        toast({ title: 'Inscripción eliminada' });
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ref.path,
          operation: 'delete'
        }));
      });
  };

  const openModerationHistory = async (course: any) => {
    setSelectedId(course.id);
    setSelectedCourse(course);
    setIsHistoryDialogOpen(true);
    setLoadingLogs(true);
    try {
      const q = query(
        collection(db, 'moderation-logs'), 
        where('courseId', '==', course.id)
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      // Sort in memory
      logs.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      setModerationLogs(logs);
    } finally { setLoadingLogs(false); }
  };

  const handleInviteStudent = async () => {
    if (!inviteEmail || !selectedId || !profile?.uid) return;
    setAddingStudent(true);
    try {
      const normalizedEmail = inviteEmail.toLowerCase().trim();
      
      // 1. Si es INVITACIÓN, verificar límite del plan
      if (isInvitation && !isAdmin) {
        const limitCount = sub?.invitationsPerCourse || 0;
        const q = query(
          collection(db, 'enrollments'), 
          where('courseId', '==', selectedId)
        );
        const snap = await getDocs(q);
        const invitedCount = snap.docs.filter(d => d.data().isInvited === true).length;
        if (invitedCount >= limitCount) {
          throw new Error(`Has alcanzado el límite de ${limitCount} invitados por curso de tu plan.`);
        }
      }

      // 2. Identificar o pre-registrar al alumno
      let studentId = '';
      let studentName = normalizedEmail.split('@')[0];
      
      const userQ = query(collection(db, 'users'), where('email', '==', normalizedEmail));
      const userSnap = await getDocs(userQ);
      
      if (!userSnap.empty) {
        studentId = userSnap.docs[0].id;
        studentName = userSnap.docs[0].data().displayName || studentName;
      } else {
        const tempId = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
        studentId = tempId;
        const newUser = {
          uid: studentId,
          email: normalizedEmail,
          displayName: studentName,
          roles: ['alumno'],
          isActive: true,
          isPreRegistered: true,
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', studentId), newUser);
      }

      // 3. Crear inscripción (Carga Directa vs Invitación)
      const newEnrollRef = doc(collection(db, 'enrollments'));
      const enrollmentData = {
        id: newEnrollRef.id,
        courseId: selectedId,
        studentId: studentId,
        studentName: studentName,
        inviteEmail: normalizedEmail,
        status: 'active',
        isInvited: isInvitation, 
        isDirect: !isInvitation, // Si no es invitación, es carga directa (se factura)
        enrolledAt: serverTimestamp(),
        progress: { completedModules: [] }
      };

      await setDoc(newEnrollRef, enrollmentData);

      setInscriptions(prev => [enrollmentData, ...prev]);
      setInviteEmail('');
      toast({ title: isInvitation ? 'Invitación enviada exitosamente' : 'Alumno cargado exitosamente' });
    } catch (err: any) {
      const isLimit = err.message.includes('límite') || err.message.includes('limit');
      toast({ 
        variant: 'destructive', 
        title: isLimit ? 'Límite de Invitaciones' : 'Error de Permisos o Red', 
        description: err.message.includes('permission') ? 'Tu usuario no tiene permisos suficientes para dar de alta alumnos.' : err.message 
      });
    } finally {
      setAddingStudent(false);
    }
  };

  const handleEditClick = (course: any) => {
    if (course.isActive) {
      toast({
        variant: 'destructive',
        title: 'Curso Publicado',
        description: 'Debes ocultar el curso del catálogo antes de editarlo. Esto asegura que los nuevos cambios pasen por la auditoría institucional al republicar.'
      });
      return;
    }
    router.push(`/courses/edit/${course.id}`);
  };

  const filteredCourses = courses?.filter(c => c.title?.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const otherCourses = courses?.filter(c => c.id !== selectedId && (isAdmin || c.mentorId === profile?.uid));
  const filteredOtherCourses = otherCourses?.filter(c => c.title?.toLowerCase().includes(associatedSearchTerm.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div><h1 className="text-2xl font-bold text-foreground">Gestión Académica</h1><p className="text-sm text-muted-foreground">Administración central de programas.</p></div>
          <div className="flex gap-3 items-center">
            <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-10 rounded-md bg-white" /></div>
            {isMentor && (
              <Button onClick={handleNewCourse} className="h-10 px-5 rounded-md font-bold text-sm gap-2">
                <Plus className="h-4 w-4" /> Nuevo Curso
              </Button>
            )}
          </div>
        </header>

        <Card className="border rounded-md overflow-hidden bg-white shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/50 border-b">
                <TableRow className="border-none">
                  <TableHead className="font-bold py-4 px-6 text-foreground text-[11px] uppercase tracking-wider">Programa</TableHead>
                  <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Clases</TableHead>
                  <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Alumnos</TableHead>
                  <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Cumplimiento</TableHead>
                  <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Catálogo</TableHead>
                  <TableHead className="text-right py-4 px-6 text-foreground text-[11px] uppercase tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground animate-pulse font-medium">Sincronizando...</TableCell></TableRow>
                ) : filteredCourses?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-20 italic text-muted-foreground">Sin registros.</TableCell></TableRow>
                ) : filteredCourses?.map((course) => {
                  const isOwner = course.mentorId === profile?.uid;
                  return (
                    <TableRow key={course.id} className="hover:bg-secondary/20 border-b transition-colors">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-10 h-10 rounded bg-muted overflow-hidden border shrink-0">
                            <Image 
                              src={course.thumbnail || `https://loremflickr.com/100/100/education,course?lock=${course.id}`} 
                              alt="Cover" 
                              fill 
                              className="object-cover" 
                              unoptimized 
                            />
                          </div>
                          <div><p className="font-bold text-sm text-foreground line-clamp-1">{course.title}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {course.tagIds?.length > 0 ? course.tagIds.map((tid: string) => {
                                const tag = allTags?.find((t: any) => t.id === tid);
                                return tag ? <Badge key={tid} variant="outline" className="text-[8px] h-3 px-1 border-primary/20 text-primary/70">{tag.name}</Badge> : null;
                              }) : <span className="text-[8px] text-muted-foreground italic font-bold">Sin etiquetas</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <CourseStatsCells courseId={course.id} />
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[9px] uppercase tracking-widest px-2 h-5",
                          course.status === 'published' || course.status === 'approved' ? "bg-emerald-50 text-emerald-700" 
                          : course.status === 'pending' ? "bg-amber-50 text-amber-700 animate-pulse"
                          : course.status === 'pending_terms' ? "bg-rose-50 text-rose-700"
                          : "bg-muted text-muted-foreground"
                        )}>
                          {course.status === 'published' || course.status === 'approved' ? <ShieldCheck className="h-2 w-2 mr-1" /> : course.status === 'pending_terms' ? <Scale className="h-2 w-2 mr-1" /> : <Clock className="h-2 w-2 mr-1" />}
                          {course.status === 'pending_terms' ? 'Sin Términos' : (course.status === 'published' ? 'publicado' : course.status || 'draft')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={course.isActive ? 'default' : 'outline'} className={cn("text-[9px] px-2 h-5", course.isActive ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground")}>{course.isActive ? 'Público' : 'Privado'}</Badge>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 text-xs font-bold">
                            {isAdmin && (
                              <>
                                <DropdownMenuItem onSelect={() => handleManualAudit(course)} disabled={isAuditing === course.id} className="cursor-pointer gap-2 py-2 text-primary">
                                  {isAuditing === course.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />} Auditoría IA Profunda
                                </DropdownMenuItem>
                                {course.status === 'pending_terms' && (
                                  <DropdownMenuItem onSelect={() => handleApproveTerms(course.id)} className="cursor-pointer gap-2 py-2 text-amber-600"><CheckCircle2 className="h-3.5 w-3.5" /> Aprobar Términos</DropdownMenuItem>
                                )}
                                {course.status === 'pending' && (
                                  <>
                                    <DropdownMenuItem onSelect={() => handleModerateCourse(course.id, true)} className="cursor-pointer gap-2 py-2 text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" /> Autorizar Curso</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleModerateCourse(course.id, false)} className="cursor-pointer gap-2 py-2 text-rose-600"><ShieldX className="h-3.5 w-3.5" /> Rechazar Contenido</DropdownMenuItem>
                                  </>
                                )}
                                {!isOwner && <DropdownMenuSeparator />}
                              </>
                            )}
                            {(isOwner || isAdmin) && (
                              <DropdownMenuItem onSelect={() => openModerationHistory(course)} className="cursor-pointer gap-2 py-2 text-slate-600">
                                <History className="h-3.5 w-3.5" /> Historial de Auditoría
                              </DropdownMenuItem>
                            )}
                            {isOwner && (
                              <>
                                <DropdownMenuItem onSelect={() => handleEditClick(course)} className="cursor-pointer gap-2 py-2">
                                  <Pencil className="h-3.5 w-3.5" /> Editar Contenido
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => router.push(`/courses/style/${course.id}`)} className="cursor-pointer gap-2 py-2">
                                  <Palette className="h-3.5 w-3.5 text-primary" /> Identidad Visual (Marca)
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openAssociatedDialog(course)} className="cursor-pointer gap-2 py-2">
                                  <Link2 className="h-3.5 w-3.5 text-blue-500" /> Cursos Asociados (Ruta)
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openPublishDialog(course)} disabled={isAuditing === course.id} className="cursor-pointer gap-2 py-2">
                                  {isAuditing === course.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : course.isActive ? <PowerOff className="h-3.5 w-3.5 text-orange-500" /> : <Power className="h-3.5 w-3.5 text-emerald-500" />}
                                  {course.isActive ? 'Ocultar Catálogo' : 'Publicar Catálogo'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openEnrollments(course)} className="cursor-pointer gap-2 py-2"><Users className="h-3.5 w-3.5 text-accent" /> Gestionar Alumnos</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => { setSelectedId(course.id); setIsDeleteDialogOpen(true); }} className="text-destructive font-bold gap-2 py-2 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /> Eliminar Programa</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog: Terms Acceptance (Required before publish) */}
        <Dialog open={isTermsDialogOpen} onOpenChange={setIsTermsDialogOpen}>
          <DialogContent className="max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-3xl pointer-events-auto">
            <div className="bg-amber-500 p-8 text-white relative">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4"><Scale className="h-6 w-6" /></div>
              <DialogTitle className="text-2xl font-bold">Protocolo Institucional</DialogTitle>
              <DialogDescription className="text-white/80 mt-1">Es obligatorio aceptar los términos académicos para proceder con la publicación.</DialogDescription>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 border rounded-2xl p-6">
                <ScrollArea className="h-[300px] pr-4">
                  <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {termsConfig?.content || "Cargando protocolo académico..."}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-amber-50/50 rounded-xl border border-dashed border-amber-200">
                <Checkbox id="manage-terms-accept" checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(!!v)} className="h-5 w-5" />
                <Label htmlFor="manage-terms-accept" className="text-xs font-bold cursor-pointer">
                  Confirmo que el contenido cumple con el protocolo académico vigente.
                </Label>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-3">
                <Button variant="ghost" onClick={() => setIsTermsDialogOpen(false)} className="flex-1 rounded-xl h-12 font-bold">Cancelar</Button>
                <Button 
                  onClick={handleAcceptTermsInManage} 
                  disabled={!termsAccepted || isUpdatingTerms} 
                  className="flex-1 h-14 rounded-xl font-bold text-lg shadow-xl bg-primary"
                >
                  {isUpdatingTerms ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />} 
                  Aceptar y Continuar
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog: Associated Courses */}
        <Dialog open={isAssociatedDialogOpen} onOpenChange={(open) => { setIsAssociatedDialogOpen(open); if(!open) clearUILocks(); }}>
          <DialogContent className="max-w-xl rounded-[2rem] p-0 overflow-hidden border-none shadow-3xl pointer-events-auto">
            <div className="bg-primary p-8 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4"><Link2 className="h-6 w-6" /></div>
                  <DialogTitle className="text-2xl font-bold">Cursos Asociados</DialogTitle>
                  <DialogDescription className="text-primary-foreground/70 mt-1">Recomienda otros programas de tu autoría para completar la ruta académica.</DialogDescription>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar en mis programas..." 
                  value={associatedSearchTerm}
                  onChange={e => setAssociatedSearchTerm(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-secondary/10 border-none font-medium"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Seleccionar Recomendaciones</Label>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="grid gap-2">
                    {filteredOtherCourses?.length === 0 ? (
                      <div className="text-center py-10 opacity-40 italic text-sm">No se encontraron otros cursos disponibles.</div>
                    ) : filteredOtherCourses?.map((c) => (
                      <div key={c.id} className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                        tempAssociatedIds.includes(c.id) ? "bg-primary/5 border-primary" : "bg-white border-border/50"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden border shrink-0">
                            <Image src={`https://loremflickr.com/100/100/education,course?lock=${c.id}`} alt="Thumb" fill className="object-cover" unoptimized />
                          </div>
                          <span className="text-sm font-bold text-foreground line-clamp-1">{c.title}</span>
                        </div>
                        <Switch 
                          checked={tempAssociatedIds.includes(c.id)} 
                          onCheckedChange={() => toggleAssociation(c.id)} 
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="pt-4 border-t flex flex-col gap-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
                  <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-800 font-medium">Estos cursos aparecerán como "Ruta de Aprendizaje Sugerida" al finalizar el programa actual.</p>
                </div>
                <Button onClick={saveAssociations} disabled={isSavingAssociations} className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl">
                  {isSavingAssociations ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />} 
                  Guardar Recomendaciones
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Publish Dialog */}
        <Dialog open={isPublishDialogOpen} onOpenChange={(open) => { setIsPublishDialogOpen(open); if(!open) clearUILocks(); }}>
          <DialogContent className="max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-3xl pointer-events-auto">
            <div className="bg-primary p-8 text-white relative">
              <Sparkles className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4"><Tags className="h-6 w-6 text-accent" /></div>
              <DialogTitle className="text-2xl font-bold">Publicar en Catálogo</DialogTitle>
              <DialogDescription className="text-primary-foreground/70 mt-1">Confirma las etiquetas institucionales para este programa antes de la auditoría IA.</DialogDescription>
            </div>
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-center px-1">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Palabras Clave (SEO)</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAiTagDialogOpen(true)}
                  className="rounded-xl font-bold text-[10px] uppercase gap-2 border-accent/20 text-accent hover:bg-accent/5 h-8"
                >
                  <Sparkles className="h-3 w-3" /> Sugerencias IA
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 p-4 bg-secondary/10 rounded-2xl border border-dashed min-h-[100px]">
                {allTags?.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic flex items-center justify-center w-full">Usa "Sugerencias IA" para generar taxonomía estratégica.</p>
                ) : allTags?.map(tag => (
                  <Badge 
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all",
                      selectedTags.includes(tag.id) ? "shadow-sm" : "bg-white hover:bg-primary/5"
                    )}
                    onClick={() => {
                      setSelectedTags(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]);
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 items-start">
                <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 font-medium">Al confirmar, se iniciará el proceso de auditoría institucional mediante Gemini 2.5 Pro para validar que el contenido cumple con los protocolos.</p>
              </div>
              
              <Button onClick={confirmPublication} disabled={selectedTags.length === 0} className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl">
                Confirmar y Publicar Catálogo
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Tag Suggestion Dialog */}
        <Dialog open={isAiTagDialogOpen} onOpenChange={setIsAiTagDialogOpen}>
          <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl pointer-events-auto">
            <div className="bg-slate-900 p-8 text-white relative">
              <Sparkles className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4"><Globe className="h-6 w-6 text-accent" /></div>
              <DialogTitle className="text-2xl font-bold">Generador SEO del Curso</DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">Define el área temática y Gemini propondrá keywords para Google.</DialogDescription>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Área o Nicho Académico</Label>
                <div className="flex gap-3">
                  <Input 
                    value={branchInput} 
                    onChange={e => setBranchInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerateAiTags()}
                    placeholder="Ej: Marketing, IA, Salud..." 
                    className="h-14 rounded-2xl bg-secondary/10 border-none font-bold px-6 focus:ring-2 focus:ring-primary/20"
                  />
                  <Button 
                    onClick={handleGenerateAiTags} 
                    disabled={isGeneratingTags || !branchInput.trim()}
                    className="h-14 px-6 rounded-2xl font-bold bg-accent hover:bg-accent/90 shadow-lg"
                  >
                    {isGeneratingTags ? <Loader2 className="animate-spin h-5 w-5" /> : <Search className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              {aiTagSuggestions.length > 0 && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Keywords Propuestas</Label>
                    <button 
                      onClick={() => setSelectedAiTags(aiTagSuggestions.map(s => s.name))}
                      className="text-[10px] font-bold text-accent uppercase hover:underline"
                    >
                      Marcar Todas
                    </button>
                  </div>
                  <ScrollArea className="h-[250px] pr-4">
                    <div className="grid gap-3">
                      {aiTagSuggestions.map((suggestion) => (
                        <div 
                          key={suggestion.name}
                          className={cn(
                            "p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                            selectedAiTags.includes(suggestion.name) 
                              ? "bg-primary/5 border-primary shadow-sm" 
                              : "bg-white border-border/50 hover:border-primary/20"
                          )}
                          onClick={() => {
                            if (selectedAiTags.includes(suggestion.name)) {
                              setSelectedAiTags(selectedAiTags.filter(s => s !== suggestion.name));
                            } else {
                              setSelectedAiTags([...selectedAiTags, suggestion.name]);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <p className="font-bold text-primary">{suggestion.name}</p>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">{suggestion.description}</p>
                            </div>
                            <Checkbox 
                              checked={selectedAiTags.includes(suggestion.name)}
                              className="rounded-full mt-1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <DialogFooter className="pt-4">
                <div className="w-full flex flex-col gap-4">
                  {selectedAiTags.length > 0 && (
                    <Button 
                      onClick={handleLoadAiSelectedTags} 
                      disabled={isSavingAiTags}
                      className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl"
                    >
                      {isSavingAiTags ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null}
                      Incorporar {selectedAiTags.length} Keywords al Curso
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setIsAiTagDialogOpen(false)} className="text-xs font-bold text-muted-foreground">Cancelar</Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Enrollments Dialog */}
        <Dialog open={isEnrollmentsDialogOpen} onOpenChange={(open) => { setIsEnrollmentsDialogOpen(open); if(!open) clearUILocks(); }}>
          <DialogContent className="max-w-xl p-0 border-none shadow-2xl rounded-2xl overflow-hidden pointer-events-auto">
            <div className="bg-primary p-8 text-primary-foreground">
              <div className="flex justify-between items-center">
                <div>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3"><Users className="h-6 w-6" /> Gestión de Matrícula</DialogTitle>
                  <DialogDescription className="text-primary-foreground/70 mt-1">Autoriza solicitudes y gestiona alumnos activos.</DialogDescription>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2"><UserPlus className="h-3 w-3" /> Alta Directa por Correo</Label>
                <div className="flex flex-col gap-4">
                  <Input placeholder="ejemplo@correo.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="h-12 rounded-xl bg-secondary/10 border-none font-medium px-4" />
                  
                  <div className="flex items-center justify-between bg-secondary/5 p-4 rounded-xl border border-secondary/10">
                    <div className="flex flex-col gap-0.5">
                      <Label className="text-sm font-bold">{isInvitation ? 'Invitación de Cortesía' : 'Carga Directa (Facturable)'}</Label>
                      <p className="text-[10px] text-muted-foreground">
                        {isInvitation ? 'No se factura, pero cuenta para el límite de tu plan.' : 'Se factura como una venta, sin límites de plan.'}
                      </p>
                    </div>
                    <Switch checked={isInvitation} onCheckedChange={setIsInvitation} />
                  </div>

                  <Button onClick={handleInviteStudent} disabled={!inviteEmail || addingStudent} className="h-12 w-full rounded-xl font-bold">
                    {addingStudent ? <Loader2 className="animate-spin" /> : (isInvitation ? 'Enviar Invitación' : 'Inscribir Alumno')}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Listado de Inscripciones</Label>
                <ScrollArea className="h-[350px] pr-4">
                  <div className="grid gap-3">
                    {loadingInscriptions ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                        <p className="text-muted-foreground font-bold italic">Obteniendo alumnos...</p>
                      </div>
                    ) : inscriptions.length === 0 ? (
                      <div className="text-center py-20 bg-secondary/10 rounded-[2rem] border-2 border-dashed">
                        <Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-muted-foreground font-bold">No hay alumnos registrados aún.</p>
                      </div>
                    ) : sortedInscriptions.map((ins) => (
                      <EnrollmentRow 
                        key={ins.id} 
                        enrollment={ins} 
                        onApprove={handleApproveEnrollment} 
                        onToggleStatus={handleToggleEnrollmentStatus} 
                        onDelete={handleDeleteEnrollment} 
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Moderation History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={(open) => { setIsHistoryDialogOpen(open); if(!open) clearUILocks(); }}>
          <DialogContent className="max-w-3xl p-0 border-none shadow-3xl rounded-[2.5rem] overflow-hidden pointer-events-auto">
            <div className="bg-slate-900 p-8 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <History className="h-6 w-6 text-accent" /> Historial de Auditoría
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 mt-1">Registros de cumplimiento para {selectedCourse?.title}</DialogDescription>
                </div>
                <Badge variant="outline" className="border-white/20 text-white font-mono text-[10px]">{selectedId}</Badge>
              </div>
            </div>
            <div className="p-8">
              <ScrollArea className="h-[500px] pr-4">
                {loadingLogs ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                    <p className="text-muted-foreground font-bold italic">Consultando registros históricos...</p>
                  </div>
                ) : moderationLogs.length === 0 ? (
                  <div className="text-center py-20 bg-secondary/10 rounded-[2rem] border-2 border-dashed">
                    <ShieldCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground font-bold">No existen registros de auditoría previa.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {moderationLogs.map((log) => (
                      <Card key={log.id} className={cn(
                        "p-6 rounded-2xl border-2 transition-all",
                        log.isSensitive ? "bg-rose-50 border-rose-100 shadow-[0_10px_20px_rgba(225,29,72,0.1)]" : "bg-emerald-50 border-emerald-100"
                      )}>
                        <div className="flex flex-col gap-4 mb-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm",
                                log.isSensitive ? "bg-rose-500" : "bg-emerald-500"
                              )}>
                                {log.isSensitive ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{log.isSensitive ? 'Anomalía Detectada' : 'Auditoría Aprobada'}</p>
                                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{format(new Date(log.createdAt?.seconds * 1000 || Date.now()), 'dd/MM/yyyy HH:mm')}</p>
                              </div>
                            </div>
                          </div>
                          {log.isSensitive && (
                            <div className="space-y-3 pt-4 border-t border-rose-200/50">
                              <p className="text-[10px] font-black uppercase text-rose-600 tracking-[0.2em] ml-1">Temas de Vigilancia:</p>
                              <div className="flex flex-wrap gap-2">
                                {log.flaggedTopics?.map((topic: string, i: number) => (
                                  <Badge key={i} variant="destructive" className="text-xs h-9 px-5 uppercase font-black bg-rose-600 border-none shadow-xl ring-2 ring-white/20">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="bg-white/60 p-5 rounded-2xl border border-black/5 shadow-inner">
                          <p className="text-sm text-slate-700 leading-relaxed italic">"{log.reason}"</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            <DialogFooter className="p-6 bg-slate-50 border-t">
              <Button onClick={() => setIsHistoryDialogOpen(false)} variant="ghost" className="rounded-xl font-bold">Cerrar Historial</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AlertDialog: Delete Course */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { setIsDeleteDialogOpen(open); if(!open) clearUILocks(); }}>
          <AlertDialogContent className="rounded-md p-8 max-sm border-none shadow-2xl pointer-events-auto">
            <AlertDialogHeader className="items-center text-center"><div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mb-4"><Trash2 className="h-6 w-6" /></div><AlertDialogTitle className="text-lg font-bold">¿Eliminar Programa?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter className="pt-4"><AlertDialogCancel className="flex-1">Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="flex-1 bg-destructive">Eliminar Definitivamente</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </DashboardLayout>
  );
}
