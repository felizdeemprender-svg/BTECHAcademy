'use client';

import { useAuth } from '@/components/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MousePointer2, Users, Target, Percent, Loader2, Search } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Fragment, useCallback, useEffect, useState } from 'react';

interface TutorCourse {
  id: string;
  title: string;
  description: string;
  price: number;
  landingId: string;
  landingTitle: string;
  leads: number;
  conversions: number;
  clicks: number;
}

interface TutorStat {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  totalLeads: number;
  convertedLeads: number;
  assignedLandings: number;
  totalClicks: number;
  courses: TutorCourse[];
}

export default function EmbajadoresBoardPage() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const db = useFirestore();

  const [tutors, setTutors] = useState<TutorStat[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchTutorBoard = useCallback(async () => {
    if (!profile?.uid || !db) {
      setTutors([]);
      setLoadingData(false);
      return;
    }

    try {
      setLoadingData(true);

      const associatedMentors = Array.from(
        new Set((profile.associatedMentors || []).filter(Boolean) as string[])
      );

      if (associatedMentors.length === 0) {
        setTutors([]);
        setLoadingData(false);
        return;
      }

      const tutorDocs = await Promise.all(
        associatedMentors.map((mentorId) => getDoc(doc(db, 'users', mentorId)))
      );

      const tutorMap = new Map<string, any>();
      tutorDocs.forEach((snap) => {
        if (snap.exists()) {
          tutorMap.set(snap.id, snap.data() as any);
        }
      });

      const stats: TutorStat[] = [];

      for (const mentorId of associatedMentors) {
        const mentorData = tutorMap.get(mentorId) || {};

        const landingsQuery = query(
          collection(db, 'salesPages'),
          where('mentorId', '==', mentorId),
          where('referidoId', '==', profile.uid)
        );
        const landingsSnap = await getDocs(landingsQuery);

        const relevantLandings = landingsSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as any),
        }));

        if (relevantLandings.length === 0) {
          continue;
        }

        const relevantLandingIds = relevantLandings.map((landing) => landing.id);

        const coursesSnap = await getDocs(
          query(collection(db, 'courses'), where('mentorId', '==', mentorId))
        );

        const courseMap = Object.fromEntries(
          coursesSnap.docs.map((docSnap) => [docSnap.id, { id: docSnap.id, ...(docSnap.data() as any) }])
        );

        const landingLeadStats: Record<string, { total: number; converted: number }> = {};
        const influencerLeads: Record<string, { total: number; converted: number }> = {};

        if (relevantLandingIds.length > 0) {
          const batches: Promise<any>[] = [];
          for (let i = 0; i < relevantLandingIds.length; i += 10) {
            const batchIds = relevantLandingIds.slice(i, i + 10);
            batches.push(getDocs(query(collection(db, 'leads'), where('landingId', 'in', batchIds))));
          }

          const leadSnaps = await Promise.all(batches);
          leadSnaps.forEach((snap) => {
            snap.docs.forEach((leadDoc: any) => {
              const data = leadDoc.data() as any;
              const landingId = data.landingId;

              if (!landingLeadStats[landingId]) {
                landingLeadStats[landingId] = { total: 0, converted: 0 };
              }

              landingLeadStats[landingId].total += 1;
              if (data.status === 'converted') {
                landingLeadStats[landingId].converted += 1;
              }

              if (data.referidoId === profile.uid) {
                if (!influencerLeads[profile.uid]) {
                  influencerLeads[profile.uid] = { total: 0, converted: 0 };
                }
                influencerLeads[profile.uid].total += 1;
                if (data.status === 'converted') {
                  influencerLeads[profile.uid].converted += 1;
                }
              }
            });
          });
        }

        const tutorCourses = relevantLandings.map((landing) => {
          const course = courseMap[landing.courseId];
          const leadStats = landingLeadStats[landing.id] || { total: 0, converted: 0 };

          return {
            id: landing.courseId || landing.id,
            title: landing.title || course?.title || 'Curso sin título',
            description: course?.description || landing.description || 'Sin descripción',
            price: Number(landing.price ?? course?.price ?? 0),
            landingId: landing.id,
            landingTitle: landing.title || course?.title || 'Landing sin título',
            leads: leadStats.total,
            conversions: leadStats.converted,
            clicks: landing.stats?.totalClicks || 0,
          } as TutorCourse;
        });

        const totalLeads = influencerLeads[profile.uid]?.total || 0;
        const totalConverted = influencerLeads[profile.uid]?.converted || 0;
        const totalClicks = Math.max(
          relevantLandings.reduce((acc, landing) => acc + (landing.stats?.totalClicks || 0), 0),
          totalLeads,
          totalConverted
        );

        stats.push({
          uid: mentorId,
          name: mentorData.displayName || 'Tutor sin nombre',
          email: mentorData.email || 'Sin email',
          photoURL: mentorData.photoURL,
          totalLeads,
          convertedLeads: totalConverted,
          assignedLandings: relevantLandings.length,
          totalClicks,
          courses: tutorCourses,
        });
      }

      setTutors(stats);
    } catch (error) {
      console.error('[EmbajadoresBoard] Error cargando tablero:', error);
      setTutors([]);
    } finally {
      setLoadingData(false);
    }
  }, [db, profile?.associatedMentors, profile?.uid]);

  useEffect(() => {
    fetchTutorBoard();
  }, [fetchTutorBoard]);

  const globalLeads = tutors.reduce((acc, tutor) => acc + tutor.totalLeads, 0);
  const globalConversions = tutors.reduce((acc, tutor) => acc + tutor.convertedLeads, 0);
  const globalRate = globalLeads > 0 ? Math.round((globalConversions / globalLeads) * 100) : 0;

  if (isAuthLoading || loadingData) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-accent/20" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-10 md:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 py-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
              Rendimiento de Mis Acciones como Embajador
              <Badge className="bg-primary/15 text-primary border-none rounded-full px-3 py-1">Embajador Mode</Badge>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-2 font-medium max-w-2xl">
              Aquí ves cómo están funcionando las landings donde actúas como embajador, con el detalle de cursos y el impacto de tu acción sobre cada tutor.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none rounded-2xl bg-white overflow-hidden relative group">
            <Users className="absolute -right-4 -bottom-4 h-24 w-24 text-muted transition-transform group-hover:scale-110" />
            <CardContent className="p-6">
              <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mb-1">Tutores Activos</p>
              <p className="text-4xl font-black text-foreground">{tutors.length}</p>
            </CardContent>
          </Card>

          <Card className="border-none rounded-2xl bg-gradient-to-br from-primary to-primary text-white overflow-hidden relative">
            <Users className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10" />
            <CardContent className="p-6">
              <p className="text-primary/15 font-bold uppercase text-[10px] tracking-widest mb-1">Leads Traídos</p>
              <p className="text-4xl font-black">{globalLeads}</p>
            </CardContent>
          </Card>

          <Card className="border-none rounded-2xl bg-gradient-to-br from-success to-teal-600 text-white overflow-hidden relative">
            <Target className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10" />
            <CardContent className="p-6">
              <p className="text-success/15 font-bold uppercase text-[10px] tracking-widest mb-1">Ventas Exitosas</p>
              <p className="text-4xl font-black">{globalConversions}</p>
            </CardContent>
          </Card>

          <Card className="border-none rounded-2xl bg-foreground text-white overflow-hidden relative">
            <Percent className="absolute -right-4 -bottom-4 h-24 w-24 opacity-5" />
            <CardContent className="p-6">
              <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mb-1">Tasa Global</p>
              <p className="text-4xl font-black text-accent">{globalRate}%</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Search className="h-5 w-5 text-accent" />
            Mis Landings como Embajador
          </h2>

          <Card className="rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-muted-foreground uppercase bg-muted/80 font-black tracking-widest border-b border-muted">
                  <tr>
                    <th className="px-6 py-4">Tutor</th>
                    <th className="px-6 py-4 text-center">Accesos</th>
                    <th className="px-6 py-4 text-center">Leads</th>
                    <th className="px-6 py-4 text-center">Ventas</th>
                    <th className="px-6 py-4 text-right">Conversión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tutors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-8 w-8 text-primary/30" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground mb-1">Aún no tenés landings en las que actúes como embajador</p>
                            <p className="text-muted-foreground text-sm">
                              Esta vista aparece cuando algún tutor te da de alta y se generan landings donde vos actuás como embajador.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tutors.map((tutor) => {
                      const rate = tutor.totalLeads > 0
                        ? Math.round((tutor.convertedLeads / tutor.totalLeads) * 100)
                        : 0;

                      return (
                        <Fragment key={tutor.uid}>
                          <tr className="hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={tutor.photoURL} />
                                  <AvatarFallback className="bg-success/15 text-success font-bold">
                                    {tutor.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-bold text-foreground">{tutor.name}</div>
                                  <div className="text-xs text-muted-foreground">{tutor.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex items-center justify-center bg-muted text-foreground h-8 px-3 rounded-lg text-xs font-bold gap-1.5">
                                <MousePointer2 className="h-3 w-3 text-primary" /> {tutor.totalClicks}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-black text-foreground">{tutor.totalLeads}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-black text-success">{tutor.convertedLeads}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex items-center gap-1.5 bg-accent/10 text-accent px-2.5 py-1 rounded-md text-[11px] font-bold">
                                {rate}%
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={5} className="px-6 py-0">
                              <div className="border-t border-muted bg-muted/80">
                                <div className="px-6 py-4">
                                  <div className="flex items-center justify-between gap-4">
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cursos</p>
                                      <p className="text-sm font-bold text-foreground">Detalle de cursos asignados a {tutor.name}</p>
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                      <p>{tutor.courses.length} curso{tutor.courses.length !== 1 ? 's' : ''} asignado{tutor.courses.length !== 1 ? 's' : ''}</p>
                                    </div>
                                  </div>

                                  <div className="mt-4 grid gap-3">
                                    {tutor.courses.length === 0 ? (
                                      <div className="rounded-2xl border border-dashed border-border bg-white px-4 py-5 text-sm text-muted-foreground">
                                        Este tutor aún no tiene cursos asociados a tu embajador.
                                      </div>
                                    ) : (
                                      tutor.courses.map((course) => (
                                        <div key={course.landingId} className="rounded-2xl border border-muted bg-white px-4 py-4 shadow-sm">
                                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-2">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                                                  {course.landingTitle}
                                                </span>
                                                <span className="text-xs text-muted-foreground">Landing: {course.landingId}</span>
                                              </div>
                                              <p className="font-black text-foreground">{course.title}</p>
                                              <p className="text-sm text-muted-foreground">{course.description}</p>
                                            </div>

                                            <div className="flex flex-wrap gap-2 lg:justify-end">
                                              <span className="inline-flex items-center rounded-xl bg-muted px-3 py-2 text-xs font-bold text-foreground">
                                                Precio: ${course.price}
                                              </span>
                                              <span className="inline-flex items-center rounded-xl bg-primary/15 px-3 py-2 text-xs font-bold text-primary">
                                                Clicks: {course.clicks}
                                              </span>
                                              <span className="inline-flex items-center rounded-xl bg-primary/15 px-3 py-2 text-xs font-bold text-primary">
                                                Leads: {course.leads}
                                              </span>
                                              <span className="inline-flex items-center rounded-xl bg-success/15 px-3 py-2 text-xs font-bold text-success">
                                                Ventas: {course.conversions}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
