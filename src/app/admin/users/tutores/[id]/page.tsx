'use client';


import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/components/auth-context';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft, Mail, Globe, Calendar, BookOpen, Users, Layout as LayoutIcon,
  CreditCard, DollarSign, Percent, CheckCircle, XCircle, Clock, Shield,
  ExternalLink, Edit, Activity, Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubscriptionStatus } from '@/types/subscription';

export default function TutorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { profile } = useAuth();
  const { toast } = useToast();

  const tutorId = params.id as string;

  const [tutor, setTutor] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [landings, setLandings] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('resumen');

  useEffect(() => {
    if (!tutorId || !db) return;
    loadTutorData();
  }, [tutorId, db]);

  const loadTutorData = async () => {
    setLoading(true);
    try {
      const tutorDoc = await getDoc(doc(db, 'users', tutorId));
      if (!tutorDoc.exists()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Tutor no encontrado.' });
        router.push('/admin/users');
        return;
      }
      const tutorData = { id: tutorDoc.id, ...tutorDoc.data() } as any;
      setTutor(tutorData);

      const coursesQuery = query(
        collection(db, 'courses'),
        where('mentorId', '==', tutorId),
        orderBy('createdAt', 'desc')
      );
      const coursesSnap = await getDocs(coursesQuery);
      const coursesList = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setCourses(coursesList);

      const courseIds = coursesList.map(c => c.id);
      if (courseIds.length > 0) {
        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('courseId', 'in', courseIds.slice(0, 10)),
          limit(50)
        );
        const enrollmentsSnap = await getDocs(enrollmentsQuery);
        const studentEmails = new Set<string>();
        const studentsList: any[] = [];

        for (const eDoc of enrollmentsSnap.docs) {
          const eData = eDoc.data();
          const email = eData.studentEmail || eData.inviteEmail;
          if (email && !studentEmails.has(email)) {
            studentEmails.add(email);
            const course = coursesList.find(c => c.id === eData.courseId);
            studentsList.push({
              id: eDoc.id,
              email,
              studentId: eData.studentId,
              courseName: course?.title || 'Curso',
              courseId: eData.courseId,
              status: eData.status,
              progressPercent: eData.progressPercent || 0,
              createdAt: eData.createdAt?.toDate?.() || null,
            });
          }
        }
        setStudents(studentsList);
      }

      const landingsQuery = query(
        collection(db, 'salesPages'),
        where('mentorId', '==', tutorId),
        orderBy('createdAt', 'desc')
      );
      const landingsSnap = await getDocs(landingsQuery);
      const landingsList = landingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setLandings(landingsList);

    } catch (e) {
      console.error('Error loading tutor data:', e);
      toast({ variant: 'destructive', title: 'Error', description: 'Error al cargar datos del tutor.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleActiveStatus = async () => {
    if (!tutor) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', tutorId), {
        isActive: !tutor.isActive,
        updatedAt: serverTimestamp()
      });
      setTutor((prev: any) => ({ ...prev, isActive: !prev.isActive }));
      toast({ title: tutor.isActive ? 'Tutor suspendido' : 'Tutor reactivado' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado.' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-success text-white flex items-center gap-1 text-[10px]"><CheckCircle className="h-3 w-3" /> Activo</Badge>;
      case 'trial': return <Badge className="bg-blue-500 text-white flex items-center gap-1 text-[10px]"><Clock className="h-3 w-3" /> Prueba</Badge>;
      case 'inactive': return <Badge variant="secondary" className="text-[10px]"><XCircle className="h-3 w-3" /> Inactivo</Badge>;
      case 'cancelled': return <Badge variant="destructive" className="text-[10px]"><XCircle className="h-3 w-3" /> Cancelado</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">Sin suscripción</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground font-medium">Cargando perfil del tutor...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!tutor) return null;

  const sub = tutor.subscription || {};

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/users')} className="h-10 w-10 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Detalle del Tutor</h1>
            <p className="text-sm text-muted-foreground">Vista completa de perfil, suscripción y actividad</p>
          </div>
        </div>

        <Card className="border border-border rounded-2xl overflow-hidden bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="h-20 w-20 border-4 border-white">
                <AvatarImage src={tutor.photoURL || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">{tutor.displayName?.[0] || 'T'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground">{tutor.displayName}</h2>
                  {getStatusBadge(tutor.isActive !== false ? 'active' : 'inactive')}
                  {sub.isEnterprise && <Badge className="bg-primary/15 text-primary border-none text-[9px]">Empresa</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {tutor.email}</span>
                  {tutor.username && (
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" />
                      <a href={`/tutor/${tutor.username}`} target="_blank" className="text-primary hover:underline">
                        /tutor/{tutor.username} <ExternalLink className="h-3 w-3 inline" />
                      </a>
                    </span>
                  )}
                  {tutor.createdAt?.toDate && (
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Registrado {tutor.createdAt.toDate().toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {(tutor.roles || []).map((role: string) => (
                    <Badge key={role} variant="outline" className="text-[9px] uppercase font-bold px-2 py-0 h-5 border-border text-muted-foreground bg-muted">{role}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Estado</p>
                  <Switch checked={tutor.isActive !== false} onCheckedChange={toggleActiveStatus} disabled={saving} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => router.push(`/admin/tutors`)}
                >
                  <Edit className="h-4 w-4" /> Configurar Suscripción
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Cursos Publicados', value: courses.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Alumnos Vinculados', value: students.length, icon: Users, color: 'text-success', bg: 'bg-success/10' },
            { label: 'Landings Activas', value: landings.filter(l => l.isActive !== false).length, icon: LayoutIcon, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Estado Suscripción', value: sub.status || 'Sin plan', icon: CreditCard, color: sub.status === 'active' ? 'text-success' : 'text-muted-foreground', bg: sub.status === 'active' ? 'bg-success/10' : 'bg-muted' },
          ].map((stat, i) => (
            <Card key={i} className="border border-border rounded-xl">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted p-1 rounded-xl">
            <TabsTrigger value="resumen" className="rounded-lg text-xs font-bold data-[state=active]:bg-white">Resumen</TabsTrigger>
            <TabsTrigger value="suscripcion" className="rounded-lg text-xs font-bold data-[state=active]:bg-white">Suscripción</TabsTrigger>
            <TabsTrigger value="cursos" className="rounded-lg text-xs font-bold data-[state=active]:bg-white">Cursos ({courses.length})</TabsTrigger>
            <TabsTrigger value="alumnos" className="rounded-lg text-xs font-bold data-[state=active]:bg-white">Alumnos ({students.length})</TabsTrigger>
            <TabsTrigger value="landings" className="rounded-lg text-xs font-bold data-[state=active]:bg-white">Landings ({landings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="space-y-4 mt-4">
            <Card className="border border-border rounded-2xl">
              <CardHeader><CardTitle className="text-sm font-bold">Permisos de Mentor</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(tutor.mentorPermissions || []).length > 0 ? (
                    (tutor.mentorPermissions as string[]).map((perm: string) => (
                      <Badge key={perm} className="bg-primary/10 text-primary border-none text-[9px] uppercase font-bold">{perm.replace('_', ' ')}</Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin permisos de mentor asignados</span>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border rounded-2xl">
              <CardHeader><CardTitle className="text-sm font-bold">Acciones Rápidas</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push(`/admin/tutors`)}>
                  <Edit className="h-4 w-4" /> Editar Suscripción
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(`/tutor/${tutor.username || ''}`, '_blank')}>
                  <ExternalLink className="h-4 w-4" /> Ver Perfil Público
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suscripcion" className="space-y-4 mt-4">
            <Card className="border border-border rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/80 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Detalle del Plan</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  <Row label="Plan" value={sub.name || sub.planName || 'Sin plan'} />
                  <Row label="Estado" value={getStatusBadge(sub.status)} />
                  <Row label="Tipo" value={
                    <Badge className={cn(
                      "text-[10px] uppercase font-bold",
                      sub.type === 'free' ? "bg-muted text-muted-foreground" :
                      sub.type === 'fixed' ? "bg-success/15 text-success" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {sub.type === 'free' ? 'Gratis' : sub.type === 'fixed' ? `$${sub.fixedAmount}/mes` : `${sub.percentageRate}%`}
                    </Badge>
                  } />
                  {sub.startDate && <Row label="Inicio" value={new Date(sub.startDate).toLocaleDateString()} />}
                  {sub.endDate && <Row label="Fin" value={new Date(sub.endDate).toLocaleDateString()} />}
                  <Row label="Página Personalizada" value={sub.hasCustomPage ? <Badge className="bg-success/15 text-success text-[9px]">Sí</Badge> : <Badge variant="secondary" className="text-[9px]">No</Badge>} />
                  <Row label="IA Premium" value={sub.hasPremiumAI ? <Badge className="bg-warn/15 text-warn text-[9px]">Sí</Badge> : <Badge variant="secondary" className="text-[9px]">No</Badge>} />
                  <Row label="Auto Renovable" value={sub.autoRenew ? <Badge className="bg-success/15 text-success text-[9px]">Sí</Badge> : <Badge variant="secondary" className="text-[9px]">No</Badge>} />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/80 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Award className="h-4 w-4" /> Límites</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  <Row label="Cursos máx." value={sub.limits?.maxCourses ?? '—'} />
                  <Row label="Estudiantes máx." value={sub.limits?.maxStudents ? (sub.limits.maxStudents === -1 ? '∞' : sub.limits.maxStudents) : '—'} />
                  <Row label="Invitaciones/curso" value={sub.invitationsPerCourse ?? '—'} />
                  <Row label="Créditos IA" value={sub.aiQuotas?.totalCredits ? `${sub.aiQuotas.usedCredits || 0} / ${sub.aiQuotas.totalCredits}` : '—'} />
                  <Row label="Marca personalizada" value={sub.limits?.hasCustomBranding ? 'Sí' : 'No'} />
                  <Row label="Analíticas" value={sub.limits?.hasAnalytics ? 'Sí' : 'No'} />
                  <Row label="Soporte prioritario" value={sub.limits?.hasPrioritySupport ? 'Sí' : 'No'} />
                </div>
              </CardContent>
            </Card>

            {sub.observations && (
              <Card className="border border-border rounded-2xl">
                <CardHeader><CardTitle className="text-sm font-bold">Observaciones</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sub.observations}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cursos" className="space-y-4 mt-4">
            <Card className="border border-border rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                {courses.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground italic">Este tutor no ha creado cursos aún.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {courses.map((course: any) => (
                      <div key={course.id} className="flex items-center justify-between p-4 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{course.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {course.modules?.length || 0} módulos | ${course.price || 0}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={cn(
                            "text-[9px] uppercase font-bold",
                            course.status === 'published' ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                          )}>
                            {course.status || 'draft'}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" asChild>
                            <a href={`/courses/edit/${course.id}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alumnos" className="space-y-4 mt-4">
            <Card className="border border-border rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                {students.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground italic">No hay alumnos vinculados a este tutor.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-muted bg-muted/50">
                          <th className="text-left px-4 py-3 text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Email</th>
                          <th className="text-left px-4 py-3 text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Curso</th>
                          <th className="text-center px-4 py-3 text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Estado</th>
                          <th className="text-center px-4 py-3 text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Progreso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {students.map((student: any) => (
                          <tr key={student.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-foreground">{student.email}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-muted-foreground">{student.courseName}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge className={cn(
                                "text-[9px] uppercase font-bold",
                                student.status === 'active' ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                              )}>
                                {student.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${student.progressPercent || 0}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">{student.progressPercent || 0}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="landings" className="space-y-4 mt-4">
            <Card className="border border-border rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                {landings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground italic">Este tutor no tiene landing pages.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {landings.map((landing: any) => {
                      const isV2 = !!landing.content?.sections;
                      return (
                        <div key={landing.id} className="flex items-center justify-between p-4 hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <LayoutIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">
                                {landing.content?.marketingName || landing.title || 'Landing'}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {isV2 ? 'V2 (Atómica)' : 'V1 (Clásica)'} | {landing.landingType || 'general'} | ${landing.price || 0}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={cn(
                              "text-[9px] uppercase font-bold",
                              landing.isActive !== false ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                            )}>
                              {landing.isActive !== false ? 'Activa' : 'Inactiva'}
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" asChild>
                              <a href={`/v/${landing.id}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-6 py-3">
      <span className="text-[11px] font-bold uppercase text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
