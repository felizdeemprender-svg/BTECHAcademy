
'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc, serverTimestamp, getDocs, orderBy, deleteDoc, getCountFromServer, or, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Loader2, 
  Plus, 
  Search, 
  ClipboardList, 
  Users, 
  Calendar, 
  ArrowRight, 
  UserCircle, 
  CheckCircle2, 
  Clock, 
  Upload, 
  FileText, 
  X,
  MoreVertical,
  Pencil,
  PauseCircle,
  PlayCircle,
  Trash2,
  AlertTriangle,
  Save,
  Target,
  ExternalLink,
  ChevronRight,
  Zap,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Componente interno para mostrar estadísticas de sesiones y tareas por cada seguimiento.
 */
function FollowUpStatsCells({ followUpId, totalPlanned }: { followUpId: string, totalPlanned: number }) {
  const db = useFirestore();
  const [stats, setStats] = useState({ completedSessions: 0, pendingTasks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [sessionsSnap, tasksSnap] = await Promise.all([
          getDocs(query(collection(db, 'followups', followUpId, 'sessions'), where('isCompleted', '==', true))),
          getDocs(query(collection(db, 'followups', followUpId, 'tasks'), where('status', '!=', 'completed')))
        ]);
        setStats({
          completedSessions: sessionsSnap.size,
          pendingTasks: tasksSnap.size
        });
      } catch (e) {
        console.error("Error al recuperar estadísticas de seguimiento:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [db, followUpId]);

  return (
    <>
      <TableCell className="text-center">
        {loading ? (
          <div className="flex justify-center"><Loader2 className="h-3 w-3 animate-spin opacity-20" /></div>
        ) : (
          <div className="flex flex-col items-center">
            <Badge variant="outline" className="rounded-lg h-6 px-2 font-bold border-primary/10 text-primary">
              {stats.completedSessions} / {totalPlanned}
            </Badge>
            <span className="text-[8px] uppercase font-bold text-muted-foreground mt-1">Consumidas</span>
          </div>
        )}
      </TableCell>
      <TableCell className="text-center">
        {loading ? (
          <div className="flex justify-center"><Loader2 className="h-3 w-3 animate-spin opacity-20" /></div>
        ) : (
          <div className="flex justify-center">
            {stats.pendingTasks > 0 ? (
              <Badge className="bg-amber-500 text-white border-none h-6 gap-1 px-2 font-bold shadow-sm animate-pulse">
                <Zap className="h-3 w-3" /> {stats.pendingTasks} Pend.
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 h-6 gap-1 px-2 font-bold">
                <CheckCircle2 className="h-3 w-3" /> Al Día
              </Badge>
            )}
          </div>
        )}
      </TableCell>
    </>
  );
}

export default function FollowUpsPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { storage } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [guideFile, setGuideFile] = useState<File | null>(null);

  const [isManualInvite, setIsManualInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const isAdmin = profile?.roles.includes('admin');
  const isMentor = profile?.roles.includes('mentor');

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
    if (!isCreateOpen && !isEditOpen && !isDeleteOpen) {
      const timer = setTimeout(clearUILocks, 300);
      return () => clearTimeout(timer);
    }
  }, [isCreateOpen, isEditOpen, isDeleteOpen, clearUILocks]);

  const followUpsQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    const ref = collection(db, 'followups');
    
    if (isAdmin) return query(ref, orderBy('createdAt', 'desc'));
    if (isMentor) return query(ref, where('mentorId', '==', profile.uid), orderBy('createdAt', 'desc'));
    
    return query(
      ref, 
      or(
        where('studentId', '==', profile.uid),
        where('studentEmail', '==', profile.email?.toLowerCase().trim())
      ),
      orderBy('createdAt', 'desc')
    );
  }, [db, profile?.uid, profile?.email, isAdmin, isMentor]);

  const { data: followUps, isLoading: followUpsLoading } = useCollection(followUpsQuery);

  const [formData, setFormData] = useState({
    title: '',
    goal: '',
    studentId: '',
    totalSessions: 4,
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (!profile?.uid || (!isMentor && !isAdmin)) return;

    const fetchStudents = async () => {
      try {
        let enrollments: any[] = [];
        
        if (isAdmin) {
          const snap = await getDocs(collection(db, 'enrollments'));
          enrollments = snap.docs.map(d => d.data());
        } else {
          const coursesSnap = await getDocs(query(collection(db, 'courses'), where('mentorId', '==', profile.uid)));
          const courseIds = coursesSnap.docs.map(d => d.id);
          
          if (courseIds.length > 0) {
            for (let i = 0; i < courseIds.length; i += 30) {
              const chunk = courseIds.slice(i, i + 30);
              const snap = await getDocs(query(collection(db, 'enrollments'), where('courseId', 'in', chunk)));
              enrollments = [...enrollments, ...snap.docs.map(d => d.data())];
            }
          }
        }

        const studentMap = new Map();
        for (const enroll of enrollments) {
          const email = enroll.inviteEmail?.toLowerCase().trim();
          if (!email) continue;

          if (!studentMap.has(email)) {
            studentMap.set(email, {
              id: enroll.studentId,
              displayName: enroll.studentName || email.split('@')[0] || 'Alumno',
              email: email
            });
          } else {
            const existing = studentMap.get(email);
            const currentId = enroll.studentId;
            const isExistingTemp = existing.id.includes('_') || existing.id.includes('@');
            const isCurrentReal = !currentId.includes('_') && !currentId.includes('@');
            
            if (isExistingTemp && isCurrentReal) {
              studentMap.set(email, {
                ...existing,
                id: currentId
              });
            }
          }
        }

        const studentList = Array.from(studentMap.values());
        studentList.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        setStudents(studentList);
      } catch (e) {
        console.error("Error fetching students for follow-up selection:", e);
      }
    };

    fetchStudents();
  }, [db, profile, isMentor, isAdmin]);

  const handleCreateFollowUp = async () => {
    const isManualValid = isManualInvite && inviteEmail.trim().includes('@');
    const isSelectValid = !isManualInvite && formData.studentId;
    
    if (!formData.title || !formData.goal || (!isManualValid && !isSelectValid)) return;
    
    setLoading(true);

    try {
      let finalStudentId = formData.studentId;
      let finalStudentName = '';
      let finalStudentEmail = '';

      if (isManualInvite) {
        const normalizedEmail = inviteEmail.toLowerCase().trim();
        const tempId = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
        
        const userRef = doc(db, 'users', tempId);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
          finalStudentId = snap.id;
          const userData = snap.data();
          finalStudentName = userData.displayName || normalizedEmail.split('@')[0];
          finalStudentEmail = userData.email || normalizedEmail;
        } else {
          const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
          const qSnap = await getDocs(q);
          
          if (!qSnap.empty) {
            finalStudentId = qSnap.docs[0].id;
            finalStudentName = qSnap.docs[0].data().displayName || normalizedEmail.split('@')[0];
            finalStudentEmail = normalizedEmail;
          } else {
            finalStudentId = tempId;
            finalStudentName = normalizedEmail.split('@')[0];
            finalStudentEmail = normalizedEmail;
            const newUser = {
              uid: finalStudentId,
              email: normalizedEmail,
              displayName: finalStudentName,
              roles: ['alumno'],
              isActive: true,
              isPreRegistered: true,
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, newUser);
          }
        }
      } else {
        const student = students.find(s => s.id === formData.studentId);
        finalStudentId = student?.id;
        finalStudentName = student?.displayName || 'Alumno';
        finalStudentEmail = student?.email || '';
      }

      let planGuideUrl = null;
      if (guideFile) {
        const guideRef = ref(storage, `followup_guides/${profile!.uid}/${Date.now()}_${guideFile.name}`);
        const uploadResult = await uploadBytes(guideRef, guideFile);
        planGuideUrl = await getDownloadURL(uploadResult.ref);
      }

      const followUpId = Math.random().toString(36).substring(2, 15);
      const followUpRef = doc(db, 'followups', followUpId);

      const followUpData = {
        id: followUpId,
        title: formData.title,
        goal: formData.goal,
        studentId: finalStudentId,
        studentName: finalStudentName,
        studentEmail: finalStudentEmail,
        totalSessions: formData.totalSessions,
        startDate: formData.startDate,
        endDate: formData.endDate,
        mentorId: profile?.uid,
        status: 'active',
        planGuideUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(followUpRef, followUpData);

      for (let i = 0; i < formData.totalSessions; i++) {
        const sessionId = Math.random().toString(36).substring(2, 15);
        const sessionRef = doc(db, 'followups', followUpId, 'sessions', sessionId);
        await setDoc(sessionRef, {
          id: sessionId,
          followUpId,
          orderIndex: i + 1,
          isCompleted: false,
          topics: [],
          minutes: '',
          updatedAt: serverTimestamp()
        });
      }

      toast({ title: 'Seguimiento Creado', description: `Se han generado ${formData.totalSessions} sesiones de trabajo.` });
      setIsCreateOpen(false);
      setGuideFile(null);
      setInviteEmail('');
      router.push(`/seguimientos/${followUpId}`);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al crear seguimiento' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditFollowUp = (f: any) => {
    setSelectedFollowUp(f);
    setFormData({
      title: f.title || '',
      goal: f.goal || '',
      studentId: f.studentId || '',
      totalSessions: f.totalSessions || 4,
      startDate: f.startDate || '',
      endDate: f.endDate || ''
    });
    setIsEditOpen(true);
  };

  const handleUpdateFollowUp = async () => {
    if (!selectedFollowUp) return;
    setLoading(true);
    try {
      let planGuideUrl = selectedFollowUp.planGuideUrl;
      if (guideFile) {
        const guideRef = ref(storage, `followup_guides/${profile!.uid}/${Date.now()}_${guideFile.name}`);
        const uploadResult = await uploadBytes(guideRef, guideFile);
        planGuideUrl = await getDownloadURL(uploadResult.ref);
      }

      const updateData = {
        title: formData.title,
        goal: formData.goal,
        startDate: formData.startDate,
        endDate: formData.endDate,
        planGuideUrl,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'followups', selectedFollowUp.id), updateData);
      toast({ title: 'Seguimiento Actualizado' });
      setIsEditOpen(false);
      setGuideFile(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al actualizar' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (f: any) => {
    const newStatus = f.status === 'suspended' ? 'active' : 'suspended';
    try {
      await updateDoc(doc(db, 'followups', f.id), { status: newStatus, updatedAt: serverTimestamp() });
      toast({ title: newStatus === 'suspended' ? 'Seguimiento Suspendido' : 'Seguimiento Reactivado' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al cambiar estado' });
    } finally {
      clearUILocks();
    }
  };

  const handleDeleteFollowUp = async () => {
    if (!selectedFollowUp) return;
    setLoading(true);
    try {
      const tasksRef = collection(db, 'followups', selectedFollowUp.id, 'tasks');
      const snap = await getCountFromServer(tasksRef);
      
      if (snap.data().count > 0) {
        toast({ 
          variant: 'destructive', 
          title: 'Acción Bloqueada', 
          description: 'No puedes borrar un seguimiento que ya tiene tareas o compromisos registrados.' 
        });
        setLoading(false);
        setIsDeleteOpen(false);
        return;
      }

      const sessionsSnap = await getDocs(collection(db, 'followups', selectedFollowUp.id, 'sessions'));
      for (const s of sessionsSnap.docs) {
        await deleteDoc(s.ref);
      }

      await deleteDoc(doc(db, 'followups', selectedFollowUp.id));
      toast({ title: 'Seguimiento Eliminado' });
      setIsDeleteOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al eliminar' });
    } finally {
      setLoading(false);
    }
  };

  const filteredFollowUps = followUps?.filter(f => 
    f.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.studentName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Seguimientos Académicos</h1>
            <p className="text-muted-foreground text-lg font-medium">Gestión de sesiones personalizadas y objetivos estratégicos.</p>
          </div>
          {(isMentor || isAdmin) && (
            <Button onClick={() => {
              setFormData({ title: '', goal: '', studentId: '', totalSessions: 4, startDate: '', endDate: '' });
              setInviteEmail('');
              setIsManualInvite(false);
              setGuideFile(null);
              setIsCreateOpen(true);
            }} className="h-12 px-8 rounded-xl font-bold shadow-xl flex items-center gap-2">
              <Plus className="h-5 w-5" /> Nuevo Seguimiento
            </Button>
          )}
        </header>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por programa o alumno..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-xl bg-white border-2"
          />
        </div>

        <Card className="border rounded-xl overflow-hidden bg-white shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/50 border-b">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-bold py-4 px-6 text-foreground text-[11px] uppercase tracking-wider">Programa / Alumno</TableHead>
                  <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Sesiones (Hechas/Plan)</TableHead>
                  <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Plan de Acción</TableHead>
                  <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Inicio</TableHead>
                  <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Estado</TableHead>
                  <TableHead className="text-right py-4 px-6 text-foreground text-[11px] uppercase tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUpsLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground animate-pulse font-medium">Sincronizando seguimientos...</TableCell></TableRow>
                ) : filteredFollowUps?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-20 italic text-muted-foreground">No se encontraron registros de seguimiento.</TableCell></TableRow>
                ) : filteredFollowUps?.map((f) => (
                  <TableRow key={f.id} className={cn("hover:bg-secondary/20 border-b transition-colors", f.status === 'suspended' && "opacity-60 bg-muted/10")}>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-bold border shrink-0">
                          <ClipboardList className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-foreground line-clamp-1">{f.title}</p>
                            {f.planGuideUrl && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Guía disponible" />}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <UserCircle className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{f.studentName}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <FollowUpStatsCells followUpId={f.id} totalPlanned={f.totalSessions} />

                    <TableCell className="text-center font-medium text-muted-foreground text-sm">
                      {f.startDate ? format(new Date(f.startDate), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "text-[9px] uppercase tracking-widest px-2 h-5 border-none",
                        f.status === 'active' ? "bg-emerald-50 text-emerald-700" : 
                        f.status === 'suspended' ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"
                      )}>
                        {f.status === 'active' ? 'En Curso' : f.status === 'suspended' ? 'Suspendido' : 'Finalizado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end items-center gap-2">
                        <Button 
                          onClick={() => router.push(`/seguimientos/${f.id}`)}
                          size="sm" 
                          variant="ghost" 
                          className="rounded-xl h-9 px-4 font-bold text-primary hover:bg-primary/10 transition-colors"
                        >
                          Gestionar <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                        {(isMentor || isAdmin) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs font-bold">
                              <DropdownMenuItem onClick={() => handleEditFollowUp(f)} className="gap-2 py-2 cursor-pointer">
                                <Pencil className="h-3.5 w-3.5" /> Editar Programa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(f)} className="gap-2 py-2 cursor-pointer">
                                {f.status === 'suspended' ? (
                                  <><PlayCircle className="h-3.5 w-3.5 text-emerald-600" /> Habilitar Seguimiento</>
                                ) : (
                                  <><PauseCircle className="h-3.5 w-3.5 text-amber-600" /> Suspender Seguimiento</>
                                )}
                              </DropdownMenuItem>
                              {f.planGuideUrl && (
                                <DropdownMenuItem onClick={() => window.open(f.planGuideUrl, '_blank')} className="gap-2 py-2 cursor-pointer">
                                  <FileText className="h-3.5 w-3.5 text-blue-500" /> Ver Guía del Plan
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => { setSelectedFollowUp(f); setIsDeleteOpen(true); }}
                                className="text-destructive gap-2 py-2 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Eliminar Definitivamente
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog: Create */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl">
            <div className="bg-primary p-8 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4"><ClipboardList className="h-6 w-6" /></div>
              <DialogTitle className="text-2xl font-bold">Nuevo Seguimiento Académico</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Define el alcance del acompañamiento para el alumno.</DialogDescription>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Alumno del Seguimiento</Label>
                  <Tabs value={isManualInvite ? 'manual' : 'select'} onValueChange={v => setIsManualInvite(v === 'manual')} className="w-full">
                    <TabsList className="grid grid-cols-2 h-12 bg-secondary/20 p-1 rounded-xl mb-4">
                      <TabsTrigger value="select" className="rounded-lg font-bold gap-2"><Users className="h-3.5 w-3.5" /> Seleccionar</TabsTrigger>
                      <TabsTrigger value="manual" className="rounded-lg font-bold gap-2"><UserPlus className="h-3.5 w-3.5" /> Nuevo Correo</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="select" className="m-0 animate-in fade-in">
                      <Select onValueChange={id => setFormData({...formData, studentId: id})} value={formData.studentId}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Elegir estudiante de la lista..." />
                        </SelectTrigger>
                        <SelectContent>
                          {students.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground italic">No se encontraron alumnos disponibles.</div>
                          ) : students.map(s => (
                            <SelectItem key={s.id} value={s.id} className="rounded-lg">
                              <div className="flex flex-col text-left">
                                <span className="font-bold">{s.displayName}</span>
                                <span className="text-[10px] opacity-60">{s.email}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TabsContent>
                    
                    <TabsContent value="manual" className="m-0 animate-in fade-in">
                      <div className="space-y-2">
                        <Input 
                          type="email" 
                          placeholder="ejemplo@correo.com" 
                          value={inviteEmail} 
                          onChange={e => setInviteEmail(e.target.value)} 
                          className="h-12 rounded-xl border-2" 
                        />
                        <p className="text-[9px] text-muted-foreground ml-1 font-medium italic">
                          Si el alumno no está asociado a un curso previo, se dará de alta su perfil automáticamente.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nombre del Seguimiento</Label>
                  <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ej: Mentoría Mentores Expertos" className="h-12 rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Objetivo del Programa</Label>
                <Textarea value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})} placeholder="¿Qué esperamos lograr?" className="min-h-[100px] rounded-2xl" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Guía del Plan (PDF / Imagen)</Label>
                <div className="p-6 border-2 border-dashed rounded-2xl bg-muted/5 flex flex-col items-center gap-2 relative hover:bg-muted/10 transition-colors group">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={e => setGuideFile(e.target.files?.[0] || null)}
                  />
                  {guideFile ? (
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{guideFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">Documento listo</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive shrink-0 relative z-10"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGuideFile(null); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground/40 group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-bold text-muted-foreground">Click para subir la guía institucional</p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nº Sesiones</Label>
                  <Input type="number" value={formData.totalSessions} onChange={e => setFormData({...formData, totalSessions: parseInt(e.target.value) || 0})} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Inicio</Label>
                  <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Fin Estimado</Label>
                  <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="h-12 rounded-xl" />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button onClick={handleCreateFollowUp} disabled={loading || (!isManualInvite && !formData.studentId) || (isManualInvite && !inviteEmail)} className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />} Iniciar Seguimiento
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog: Edit */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl">
            <div className="bg-primary p-8 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4"><Pencil className="h-6 w-6" /></div>
              <DialogTitle className="text-2xl font-bold">Editar Seguimiento</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Ajusta los parámetros del programa académico.</DialogDescription>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nombre del Seguimiento</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="h-12 rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Objetivo del Programa</Label>
                <Textarea value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})} className="min-h-[100px] rounded-2xl" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Actualizar Guía del Plan (Opcional)</Label>
                <div className="p-6 border-2 border-dashed rounded-2xl bg-muted/5 flex flex-col items-center gap-2 relative hover:bg-muted/10 transition-colors group">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setGuideFile(e.target.files?.[0] || null)} />
                  {guideFile ? (
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><FileText className="h-5 w-5" /></div>
                      <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{guideFile.name}</p></div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGuideFile(null); }} className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive z-10"><X className="h-4 w-4" /></Button>
                    </div>
                  ) : selectedFollowUp?.planGuideUrl ? (
                    <div className="flex items-center justify-between w-full p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700">Guía actual cargada</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => window.open(selectedFollowUp.planGuideUrl, '_blank')} className="text-[10px] h-7 font-bold">Ver</Button>
                        <p className="text-[10px] text-muted-foreground italic">Sube un nuevo archivo para reemplazar</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground/40 group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-bold text-muted-foreground">Subir nueva versión del plan</p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Inicio</Label>
                  <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Fin Estimado</Label>
                  <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="h-12 rounded-xl" />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button onClick={handleUpdateFollowUp} disabled={loading} className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl bg-primary">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Guardar Cambios
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog: Delete Confirm */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="max-w-md rounded-[2rem] p-8 overflow-hidden border-none shadow-3xl text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-bold mb-2">¿Eliminar Seguimiento?</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 leading-relaxed mb-8">
              Esta acción borrará el programa y todas sus sesiones asociadas. 
              <br/><strong>Nota:</strong> Solo se permite borrar si no existen tareas o compromisos registrados.
            </DialogDescription>
            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="flex-1 h-12 rounded-xl font-bold">Cancelar</Button>
              <Button 
                onClick={handleDeleteFollowUp} 
                disabled={loading} 
                variant="destructive" 
                className="flex-1 h-12 rounded-xl font-bold shadow-lg"
              >
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Trash2 className="mr-2" />} Confirmar Borrado
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
