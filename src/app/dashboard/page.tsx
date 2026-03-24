
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  GraduationCap, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  UserCheck,
  PlayCircle,
  Clock,
  Activity,
  ClipboardList,
  Target,
  Zap,
  Calendar,
  ChevronRight,
  UserCircle,
  Trophy,
  Library,
  Cpu,
  Rocket,
  ArrowRight,
  MousePointer2
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, limit, getDocs, orderBy, collectionGroup, or, and, doc, getDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { TermsUsageModal } from '@/components/terms-usage-modal';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function DashboardPage() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const db = useFirestore();
  const router = useRouter();

  const roles = profile?.roles || [];
  const isAdmin = roles.includes('admin');
  const isMentor = roles.includes('mentor');
  const isStudent = roles.includes('alumno');

  // --- QUERIES PARA MENTOR / ADMIN ---
  const mentorCoursesQuery = useMemoFirebase(() => {
    if (!profile?.uid || isAuthLoading || (!isMentor && !isAdmin)) return null;
    const coursesRef = collection(db, 'courses');
    if (isMentor) return query(coursesRef, where('mentorId', '==', profile.uid), limit(10));
    if (isAdmin) return query(coursesRef, limit(10));
    return null;
  }, [profile?.uid, db, isMentor, isAdmin, isAuthLoading]);
  const { data: mentorCoursesRaw } = useCollection(mentorCoursesQuery);

  const mentorCourses = useMemo(() => {
    if (!mentorCoursesRaw) return [];
    return [...mentorCoursesRaw].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
      const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
      return dateB - dateA;
    }).slice(0, 5);
  }, [mentorCoursesRaw]);

  // Query de Automatizaciones Activas (Para Resumen Dashboard)
  const activeCampaignsQuery = useMemoFirebase(() => {
    if (!profile?.uid || isAuthLoading || (!isMentor && !isAdmin)) return null;
    return query(
      collection(db, 'campaigns'), 
      where('mentorId', '==', profile.uid),
      where('isActive', '==', true),
      where('autoPilot', '==', true)
    );
  }, [db, profile?.uid, isMentor, isAdmin, isAuthLoading]);
  const { data: activeCampaigns } = useCollection(activeCampaignsQuery);

  const todayAutomationActions = useMemo(() => {
    if (!activeCampaigns) return [];
    const actions: any[] = [];
    activeCampaigns.forEach(camp => {
      const start = camp.startDate ? new Date(camp.startDate) : new Date(camp.createdAt.seconds * 1000);
      const diff = differenceInDays(new Date(), start) + 1;
      const today = camp.strategy?.timeline?.filter((e: any) => e.day === diff) || [];
      if (today.length > 0) {
        actions.push({ campTitle: camp.title, actions: today });
      }
    });
    return actions;
  }, [activeCampaigns]);

  const recentFollowUpsQuery = useMemoFirebase(() => {
    if (!profile?.uid || isAuthLoading) return null;
    const ref = collection(db, 'followups');
    if (isAdmin) return query(ref, limit(10));
    if (isMentor) return query(ref, where('mentorId', '==', profile.uid), limit(10));
    
    // Alumno: Aseguramos email para evitar queries invalidas
    const studentEmail = profile.email?.toLowerCase().trim();
    if (!studentEmail) return query(ref, where('studentId', '==', profile.uid), limit(10));
    
    return query(ref, or(where('studentId', '==', profile.uid), where('studentEmail', '==', studentEmail)), limit(10));
  }, [db, profile?.uid, profile?.email, isMentor, isAdmin, isAuthLoading]);
  const { data: recentFollowUpsRaw } = useCollection(recentFollowUpsQuery);

  const recentFollowUps = useMemo(() => {
    if (!recentFollowUpsRaw) return [];
    return [...recentFollowUpsRaw].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
      const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
      return dateB - dateA;
    }).slice(0, 5);
  }, [recentFollowUpsRaw]);

  const [courseDetails, setCourseDetails] = useState<Record<string, any>>({});
  const [followUpSessionStats, setFollowUpSessionStats] = useState<Record<string, { consumed: number }>>({});

  const recentChallengesQuery = useMemoFirebase(() => {
    if (!profile?.uid || isAuthLoading) return null;
    const ref = collectionGroup(db, 'individualTasks');
    if (isAdmin || isMentor) return query(ref, where('mentorId', '==', profile.uid), limit(50));
    
    // Alumno: Aseguramos email
    const studentEmail = profile.email?.toLowerCase().trim();
    if (!studentEmail) return query(ref, where('studentId', '==', profile.uid), limit(20));

    return query(ref, or(where('studentId', '==', profile.uid), where('studentEmail', '==', studentEmail)), limit(20));
  }, [db, profile?.uid, profile?.email, isMentor, isAdmin, isAuthLoading]);
  const { data: recentChallengesRaw } = useCollection(recentChallengesQuery);

  const sortedTasks = useMemo(() => {
    if (!recentChallengesRaw) return [];
    return [...recentChallengesRaw].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
      const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
      return dateB - dateA;
    });
  }, [recentChallengesRaw]);

  const studentEnrollmentsQuery = useMemoFirebase(() => {
    if (!profile?.uid || isAuthLoading || (!isStudent && !isAdmin)) return null;
    return query(collection(db, 'enrollments'), or(where('studentId', '==', profile.uid), where('inviteEmail', '==', profile.email?.toLowerCase().trim())), limit(10));
  }, [db, profile?.uid, profile?.email, isStudent, isAdmin, isAuthLoading]);
  const { data: studentEnrollments } = useCollection(studentEnrollmentsQuery);

  // --- NUEVA QUERY: RESUMEN DE MARKETING ---
  const marketingStatsQuery = useMemoFirebase(() => {
    if (!profile?.uid || isAuthLoading || (!isMentor && !isAdmin)) return null;
    return query(collection(db, 'salesPages'), where('mentorId', '==', profile.uid), limit(50));
  }, [db, profile?.uid, isMentor, isAdmin, isAuthLoading]);
  const { data: rawMarketingPages } = useCollection(marketingStatsQuery);

  const marketingPages = useMemo(() => {
    if (!rawMarketingPages) return null;
    return [...rawMarketingPages].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
      const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
      return dateB - dateA;
    });
  }, [rawMarketingPages]);

  const aggregateMarketingStats = useMemo(() => {
    if (!marketingPages) return { clicks: 0, conversions: 0, impacts: 0 };
    return marketingPages.reduce((acc, p) => ({
      clicks: acc.clicks + (p.stats?.totalClicks || 0),
      conversions: acc.conversions + (p.stats?.conversions || 0),
      impacts: acc.impacts + (p.stats?.totalImpressions || 0)
    }), { clicks: 0, conversions: 0, impacts: 0 });
  }, [marketingPages]);

  useEffect(() => {
    if (isStudent && studentEnrollments) {
      const fetchEnrollmentDetails = async () => {
        const details: Record<string, any> = {};
        for (const enroll of studentEnrollments) {
          try {
            const courseSnap = await getDoc(doc(db, 'courses', enroll.courseId));
            if (courseSnap.exists()) {
              const courseData = courseSnap.data();
              if (!courseData.modulesCount) {
                const modsSnap = await getDocs(collection(db, 'courses', enroll.courseId, 'modules'));
                courseData.modulesCount = modsSnap.size;
              }
              details[enroll.courseId] = courseData;
            }
          } catch (e) {}
        }
        setCourseDetails(prev => ({ ...prev, ...details }));
      };
      fetchEnrollmentDetails();
    }
  }, [isStudent, studentEnrollments, db]);

  useEffect(() => {
    if (recentFollowUps && recentFollowUps.length > 0) {
      const fetchSessionStats = async () => {
        const stats: Record<string, { consumed: number }> = {};
        for (const fu of recentFollowUps) {
          try {
            const sessionsSnap = await getDocs(query(collection(db, 'followups', fu.id, 'sessions'), where('isCompleted', '==', true)));
            stats[fu.id] = { consumed: sessionsSnap.size };
          } catch (e) {}
        }
        setFollowUpSessionStats(prev => ({ ...prev, ...stats }));
      };
      fetchSessionStats();
    }
  }, [recentFollowUps, db]);

  const groupedDashboardChallenges = useMemo(() => {
    if (!sortedTasks || (!isMentor && !isAdmin)) return [];
    const groups: Record<string, any> = {};
    sortedTasks.forEach(task => {
      const key = task.title + task.description;
      if (!groups[key]) {
        groups[key] = { id: task.id, title: task.title, description: task.description, createdAt: task.createdAt, total: 0, completed: 0, tasks: [] as any[] };
      }
      groups[key].total++;
      if (task.status === 'completed') groups[key].completed++;
      groups[key].tasks.push(task);
    });
    return Object.values(groups).slice(0, 5);
  }, [sortedTasks, isMentor, isAdmin]);

  const allUsersQuery = useMemoFirebase(() => {
    if (!profile?.uid || !isAdmin || isAuthLoading) return null;
    return collection(db, 'users');
  }, [db, isAdmin, isAuthLoading, profile?.uid]);
  const { data: allUsers } = useCollection(allUsersQuery);

  const globalCoursesQuery = useMemoFirebase(() => {
    if (!profile?.uid || !isAdmin || isAuthLoading) return null;
    return collection(db, 'courses');
  }, [db, isAdmin, isAuthLoading, profile?.uid]);
  const { data: globalCourses } = useCollection(globalCoursesQuery);

  const [mentorInscriptions, setMentorInscriptions] = useState<any[]>([]);
  useEffect(() => {
    if (isMentor && mentorCourses && mentorCourses.length > 0) {
      const fetchInscriptions = async () => {
        try {
          const courseIds = mentorCourses.map(c => c.id);
          const allEnrollments: any[] = [];
          for (let i = 0; i < courseIds.length; i += 30) {
            const chunk = courseIds.slice(i, i + 30);
            const q = query(collection(db, 'enrollments'), where('courseId', 'in', chunk));
            const snap = await getDocs(q);
            snap.forEach(doc => allEnrollments.push({ ...doc.data(), id: doc.id }));
          }
          setMentorInscriptions(allEnrollments);
        } catch (e) {}
      };
      fetchInscriptions();
    }
  }, [isMentor, mentorCourses, db]);

  if (isAuthLoading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-10 w-10 animate-spin text-accent/20" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <TermsUsageModal />
      <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-8">
          <div>
            <div className="flex items-center gap-2 text-accent mb-2">
              <Activity className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-[0.3em]">
                {isAdmin ? "Infraestructura" : isMentor ? "Gestión Docente" : "Trayectoria Académica"}
              </span>
            </div>
            <h1 className="text-4xl font-headline font-bold text-slate-900 tracking-tight">
              {isAdmin ? "Panel Global" : isMentor ? "Mi Panel de Mentor" : "Mi Evolución"}
            </h1>
            <p className="text-slate-500 font-medium mt-1 inline-flex items-center gap-2">
              {isAdmin ? "Control total del ecosistema." : `Bienvenido de nuevo, ${profile.displayName}.`}
              <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-md font-mono">v1.0.1-prod</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Badge className="bg-slate-900 text-white px-4 py-1.5 rounded-xl font-bold uppercase tracking-widest text-[9px] border-none shadow-xl">
                <ShieldCheck className="h-3.5 w-3.5 mr-2 text-emerald-400" /> Admin Global
              </Badge>
            )}
            {isMentor && (
              <Badge variant="outline" className="bg-white text-primary border-primary/20 px-4 py-1.5 rounded-xl font-bold uppercase tracking-widest text-[9px] shadow-sm">
                <GraduationCap className="h-3.5 w-3.5 mr-2 text-accent" /> Mentor Autorizado
              </Badge>
            )}
          </div>
        </header>

        <div className="space-y-10">
          {(isMentor || isAdmin) && todayAutomationActions.length > 0 && (
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-slate-900 text-white overflow-hidden relative group">
              <Cpu className="absolute -right-4 -top-4 h-32 w-32 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700" />
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center shadow-lg"><Zap className="h-5 w-5 fill-current" /></div>
                  <div>
                    <CardTitle className="text-xl">Próximos Despliegues (Hoy)</CardTitle>
                    <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Evo Automation Engine listo</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1 space-y-4">
                  {todayAutomationActions.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                      <Rocket className="h-4 w-4 text-accent" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-200">{item.campTitle}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{item.actions.length} acciones coordinadas pendientes.</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/mentoria/marketing/execution">
                  <Button className="h-14 px-8 rounded-2xl font-bold bg-accent hover:bg-accent/90 shadow-2xl gap-2">
                    Ir al Centro de Mando <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] px-1">Infraestructura Global</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={GraduationCap} label="Mentores" value={new Set(allUsers?.filter(u => u.roles?.includes('mentor')).map(u => u.email)).size} color="accent" />
                <StatCard icon={Users} label="Alumnos" value={new Set(allUsers?.filter(u => u.roles?.includes('alumno')).map(u => u.email)).size} color="blue" />
                <StatCard icon={BookOpen} label="Programas" value={globalCourses?.length || 0} color="slate" />
                <StatCard icon={UserCheck} label="Activos" value={allUsers?.filter(u => u.isActive !== false).length || 0} color="emerald" />
              </div>
            </div>
          )}

          {isMentor && !isAdmin && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] px-1">Métricas de Enseñanza y Alcance</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={BookOpen} label="Mis Programas" value={mentorCourses?.length || 0} color="slate" />
                <StatCard icon={Users} label="Estudiantes" value={new Set(mentorInscriptions.map(e => e.inviteEmail)).size} color="blue" />
                <StatCard icon={MousePointer2} label="Clicks Totales" value={aggregateMarketingStats.clicks} color="purple" />
                <StatCard icon={Target} label="Conversiones" value={aggregateMarketingStats.conversions} color="emerald" />
              </div>
            </div>
          )}

          {isStudent && !isMentor && !isAdmin && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] px-1">Mi Desempeño Académico</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Library} label="Mis Cursos" value={studentEnrollments?.length || 0} color="blue" />
                <StatCard icon={Zap} label="Desafíos Pendientes" value={sortedTasks?.filter(t => t.status === 'pending').length || 0} color="amber" />
                <StatCard icon={ClipboardList} label="Seguimientos" value={recentFollowUps?.length || 0} color="accent" />
                <StatCard icon={Trophy} label="Logros IA" value={sortedTasks?.filter(t => t.status === 'completed').length || 0} color="emerald" />
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-16">
          <section className="space-y-8">
            <div className="flex justify-between items-end px-1">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {isMentor || isAdmin ? "Programas Recientes" : "Mis Programas en Marcha"}
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  {isMentor || isAdmin ? "Estado de matrícula y publicación." : "Tu progreso y acceso a contenidos."}
                </p>
              </div>
              <Link href={isMentor || isAdmin ? "/courses/manage" : "/my-courses"}>
                <Button variant="outline" className="rounded-xl font-bold border-2 h-11 px-6 shadow-sm">
                  Ver todo <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid gap-6">
              {(isMentor || isAdmin) ? (
                mentorCourses?.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground italic">No se han registrado programas recientemente.</p>
                ) : mentorCourses?.map((course) => {
                  const courseInscriptions = mentorInscriptions.filter(e => e.courseId === course.id);
                  return (
                    <Card key={course.id} className="border-none shadow-lg overflow-hidden rounded-3xl bg-white group hover:shadow-xl transition-all duration-500">
                      <div className="flex flex-col lg:flex-row items-stretch">
                        <div className="relative w-full lg:w-32 h-20 lg:h-auto bg-slate-100 overflow-hidden shrink-0">
                          <Image src={`https://loremflickr.com/600/400/education,course?lock=${course.id}`} alt={course.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
                        </div>
                        <div className="py-2.5 px-8 flex-1 flex flex-col lg:flex-row justify-between items-center gap-6">
                          <div className="text-center lg:text-left flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-accent transition-colors leading-tight line-clamp-1">{course.title}</h3>
                            <div className="flex flex-wrap justify-center lg:justify-start gap-2 mt-1">
                              <Badge className={cn("px-2 py-0 text-[7px] uppercase font-black", course.isActive ? "bg-emerald-500" : "bg-slate-200 text-slate-600")}>{course.isActive ? 'Público' : 'Borrador'}</Badge>
                              <Badge variant="outline" className="px-2 py-0 text-[7px] uppercase font-black">{course.category || 'General'}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 bg-slate-50/50 px-6 py-2 rounded-2xl border border-slate-100 shrink-0">
                            <MetricMonumental icon={Users} label="Alumnos" value={courseInscriptions.length} color="slate" />
                            <div className="w-px h-8 bg-slate-200/60" />
                            <MetricMonumental icon={CheckCircle2} label="Activos" value={courseInscriptions.filter(e => e.status === 'active').length} color="emerald" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                studentEnrollments?.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground italic">No estás inscrito en ningún programa actualmente.</p>
                ) : studentEnrollments?.slice(0, 3).map((enroll) => {
                  const details = courseDetails[enroll.courseId];
                  const completedModulesCount = enroll.progress?.completedModules?.length || 0;
                  const totalModules = details?.modulesCount || 1;
                  const progressPercent = Math.min(100, Math.round((completedModulesCount / totalModules) * 100));
                  const isFinished = progressPercent >= 100;

                  return (
                    <Card key={enroll.id} className="border-none shadow-lg rounded-3xl bg-white overflow-hidden group hover:shadow-xl transition-all">
                      <div className="p-6 flex flex-col lg:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-14 h-14 relative rounded-2xl overflow-hidden shrink-0 border-2 border-white shadow-md">
                            <Image src={`https://loremflickr.com/200/200/education,student?lock=${enroll.courseId}`} alt="Course" fill className="object-cover" unoptimized />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{details?.title || enroll.courseName || `Programa: ${enroll.courseId.substring(0, 8)}`}</h3>
                            <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <ShieldCheck className={cn("h-3 w-3", isFinished ? "text-emerald-500" : "text-accent")} /> 
                              {isFinished ? 'Programa Completado' : `Acceso: ${enroll.status === 'active' ? 'Autorizado' : 'Pendiente'}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8 shrink-0 w-full lg:w-auto">
                          <div className="flex-1 lg:w-48 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                              <span>Progreso</span>
                              <span className="text-primary">{completedModulesCount} / {totalModules} módulos</span>
                            </div>
                            <Progress value={progressPercent} className="h-1.5 bg-secondary" />
                          </div>
                          <Link href={`/courses/${enroll.courseId}`}>
                            <Button className={cn("rounded-xl font-bold h-11 px-6 shadow-md gap-2", isFinished ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary")}>
                              {isFinished ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                              {isFinished ? 'Ver curso terminado' : 'Continuar'}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex justify-between items-end px-1">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {isMentor || isAdmin ? "Desafíos Globales" : "Mis Desafíos de Evolución"}
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  {isMentor || isAdmin ? "Cumplimiento de consignas por grupo." : "Tareas individuales y proyectos evaluados por IA."}
                </p>
              </div>
              <Link href={isMentor || isAdmin ? "/mentoria/desafios" : "/tasks"}>
                <Button variant="outline" className="rounded-xl font-bold border-2 h-11 px-6 shadow-sm">
                  Ver Tablero <Zap className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-6">
              {(isMentor || isAdmin) ? (
                groupedDashboardChallenges.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground italic">No hay desafíos asignados recientemente.</p>
                ) : groupedDashboardChallenges.map((group: any, gIdx: number) => {
                  const isMassive = group.total > 1;
                  const percent = Math.round((group.completed / group.total) * 100);
                  return (
                    <Card key={gIdx} className="border-none shadow-lg rounded-3xl bg-white overflow-hidden group hover:shadow-xl transition-all">
                      <div className="p-6 flex flex-col lg:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0", isMassive ? "bg-accent" : "bg-primary")}>
                            {isMassive ? <Users className="h-6 w-6" /> : <Target className="h-6 w-6" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{group.title}</h3>
                              <Badge variant="secondary" className={cn("text-[7px] uppercase font-black px-1.5 h-4 border-none", isMassive ? "bg-accent/10 text-accent" : "bg-slate-100 text-slate-500")}>{isMassive ? 'Masivo' : 'Individual'}</Badge>
                            </div>
                            <p className="text-xs font-medium text-slate-500">{isMassive ? `${group.total} alumnos asignados` : `Para: ${group.tasks[0]?.studentName}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8 shrink-0">
                          <div className="text-center">
                            <p className="text-lg font-black text-slate-800 leading-none">{group.completed}</p>
                            <p className="text-[7px] font-bold uppercase text-slate-400 mt-0.5">Entregas</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-black text-accent leading-none">{percent}%</p>
                            <p className="text-[7px] font-bold uppercase text-slate-400 mt-0.5">Cumplimiento</p>
                          </div>
                          <Link href={isMassive ? "/mentoria/desafios" : `/alumnos/${group.tasks[0]?.studentId}`}>
                            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10"><ChevronRight className="h-5 w-5" /></Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                sortedTasks?.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground italic">No tienes desafíos pendientes por el momento.</p>
                ) : sortedTasks?.slice(0, 3).map((task) => (
                  <Card key={task.id} className="border-none shadow-lg rounded-3xl bg-white overflow-hidden group hover:shadow-xl transition-all">
                    <div className="p-6 flex flex-col lg:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0", task.status === 'completed' ? "bg-emerald-500" : "bg-accent")}>
                          <Zap className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{task.title}</h3>
                          <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5"><GraduationCap className="h-3 w-3" /> Mentor: {task.mentorName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 shrink-0">
                        <div className="text-center">
                          <Badge className={cn("px-2 py-0.5 rounded-full text-[8px] uppercase font-black border-none", task.status === 'completed' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white")}>
                            {task.status === 'completed' ? 'Finalizado' : 'Pendiente'}
                          </Badge>
                          <p className="text-[8px] font-bold uppercase text-slate-400 mt-1">Estado</p>
                        </div>
                        {task.status === 'completed' && (
                          <div className="text-center">
                            <p className="text-xl font-black text-emerald-600 leading-none">{task.score}%</p>
                            <p className="text-[8px] font-bold uppercase text-slate-400 mt-1">Nota IA</p>
                          </div>
                        )}
                        <Link href="/tasks">
                          <Button variant={task.status === 'completed' ? "outline" : "default"} className="rounded-xl font-bold h-11 px-6 shadow-md">
                            {task.status === 'completed' ? 'Ver Feedback' : 'Responder'}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex justify-between items-end px-1">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {isMentor || isAdmin ? "Seguimientos Estratégicos" : "Mis Programas de Acompañamiento"}
                </h2>
                <p className="text-sm text-slate-500 font-medium">Acompañamiento personalizado y sesiones de mentoría.</p>
              </div>
              <Link href="/seguimientos">
                <Button variant="outline" className="rounded-xl font-bold border-2 h-11 px-6 shadow-sm">
                  Calendario <Calendar className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-6">
              {recentFollowUps?.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground italic">No hay programas de seguimiento activos.</p>
              ) : recentFollowUps?.map((fu) => {
                const sessionStats = followUpSessionStats[fu.id];
                return (
                  <Card key={fu.id} className="border-none shadow-lg rounded-3xl bg-white overflow-hidden group hover:shadow-xl transition-all">
                    <div className="p-6 flex flex-col lg:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center font-bold border shrink-0">
                          <UserCircle className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{fu.title}</h3>
                          <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5"><Target className="h-3 w-3" /> {isMentor || isAdmin ? `Alumno: ${fu.studentName}` : `Objetivo: ${fu.goal}`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 shrink-0">
                        <div className="text-center">
                          <p className="text-2xl font-black text-primary leading-none">
                            {sessionStats?.consumed || 0} / {fu.totalSessions}
                          </p>
                          <p className="text-[8px] font-bold uppercase text-slate-400 mt-1">Sesiones Realizadas</p>
                        </div>
                        <div className="text-center">
                          <Badge className={cn("px-2 py-0.5 rounded-full text-[8px] uppercase font-black border-none", fu.status === 'active' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                            {fu.status === 'active' ? 'En Curso' : 'Pausado'}
                          </Badge>
                          <p className="text-[8px] font-bold uppercase text-slate-400 mt-1">Estado</p>
                        </div>
                        <Link href={`/seguimientos/${fu.id}`}>
                          <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-primary hover:bg-primary/5"><ChevronRight className="h-5 w-5" /></Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricMonumental({ icon: Icon, label, value, color }: any) {
  const colors: any = {
    slate: "text-slate-400",
    emerald: "text-emerald-500",
    amber: "text-amber-500"
  };
  return (
    <div className="flex flex-col items-center gap-0">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-5 w-5", colors[color])} />
        <span className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{value}</span>
      </div>
      <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-0.5">{label}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: any = {
    accent: "bg-accent/10 text-accent",
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    purple: "bg-purple-100 text-purple-700"
  };
  return (
    <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden group transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl transition-transform duration-500 group-hover:rotate-6 ${colors[color] || colors.slate}`}>
            <Icon className="h-6 w-6" />
          </div>
          <span className="text-3xl font-headline font-bold text-slate-900 tracking-tighter">{value}</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}
