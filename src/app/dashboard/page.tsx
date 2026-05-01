'use client';

export const dynamic = 'force-dynamic';

import { useAuth } from '@/components/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { 
  BookOpen, 
  GraduationCap, 
  Users, 
  ShieldCheck, 
  Loader2, 
  UserCheck,
  Activity,
  Target,
  Zap,
  Calendar,
  ChevronRight,
  Trophy,
  Library,
  Cpu,
  Rocket,
  ArrowRight,
  MousePointer2,
  CheckCircle2,
  ClipboardList
} from 'lucide-react';
import Link from 'next/link';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { TermsUsageModal } from '@/components/terms-usage-modal';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// Shared Student Components
import { StudentPageHeader } from '@/components/student/PageHeader';
import { StudentStatCard } from '@/components/student/StatCard';
import { StudentCourseCard } from '@/components/student/CourseCard';
import { StudentTaskCard } from '@/components/student/TaskCard';
import { StudentFollowUpCard } from '@/components/student/FollowUpCard';

// Hooks
import { useStudentEnrollments } from '@/hooks/student/useStudentEnrollments';
import { useStudentTasks } from '@/hooks/student/useStudentTasks';
import { useStudentFollowUps } from '@/hooks/student/useStudentFollowUps';

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-10 w-10 animate-spin text-accent/20" />
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const { profile, isLoading: isAuthLoading, refreshProfile } = useAuth();
  const db = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      // Forzar actualización del perfil para ver el nuevo rol de mentor
      if (refreshProfile) refreshProfile();
      
      toast({
        title: "¡Bienvenido, Mentor! 🚀",
        description: "Tu suscripción ha sido activada con éxito. Ya tienes acceso a todas las herramientas de IA.",
        className: "bg-indigo-600 text-white border-none shadow-2xl",
      });
      
      // Limpiar la URL
      router.replace('/dashboard');
    }
  }, [searchParams, refreshProfile, toast, router]);

  // Roles y flags
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

  const mentorCourses = useMemoFirebase(() => {
    if (!mentorCoursesRaw) return [];
    return [...mentorCoursesRaw].sort((a: any, b: any) => {
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

  const todayAutomationActions = useMemoFirebase(() => {
    if (!activeCampaigns) return [];
    const actions: any[] = [];
    activeCampaigns.forEach((camp: any) => {
      const start = camp.startDate ? new Date(camp.startDate) : new Date(camp.createdAt.seconds * 1000);
      const diff = differenceInDays(new Date(), start) + 1;
      const today = camp.strategy?.timeline?.filter((e: any) => e.day === diff) || [];
      if (today.length > 0) {
        actions.push({ campTitle: camp.title, actions: today });
      }
    });
    return actions;
  }, [activeCampaigns]);

  // --- NUEVA QUERY: RESUMEN DE MARKETING ---
  const marketingStatsQuery = useMemoFirebase(() => {
    if (!profile?.uid || isAuthLoading || (!isMentor && !isAdmin)) return null;
    return query(collection(db, 'salesPages'), where('mentorId', '==', profile.uid), limit(50));
  }, [db, profile?.uid, isMentor, isAdmin, isAuthLoading]);
  const { data: rawMarketingPages } = useCollection(marketingStatsQuery);

  const aggregateMarketingStats = useMemoFirebase(() => {
    if (!rawMarketingPages) return { clicks: 0, conversions: 0, impacts: 0 };
    return rawMarketingPages.reduce((acc: any, p: any) => ({
      clicks: acc.clicks + (p.stats?.totalClicks || 0),
      conversions: acc.conversions + (p.stats?.conversions || 0),
      impacts: acc.impacts + (p.stats?.totalImpressions || 0)
    }), { clicks: 0, conversions: 0, impacts: 0 });
  }, [rawMarketingPages]);

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
      <DashboardContent 
        profile={profile}
        isAdmin={isAdmin}
        isMentor={isMentor}
        isStudent={isStudent}
        allUsers={allUsers}
        globalCourses={globalCourses}
        mentorCourses={mentorCourses}
        aggregateMarketingStats={aggregateMarketingStats}
        todayAutomationActions={todayAutomationActions}
        isAuthLoading={isAuthLoading}
      />
    </DashboardLayout>
  );
}

const DashboardContent = ({ 
  profile, 
  isAdmin, 
  isMentor, 
  isStudent,
  allUsers,
  globalCourses,
  mentorCourses,
  aggregateMarketingStats,
  todayAutomationActions,
  isAuthLoading
}: any) => {
  const db = useFirestore();

  // 1. Hooks de datos (Solo se activan cuando DashboardContent se monta)
  const { enrollments: studentEnrollments, isLoading: loadingEnrollments } = useStudentEnrollments();
  const { tasks: sortedTasks, pendingTasks, completedTasks, isLoading: loadingTasks } = useStudentTasks(20);
  const { followUps: recentFollowUps, sessionStats: followUpSessionStats, isLoading: loadingFollowUps } = useStudentFollowUps();

  // 2. Query de Inscripciones de Mentor
  const [mentorInscriptions, setMentorInscriptions] = useState<any[]>([]);
  useEffect(() => {
    const fetchInscriptions = async () => {
      if (isMentor && mentorCourses && mentorCourses.length > 0) {
        try {
          const courseIds = mentorCourses.map((c: any) => c.id);
          const allEnrollments: any[] = [];
          for (let i = 0; i < courseIds.length; i += 30) {
            const chunk = courseIds.slice(i, i + 30);
            const q = query(collection(db, 'enrollments'), where('courseId', 'in', chunk));
            const snap = await getDocs(q);
            snap.forEach(doc => allEnrollments.push({ ...doc.data(), id: doc.id }));
          }
          setMentorInscriptions(allEnrollments);
        } catch (e) {
          console.error("[Dashboard] Error fetching inscriptions:", e);
        }
      }
    };
    fetchInscriptions();
  }, [isMentor, mentorCourses, db]);

  // 3. Procesamiento de datos (Challenges agrupados)
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

  const isLoading = loadingEnrollments || loadingTasks || loadingFollowUps;
  return (
    <div className="space-y-10 md:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto">
      <StudentPageHeader 
        icon={Activity}
        category={isAdmin ? "Infraestructura" : isMentor ? "Gestión Docente" : "Trayectoria Académica"}
        title={isAdmin ? "Panel Global" : isMentor ? "Mi Panel de Mentor" : "Mi Evolución"}
        description={isAdmin ? "Control total del ecosistema." : `Bienvenido de nuevo, ${profile.displayName}.`}
        version="v1.0.1-prod"
        badges={[
          ...(isAdmin ? [{ icon: ShieldCheck, label: "Admin Global", iconClassName: "text-emerald-400" }] : []),
          ...(isMentor ? [{ icon: GraduationCap, label: "Mentor Autorizado", variant: 'outline' as const, className: "bg-white text-primary border-primary/20", iconClassName: "text-accent" }] : [])
        ]}
      />

        <div className="space-y-8 md:space-y-10">
          {(isMentor || isAdmin) && todayAutomationActions.length > 0 && (
            <Card className="border-none shadow-2xl rounded-[2rem] md:rounded-[2.5rem] bg-slate-900 text-white overflow-hidden relative group">
              <Cpu className="absolute -right-4 -top-4 h-24 md:h-32 w-24 md:w-32 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700" />
              <CardHeader className="p-6 md:p-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center shadow-lg"><Zap className="h-5 w-5 fill-current" /></div>
                  <div>
                    <CardTitle className="text-lg md:text-xl">Próximos Despliegues (Hoy)</CardTitle>
                    <CardDescription className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Evo Automation Engine listo</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 md:p-8 pt-0 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
                <div className="flex-1 space-y-3 md:space-y-4">
                  {todayAutomationActions.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10">
                      <Rocket className="h-4 w-4 text-accent" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{item.campTitle}</p>
                        <p className="text-[9px] md:text-[10px] text-slate-500 uppercase">{item.actions.length} acciones coordinadas pendientes.</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/mentoria/marketing/execution" className="w-full md:w-auto">
                  <Button className="w-full h-12 md:h-14 px-8 rounded-xl md:rounded-2xl font-bold bg-accent hover:bg-accent/90 shadow-2xl gap-2">
                    Ir al Centro de Mando <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <div className="space-y-4">
              <h2 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] px-1">Infraestructura Global</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StudentStatCard icon={GraduationCap} label="Mentores" value={new Set(allUsers?.filter((u: any) => u.roles?.includes('mentor')).map((u: any) => u.email)).size} color="accent" />
                <StudentStatCard icon={Users} label="Alumnos" value={new Set(allUsers?.filter((u: any) => u.roles?.includes('alumno')).map((u: any) => u.email)).size} color="blue" />
                <StudentStatCard icon={BookOpen} label="Programas" value={globalCourses?.length || 0} color="slate" />
                <StudentStatCard icon={UserCheck} label="Activos" value={allUsers?.filter((u: any) => u.isActive !== false).length || 0} color="emerald" />
              </div>
            </div>
          )}

          {isMentor && !isAdmin && (
            <div className="space-y-4">
              <h2 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] px-1">Métricas de Enseñanza y Alcance</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StudentStatCard icon={BookOpen} label="Mis Programas" value={mentorCourses?.length || 0} color="slate" />
                <StudentStatCard icon={Users} label="Estudiantes" value={new Set(mentorInscriptions.map((e: any) => e.inviteEmail)).size} color="blue" />
                <StudentStatCard icon={MousePointer2} label="Clicks Totales" value={aggregateMarketingStats.clicks} color="purple" />
                <StudentStatCard icon={Target} label="Conversiones" value={aggregateMarketingStats.conversions} color="emerald" />
              </div>
            </div>
          )}

          {isStudent && !isMentor && !isAdmin && (
            <div className="space-y-4">
              <h2 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] px-1">Mi Desempeño Académico</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StudentStatCard icon={Library} label="Mis Cursos" value={studentEnrollments?.length || 0} color="blue" />
                <StudentStatCard icon={Zap} label="Desafíos Pendientes" value={pendingTasks?.length || 0} color="amber" />
                <StudentStatCard icon={ClipboardList} label="Seguimientos" value={recentFollowUps?.length || 0} color="accent" />
                <StudentStatCard icon={Trophy} label="Logros IA" value={completedTasks?.length || 0} color="emerald" />
              </div>
            </div>
          )}
        </div>
        <div className="grid gap-12 md:gap-16">
          <section className="space-y-6 md:space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-1">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                  {isMentor || isAdmin ? "Programas Recientes" : "Mis Programas en Marcha"}
                </h2>
                <p className="text-xs md:text-sm text-slate-500 font-medium">
                  {isMentor || isAdmin ? "Estado de matrícula y publicación." : "Tu progreso y acceso a contenidos."}
                </p>
              </div>
              <Link href={isMentor || isAdmin ? "/courses/manage" : "/my-courses"} className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto rounded-xl font-bold border-2 h-10 md:h-11 px-6 shadow-sm">
                  Ver todo <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid gap-4 md:gap-6">
              {(isMentor || isAdmin) ? (
                mentorCourses?.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground italic">No se han registrado programas recientemente.</p>
                ) : mentorCourses?.map((course: any) => {
                  const courseInscriptions = mentorInscriptions.filter((e: any) => e.courseId === course.id);
                  return (
                    <Card key={course.id} className="border-none shadow-lg overflow-hidden rounded-2xl md:rounded-3xl bg-white group hover:shadow-xl transition-all duration-500">
                      <div className="flex flex-col lg:flex-row items-stretch">
                        <div className="relative w-full lg:w-32 h-24 lg:h-auto bg-slate-100 overflow-hidden shrink-0">
                          <Image src={`https://loremflickr.com/600/400/education,course?lock=${course.id}`} alt={course.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
                        </div>
                        <div className="py-4 md:py-2.5 px-6 md:px-8 flex-1 flex flex-col lg:flex-row justify-between items-center gap-6">
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
                            <MetricMonumental icon={CheckCircle2} label="Activos" value={courseInscriptions.filter((e: any) => e.status === 'active').length} color="emerald" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                studentEnrollments?.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground italic">No estás inscrito en ningún programa actualmente.</p>
                ) : studentEnrollments?.slice(0, 3).map((enroll: any) => {
                  const details = enroll.courseData;
                  const completedModulesCount = enroll.progress?.completedModules?.length || 0;
                  const totalModules = details?.modulesCount || 1;
                  const progressPercent = Math.min(100, Math.round((completedModulesCount / totalModules) * 100));

                  return (
                    <StudentCourseCard 
                      key={enroll.id}
                      variant="list"
                      courseId={enroll.courseId}
                      title={details?.title || enroll.courseName || `Programa: ${enroll.courseId.substring(0, 8)}`}
                      thumbnail={details?.thumbnail}
                      status={enroll.status}
                      progressPercent={progressPercent}
                      completedModulesCount={completedModulesCount}
                      totalModules={totalModules}
                    />
                  );
                })
              )}
            </div>
          </section>

          <section className="space-y-6 md:space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-1">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                  {isMentor || isAdmin ? "Desafíos Globales" : "Mis Desafíos de Evolución"}
                </h2>
                <p className="text-xs md:text-sm text-slate-500 font-medium">
                  {isMentor || isAdmin ? "Cumplimiento de consignas por grupo." : "Tareas individuales y proyectos evaluados por IA."}
                </p>
              </div>
              <Link href={isMentor || isAdmin ? "/mentoria/desafios" : "/tasks"} className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto rounded-xl font-bold border-2 h-10 md:h-11 px-6 shadow-sm">
                  Ver Tablero <Zap className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-4 md:gap-6">
              {(isMentor || isAdmin) ? (
                groupedDashboardChallenges.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground italic">No hay desafíos asignados recientemente.</p>
                ) : groupedDashboardChallenges.map((group: any, gIdx: number) => {
                  const isMassive = group.total > 1;
                  const percent = Math.round((group.completed / group.total) * 100);
                  return (
                    <Card key={gIdx} className="border-none shadow-lg rounded-2xl md:rounded-3xl bg-white overflow-hidden group hover:shadow-xl transition-all">
                      <div className="p-6 flex flex-col lg:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4 flex-1 min-w-0 w-full lg:w-auto">
                          <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0", isMassive ? "bg-accent" : "bg-primary")}>
                            {isMassive ? <Users className="h-5 w-5 md:h-6 md:w-6" /> : <Target className="h-5 w-5 md:h-6 md:w-6" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-bold text-base md:text-lg text-slate-900 line-clamp-1">{group.title}</h3>
                              <Badge variant="secondary" className={cn("text-[7px] uppercase font-black px-1.5 h-4 border-none", isMassive ? "bg-accent/10 text-accent" : "bg-slate-100 text-slate-500")}>{isMassive ? 'Masivo' : 'Individual'}</Badge>
                            </div>
                            <p className="text-xs font-medium text-slate-500">{isMassive ? `${group.total} alumnos` : `Para: ${group.tasks[0]?.studentName}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between lg:justify-end gap-6 md:gap-8 shrink-0 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0">
                          <div className="flex items-center gap-6 md:gap-8">
                            <div className="text-center">
                              <p className="text-lg font-black text-slate-800 leading-none">{group.completed}</p>
                              <p className="text-[7px] font-bold uppercase text-slate-400 mt-1">Entregas</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-black text-accent leading-none">{percent}%</p>
                              <p className="text-[7px] font-bold uppercase text-slate-400 mt-1">Cumplimiento</p>
                            </div>
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
                ) : sortedTasks?.slice(0, 3).map((task: any) => (
                  <StudentTaskCard 
                    key={task.id}
                    id={task.id}
                    title={task.title}
                    mentorName={task.mentorName}
                    status={task.status}
                    score={task.score}
                  />
                ))
              )}
            </div>
          </section>

          <section className="space-y-6 md:space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-1">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                  {isMentor || isAdmin ? "Seguimientos Estratégicos" : "Mis Programas de Acompañamiento"}
                </h2>
                <p className="text-xs md:text-sm text-slate-500 font-medium">Acompañamiento personalizado y sesiones de mentoría.</p>
              </div>
              <Link href="/seguimientos" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto rounded-xl font-bold border-2 h-10 md:h-11 px-6 shadow-sm">
                  Calendario <Calendar className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-4 md:gap-6">
              {recentFollowUps?.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground italic">No hay programas de seguimiento activos.</p>
              ) : recentFollowUps?.map((fu: any) => {
                const sessionStats = followUpSessionStats[fu.id];
                return (
                  <StudentFollowUpCard 
                    key={fu.id}
                    id={fu.id}
                    title={fu.title}
                    goal={fu.goal}
                    consumedSessions={sessionStats?.consumed || 0}
                    totalSessions={fu.totalSessions}
                    status={fu.status}
                  />
                );
              })}
            </div>
          </section>

        </div>
    </div>
  );
};

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
