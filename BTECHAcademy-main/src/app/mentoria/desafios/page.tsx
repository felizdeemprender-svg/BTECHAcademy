
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { 
  collection, query, where, getDocs, doc, 
  serverTimestamp, getDoc, writeBatch, collectionGroup, orderBy, deleteDoc, setDoc
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Target, Plus, Search, Loader2, Users, BookOpen, 
  CheckCircle2, BrainCircuit, X, Zap, 
  UserPlus, Info, ClipboardList, Send, Trash2, Clock,
  AlertTriangle, Eye, BarChart3, ChevronRight, FileText, Download
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { SmartFilterBar } from '@/components/ui/smart-filter-bar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { differenceInDays } from 'date-fns';
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from '@/components/ui/table';

// Subcomponente de Tabla (Fuera para mayor claridad)
const ChallengeTable = ({ list, setSelectedGroup }: { list: any[], setSelectedGroup: (g: any) => void }) => (
  <div className="space-y-4">
    {/* Vista Desktop: Tabla */}
    <Card className="hidden md:block border rounded-[2rem] overflow-hidden bg-white shadow-xl">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-secondary/50 border-b">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="font-bold py-4 px-6 text-foreground text-[11px] uppercase tracking-wider">Desafío Asignado</TableHead>
              <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Fecha</TableHead>
              <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Alumnos</TableHead>
              <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Cumplimiento</TableHead>
              <TableHead className="font-bold text-center text-[11px] uppercase tracking-wider">Promedio</TableHead>
              <TableHead className="text-right py-4 px-6 text-foreground text-[11px] uppercase tracking-wider">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 italic text-muted-foreground">
                  No se encontraron desafíos en esta categoría.
                </TableCell>
              </TableRow>
            ) : list.map((group, idx) => {
              const percent = Math.round((group.completed / group.total) * 100);
              const avg = group.scores.length > 0 
                ? Math.round(group.scores.reduce((a: number, b: number) => a + b, 0) / group.scores.length)
                : 0;
              
              return (
                <TableRow key={idx} className="hover:bg-secondary/20 border-b transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shadow-sm">
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground line-clamp-1">{group.title}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 italic">"{group.description}"</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-slate-500 text-[11px]">
                    {group.createdAt?.toDate ? format(group.createdAt.toDate(), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-bold text-[10px] bg-slate-50">{group.total} Alumnos</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-black text-primary">{percent}%</span>
                      <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-lg font-black text-emerald-600 leading-none">{avg}%</span>
                      <span className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest mt-1">Media</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <Button 
                      onClick={() => setSelectedGroup(group)}
                      size="sm" 
                      variant="ghost" 
                      className="rounded-xl h-9 px-4 font-bold text-primary hover:bg-primary/10 transition-colors"
                    >
                      Analizar <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {/* Vista Mobile: Lista de Tarjetas */}
    <div className="md:hidden space-y-4">
      {list.length === 0 ? (
        <div className="p-10 text-center italic text-muted-foreground bg-white rounded-3xl border">
          No hay desafíos aquí.
        </div>
      ) : list.map((group, idx) => {
        const percent = Math.round((group.completed / group.total) * 100);
        return (
          <Card key={idx} className="rounded-3xl border-none shadow-md overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm line-clamp-1">{group.title}</p>
                    <p className="text-[10px] text-muted-foreground">{group.createdAt?.toDate ? format(group.createdAt.toDate(), 'dd/MM/yyyy') : '-'}</p>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary border-none text-[10px]">{group.total} Alum.</Badge>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase text-muted-foreground">Cumplimiento</span>
                  <span className="text-sm font-black text-primary">{percent}%</span>
                </div>
                <Button 
                  onClick={() => setSelectedGroup(group)}
                  size="sm" 
                  className="rounded-xl font-bold gap-1"
                >
                  Detalle <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  </div>
);

export default function MentorChallengesPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPurgeOpen, setIsPurgeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<'course' | 'free'>('course');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [mentorCourses, setMentorCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    evaluationCriteria: '',
    allowFileUpload: false
  });

  // State for detailed views
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<any>(null);

  // Consulta global para el mentor
  const allAssignedTasksQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(
      collectionGroup(db, 'individualTasks'),
      where('mentorId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
  }, [db, profile?.uid]);

  const { data: allTasks, isLoading: tasksLoading } = useCollection(allAssignedTasksQuery);

  // Agrupar tareas por "Desafío" (Título + Descripción)
  const groupedChallenges = useMemo(() => {
    if (!allTasks) return [];
    const groups: Record<string, any> = {};
    
    allTasks.forEach(task => {
      const key = task.title + task.description;
      if (!groups[key]) {
        groups[key] = {
          title: task.title,
          description: task.description,
          createdAt: task.createdAt,
          total: 0,
          completed: 0,
          avgScore: 0,
          scores: [] as number[],
          tasks: [] as any[]
        };
      }
      groups[key].total++;
      if (task.status === 'completed') {
        groups[key].completed++;
        if (task.score !== undefined) groups[key].scores.push(task.score);
      }
      groups[key].tasks.push(task);
    });

    return Object.values(groups).sort((a: any, b: any) => 
      (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0)
    );
  }, [allTasks]);

  // Filtrado y división por antigüedad
  const filteredAndCategorized = useMemo(() => {
    const filtered = groupedChallenges.filter(g => 
      g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const now = new Date();
    const recent: any[] = [];
    const old: any[] = [];

    filtered.forEach(g => {
      const date = g.createdAt?.toDate?.() || now;
      if (differenceInDays(now, date) <= 30) {
        recent.push(g);
      } else {
        old.push(g);
      }
    });

    return { recent, old };
  }, [groupedChallenges, searchTerm]);

  const clearUILocks = useCallback(() => {
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
    document.documentElement.style.pointerEvents = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.removeAttribute('inert');
  }, []);

  useEffect(() => {
    if (profile?.uid) {
      const q = query(collection(db, 'courses'), where('mentorId', '==', profile.uid));
      getDocs(q).then(snap => {
        setMentorCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [db, profile?.uid]);

  useEffect(() => {
    if (assignmentMode === 'free') {
      const q = query(collection(db, 'users'), where('roles', 'array-contains', 'alumno'));
      getDocs(q).then(snap => {
        setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [db, assignmentMode]);

  useEffect(() => {
    if (assignmentMode === 'course' && selectedCourseId) {
      const fetchFinishedStudents = async () => {
        setLoading(true);
        try {
          const modsSnap = await getDocs(collection(db, 'courses', selectedCourseId, 'modules'));
          const modulesCount = modsSnap.size;

          const enrollQuery = query(collection(db, 'enrollments'), where('courseId', '==', selectedCourseId));
          const enrollSnap = await getDocs(enrollQuery);
          
          const finished = enrollSnap.docs
            .map(d => d.data())
            .filter(e => (e.progress?.completedModules?.length || 0) >= modulesCount)
            .map(e => ({
              id: e.studentId,
              displayName: e.studentName,
              email: e.inviteEmail
            }));
          
          setStudents(finished);
        } catch (e) {
          toast({ variant: 'destructive', title: 'Error al filtrar alumnos' });
        } finally {
          setLoading(false);
        }
      };
      fetchFinishedStudents();
    }
  }, [db, selectedCourseId, assignmentMode, toast]);

  const handleCreateChallenges = async () => {
    if (!taskData.title || !taskData.description || selectedStudentIds.length === 0) return;
    setLoading(true);

    try {
      const batch = writeBatch(db);
      
      for (const studentId of selectedStudentIds) {
        const student = students.find(s => s.id === studentId);
        const taskRef = doc(collection(db, 'users', studentId, 'individualTasks'));
        
        const finalTask = {
          id: taskRef.id,
          mentorId: profile?.uid,
          mentorName: profile?.displayName,
          studentId: studentId,
          studentName: student?.displayName || student?.email || 'Alumno',
          studentEmail: student?.email || '', 
          ...taskData,
          status: 'pending',
          createdAt: serverTimestamp()
        };

        batch.set(taskRef, finalTask);
      }

      await batch.commit().then(() => {
        toast({ title: 'Desafíos Asignados', description: `Se ha enviado el desafío a ${selectedStudentIds.length} alumnos.` });
        setIsCreateOpen(false);
        resetForm();
      }).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'batch/individualTasks',
          operation: 'create',
          requestResourceData: taskData
        }));
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al asignar desafíos' });
    } finally {
      setLoading(false);
      clearUILocks();
    }
  };

  const handleDeleteTask = async (studentId: string | undefined, taskId: string) => {
    if (!studentId || !taskId) return;
    const ref = doc(db, 'users', studentId, 'individualTasks', taskId);
    deleteDoc(ref).then(() => {
      toast({ title: 'Desafío eliminado' });
    }).catch(e => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: ref.path,
        operation: 'delete'
      }));
    });
  };

  const handlePurgeTasks = async () => {
    if (!allTasks || allTasks.length === 0) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      
      for (const task of allTasks) {
        const taskRef = doc(db, 'users', task.studentId, 'individualTasks', task.id);
        batch.delete(taskRef);
        count++;
        if (count >= 450) break; 
      }

      await batch.commit();
      toast({ title: 'Historial Limpio', description: `Se han eliminado ${count} desafíos del sistema.` });
      setIsPurgeOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al purgar datos' });
    } finally {
      setLoading(false);
      clearUILocks();
    }
  };

  const resetForm = () => {
    setTaskData({ title: '', description: '', evaluationCriteria: '', allowFileUpload: false });
    setSelectedStudentIds([]);
    setSelectedCourseId('');
    setStudents([]);
  };

  const filteredStudents = students.filter(s => 
    s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Gestión de Desafíos</h1>
            <p className="text-muted-foreground text-lg font-medium">Asigna consignas de alto impacto y analiza el desempeño con IA.</p>
          </div>
          <div className="flex gap-3">
            {allTasks && allTasks.length > 0 && (
              <Button variant="outline" onClick={() => setIsPurgeOpen(true)} className="h-12 px-6 rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50 gap-2">
                <Trash2 className="h-4 w-4" /> Limpiar
              </Button>
            )}
            <Button onClick={() => setIsCreateOpen(true)} className="h-12 px-8 rounded-xl font-bold shadow-xl flex items-center gap-2">
              <Plus className="h-5 w-5" /> Nuevo Desafío
            </Button>
          </div>
        </header>

        <SmartFilterBar 
          placeholder="Filtrar desafíos por nombre..."
          value={searchTerm}
          onChange={setSearchTerm}
        />

        <Tabs defaultValue="recent" className="space-y-6">
          <TabsList className="bg-secondary/20 p-1 rounded-2xl h-14">
            <TabsTrigger value="recent" className="rounded-xl font-bold text-sm px-8 data-[state=active]:shadow-lg">
              🔥 Desafíos Recientes
              <Badge className="ml-2 bg-primary/10 text-primary border-none shadow-none text-[10px]">{filteredAndCategorized.recent.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="old" className="rounded-xl font-bold text-sm px-8 data-[state=active]:shadow-lg">
              📦 Archivo Histórico
              <Badge className="ml-2 bg-slate-100 text-slate-500 border-none shadow-none text-[10px]">{filteredAndCategorized.old.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="animate-in fade-in duration-500">
            {tasksLoading ? (
              <div className="h-60 bg-muted animate-pulse rounded-[2.5rem]" />
            ) : (
              <ChallengeTable list={filteredAndCategorized.recent} setSelectedGroup={setSelectedGroup} />
            )}
          </TabsContent>

          <TabsContent value="old" className="animate-in fade-in duration-500">
            <ChallengeTable list={filteredAndCategorized.old} setSelectedGroup={setSelectedGroup} />
          </TabsContent>
        </Tabs>

        {/* Dialog: Challenge Details (Student List) */}
        <Dialog open={!!selectedGroup} onOpenChange={open => !open && setSelectedGroup(null)}>
          <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 border-none shadow-3xl rounded-[2.5rem] overflow-hidden">
            <div className="bg-primary p-8 text-white shrink-0 relative">
              <BarChart3 className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <DialogTitle className="text-2xl font-bold">{selectedGroup?.title}</DialogTitle>
                  <DialogDescription className="text-primary-foreground/70 font-medium">Análisis de cumplimiento por alumno.</DialogDescription>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white leading-none">{selectedGroup?.completed} / {selectedGroup?.total}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50 mt-1">Completados</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest px-2">Alumnos Asignados</h4>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Entregado</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Pendiente</div>
                </div>
              </div>
              <ScrollArea className="flex-1 p-6">
                <div className="grid gap-3">
                  {selectedGroup?.tasks.map((task: any) => (
                    <Card key={task.id} className="p-4 rounded-2xl border border-border/50 hover:border-primary/20 transition-all group/row">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm",
                            task.status === 'completed' ? "bg-emerald-500" : "bg-amber-500"
                          )}>
                            {task.studentName?.[0] || 'A'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{task.studentName}</p>
                            <p className="text-[10px] text-muted-foreground">{task.studentEmail}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          {task.status === 'completed' ? (
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-lg font-black text-emerald-600 leading-none">{task.score}%</p>
                                <p className="text-[8px] font-bold uppercase text-muted-foreground">Calificación</p>
                              </div>
                              <Button 
                                onClick={() => setSelectedTaskDetail(task)}
                                size="sm" 
                                variant="outline" 
                                className="rounded-xl font-bold h-9 px-4 gap-2 border-2 hover:bg-primary hover:text-white"
                              >
                                <Eye className="h-3.5 w-3.5" /> Ver Entrega
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[9px] font-bold">Pendiente</Badge>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteTask(task.studentId, task.id)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <DialogFooter className="p-6 bg-slate-50 border-t">
              <Button onClick={() => setSelectedGroup(null)} variant="secondary" className="rounded-xl font-bold h-12 px-8">Cerrar Tablero</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Response Detail (The actual student answer) */}
        <Dialog open={!!selectedTaskDetail} onOpenChange={open => !open && setSelectedTaskDetail(null)}>
          <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 border-none shadow-3xl rounded-[2.5rem] overflow-hidden">
            <div className="bg-emerald-600 p-8 text-white shrink-0 relative">
              <BrainCircuit className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-0.5">
                  <DialogTitle className="text-2xl font-bold">Auditoría de Entrega</DialogTitle>
                  <p className="text-emerald-100/70 font-medium">{selectedTaskDetail?.studentName}</p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-8">
              <div className="space-y-10">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Respuesta del Alumno
                  </h4>
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner">
                    <p className="text-slate-700 leading-relaxed font-medium">{selectedTaskDetail?.answer}</p>
                    {selectedTaskDetail?.fileUrl && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-6 rounded-xl font-bold gap-2 h-10 px-6 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => window.open(selectedTaskDetail.fileUrl, '_blank')}
                      >
                        <Download className="h-4 w-4" /> Descargar Material Adjunto
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-emerald-600 tracking-widest flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4" /> Análisis de la IA (Gemini 2.5 Pro)
                  </h4>
                  <div className="bg-emerald-50 p-8 rounded-[2rem] border-2 border-emerald-100 relative overflow-hidden">
                    <Zap className="absolute -right-4 -top-4 h-24 w-24 opacity-5 text-emerald-600" />
                    <div className="flex justify-between items-center mb-6">
                      <Badge className="bg-emerald-500 text-white border-none h-6 px-3 text-[10px] font-black uppercase">Nota: {selectedTaskDetail?.score}%</Badge>
                      <span className="text-[10px] font-bold text-emerald-600/60 uppercase">{selectedTaskDetail?.completedAt ? format(new Date(selectedTaskDetail.completedAt), 'dd/MM/yyyy HH:mm') : '-'}</span>
                    </div>
                    <p className="text-emerald-900 leading-relaxed font-medium italic text-lg">"{selectedTaskDetail?.aiFeedback}"</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-6 bg-slate-50 border-t">
              <Button onClick={() => setSelectedTaskDetail(null)} className="rounded-xl font-bold h-12 px-8">Cerrar Análisis</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Create Global Challenge */}
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if(!open) resetForm(); }}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 border-none shadow-3xl rounded-[2.5rem] overflow-hidden">
            <div className="bg-primary p-8 text-white relative shrink-0">
              <Target className="absolute -right-4 -top-4 h-32 w-32 opacity-10" />
              <DialogTitle className="text-2xl font-bold flex items-center gap-3"><Target className="h-6 w-6 text-accent" /> Asignar Desafío Global</DialogTitle>
              <DialogDescription className="text-primary-foreground/70 mt-1">Crea una consigna y selecciona a los destinatarios por curso o perfil.</DialogDescription>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 p-8">
                <div className="space-y-10">
                  {/* Step 1: Consigna */}
                  <section className="space-y-6">
                    <h3 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center text-[10px]">1</div>
                      Definición de la Tarea
                    </h3>
                    <div className="grid gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Título del Desafío</Label>
                        <Input value={taskData.title} onChange={e => setTaskData({...taskData, title: e.target.value})} placeholder="Ej: Proyecto Final: Plan de Marketing" className="h-12 rounded-xl bg-secondary/10 border-none font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Consigna Pedagógica</Label>
                        <Textarea value={taskData.description} onChange={e => setTaskData({...taskData, description: e.target.value})} placeholder="Describe detalladamente qué debe realizar el alumno..." className="min-h-[120px] rounded-2xl bg-secondary/10 border-none p-6" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-accent ml-1 flex items-center gap-2"><BrainCircuit className="h-3 w-3" /> Criterios de Evaluación IA</Label>
                        <Textarea value={taskData.evaluationCriteria} onChange={e => setTaskData({...taskData, evaluationCriteria: e.target.value})} placeholder="¿Qué puntos clave debe validar la IA para calificar la tarea?" className="min-h-[100px] rounded-2xl bg-accent/5 border-accent/20 p-6" />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-secondary/5 rounded-xl border border-dashed border-primary/10">
                        <div className="flex items-center gap-3"><Info className="h-4 w-4 text-primary" /><Label className="text-xs font-bold">Exigir Adjunto (PDF)</Label></div>
                        <Switch checked={taskData.allowFileUpload} onCheckedChange={(val) => setTaskData({...taskData, allowFileUpload: val})} />
                      </div>
                    </div>
                  </section>

                  {/* Step 2: Destinatarios */}
                  <section className="space-y-6 pt-10 border-t">
                    <h3 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center text-[10px]">2</div>
                      Selección de Alumnos
                    </h3>
                    
                    <div className="flex gap-4 p-1 bg-secondary/20 rounded-2xl h-14">
                      <Button variant="ghost" onClick={() => setAssignmentMode('course')} className={cn("flex-1 rounded-xl font-bold gap-2", assignmentMode === 'course' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}>
                        <BookOpen className="h-4 w-4" /> Por Curso Finalizado
                      </Button>
                      <Button variant="ghost" onClick={() => setAssignmentMode('free')} className={cn("flex-1 rounded-xl font-bold gap-2", assignmentMode === 'free' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}>
                        <UserPlus className="h-4 w-4" /> Selección Libre
                      </Button>
                    </div>

                    {assignmentMode === 'course' && (
                      <div className="space-y-4 animate-in slide-in-from-top-2">
                        <Select onValueChange={setSelectedCourseId} value={selectedCourseId}>
                          <SelectTrigger className="h-12 rounded-xl border-2">
                            <SelectValue placeholder="Elegir curso para filtrar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {mentorCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-2 items-start mt-4">
                          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                          <p className="text-[10px] text-blue-800 font-medium">El sistema solo mostrará alumnos que han completado el 100% de los módulos del curso seleccionado.</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar alumno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-11 rounded-xl bg-secondary/5 border-none" />
                      </div>

                      <div className="border rounded-2xl overflow-hidden bg-slate-50">
                        <div className="p-3 bg-white border-b flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground ml-2">Candidatos ({students.length})</span>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedStudentIds(students.map(s => s.id))} className="text-[10px] font-bold h-7 uppercase">Marcar Todos</Button>
                        </div>
                        <ScrollArea className="h-[250px]">
                          <div className="p-2 space-y-1">
                            {loading ? (
                              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                            ) : students.length === 0 ? (
                              <div className="py-10 text-center italic text-xs text-muted-foreground">No se encontraron alumnos bajo este criterio.</div>
                            ) : filteredStudents.map(s => (
                              <div key={s.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-transparent hover:border-primary/20 transition-colors group">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center font-bold text-xs">{s.displayName?.[0] || 'A'}</div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold">{s.displayName}</span>
                                    <span className="text-[10px] text-muted-foreground">{s.email}</span>
                                  </div>
                                </div>
                                <Checkbox 
                                  checked={selectedStudentIds.includes(s.id)} 
                                  onCheckedChange={(val) => {
                                    if (val) setSelectedStudentIds([...selectedStudentIds, s.id]);
                                    else setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                                  }} 
                                  className="h-5 w-5 rounded-lg border-2"
                                />
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="p-8 bg-slate-50 border-t shrink-0">
              <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm font-medium text-slate-500">
                  <span className="font-bold text-primary">{selectedStudentIds.length}</span> alumnos seleccionados para envío.
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="rounded-xl font-bold h-12 px-8">Cancelar</Button>
                  <Button 
                    onClick={handleCreateChallenges} 
                    disabled={loading || selectedStudentIds.length === 0 || !taskData.title}
                    className="flex-1 md:flex-none h-12 px-10 rounded-xl font-bold bg-primary shadow-xl gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />} Asignar Desafío Masivo
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AlertDialog: Purge Tasks */}
        <AlertDialog open={isPurgeOpen} onOpenChange={(open) => { setIsPurgeOpen(open); if(!open) clearUILocks(); }}>
          <AlertDialogContent className="rounded-[2.5rem] p-10 max-w-md border-none shadow-3xl">
            <AlertDialogHeader className="items-center text-center">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6">
                <AlertTriangle className="h-10 w-10" />
              </div>
              <AlertDialogTitle className="text-2xl font-bold">¿Vaciar Todo el Historial?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 leading-relaxed">
                Esta acción eliminará <strong>definitivamente</strong> todos los desafíos asignados que se muestran en tu tablero actual. Esta operación no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
              <AlertDialogCancel className="flex-1 h-12 rounded-xl font-bold border-2">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handlePurgeTasks} disabled={loading} className="flex-1 h-12 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 shadow-lg text-white">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />} Confirmar Purga
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
