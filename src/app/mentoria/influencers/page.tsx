'use client';

import { useAuth } from '@/components/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, setDoc, serverTimestamp, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Fragment, useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Target, 
  Percent, 
  Loader2,
  CheckCircle2,
  UserPlus,
  Layout as LayoutIcon,
  Search,
  AlertCircle,
  X,
  MousePointer2
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface InfluencerCourse {
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

interface InfluencerStat {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  totalLeads: number;
  convertedLeads: number;
  assignedLandings: number;
  totalClicks: number;
  courses: InfluencerCourse[];
}

export default function MentorInfluencersControl() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const db = useFirestore();

  const [influencers, setInfluencers] = useState<InfluencerStat[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Alta modal state
  const [showAltaModal, setShowAltaModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [foundUser, setFoundUser] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchInfluencersStats = useCallback(async () => {
    if (!profile?.uid || !db) return;
    try {
      setLoadingData(true);
      
      // 1. Get all referidos from the mentor's own subcollection (source of truth)
      const referidosSnap = await getDocs(
        collection(db, 'mentorInfluencers', profile.uid, 'referidos')
      );

      if (referidosSnap.empty) {
        setInfluencers([]);
        setLoadingData(false);
        return;
      }

      const referidoDocs = referidosSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      const influencerIds = referidoDocs.map(d => d.id);

      // 2. Get all landings for this mentor and count by referidoId, and sum stats.totalClicks
      const qLandings = query(
        collection(db, 'salesPages'),
        where('mentorId', '==', profile.uid)
      );
      const landingsSnap = await getDocs(qLandings);

      const influencerLandingsCount: Record<string, number> = {};
      const influencerClicksCount: Record<string, number> = {};
      const relevantLandingIds: string[] = [];
      const landingDetailsById: Record<string, any> = {};

      landingsSnap.docs.forEach(d => {
        const data = d.data() as any;
        if (data.referidoId && influencerIds.includes(data.referidoId)) {
          relevantLandingIds.push(d.id);
          landingDetailsById[d.id] = { id: d.id, ...data };
          influencerLandingsCount[data.referidoId] = (influencerLandingsCount[data.referidoId] || 0) + 1;
          const clicks = data.stats?.totalClicks || 0;
          influencerClicksCount[data.referidoId] = (influencerClicksCount[data.referidoId] || 0) + clicks;
        }
      });

      const coursesSnap = await getDocs(
        query(collection(db, 'courses'), where('mentorId', '==', profile.uid))
      );
      const courseMap = Object.fromEntries(
        coursesSnap.docs.map(doc => [doc.id, { id: doc.id, ...(doc.data() as any) }])
      );

      // 3. Get leads from these landings
      const influencerLeads: Record<string, { total: number, converted: number }> = {};
      const landingLeadStats: Record<string, { total: number, converted: number }> = {};
      if (relevantLandingIds.length > 0) {
        const batches = [];
        for (let i = 0; i < relevantLandingIds.length; i += 10) {
          const batchIds = relevantLandingIds.slice(i, i + 10);
          batches.push(getDocs(query(collection(db, 'leads'), where('landingId', 'in', batchIds))));
        }
        const leadSnaps = await Promise.all(batches);
        leadSnaps.forEach(snap => {
          snap.docs.forEach(d => {
            const data = d.data() as any;
            const landingId = data.landingId;
            if (!landingLeadStats[landingId]) {
              landingLeadStats[landingId] = { total: 0, converted: 0 };
            }
            landingLeadStats[landingId].total++;
            if (data.status === 'converted') {
              landingLeadStats[landingId].converted++;
            }
            if (data.referidoId) {
              if (!influencerLeads[data.referidoId]) {
                influencerLeads[data.referidoId] = { total: 0, converted: 0 };
              }
              influencerLeads[data.referidoId].total++;
              if (data.status === 'converted') {
                influencerLeads[data.referidoId].converted++;
              }
            }
          });
        });
      }

      // 4. Build stats using cached profile data from the referidos subcollection
      const stats: InfluencerStat[] = referidoDocs.map(ref => {
        const ambassadorCourses = Object.values(landingDetailsById)
          .filter((landing: any) => landing.referidoId === ref.id)
          .map((landing: any) => {
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
            };
          });

        return {
          uid: ref.id,
          name: ref.displayName || 'Usuario sin nombre',
          email: ref.email || 'Sin email',
          photoURL: ref.photoURL,
          totalLeads: influencerLeads[ref.id]?.total || 0,
          convertedLeads: influencerLeads[ref.id]?.converted || 0,
          assignedLandings: influencerLandingsCount[ref.id] || 0,
          totalClicks: Math.max(
            influencerClicksCount[ref.id] || 0,
            influencerLeads[ref.id]?.total || 0,
            influencerLeads[ref.id]?.converted || 0
          ),
          courses: ambassadorCourses,
        };
      });

      setInfluencers(stats);
    } catch (err) {
      console.error("Error fetching influencers control data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [db, profile?.uid]);

  useEffect(() => {
    fetchInfluencersStats();
  }, [fetchInfluencersStats]);

  // --- Alta de Influencer handlers ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail || !db) return;
    setIsSearching(true);
    setFoundUser(null);
    setSearchError(null);

    try {
      const q = query(
        collection(db, 'users'), 
        where('email', '==', searchEmail.toLowerCase().trim()),
        limit(1)
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setSearchError('No se encontró ningún usuario con ese email. Debe registrarse primero.');
      } else {
        const docSnap = snap.docs[0];
        const targetData = docSnap.data();
        
        // Verificar si ya es referido de ESTE mentor
        const existingSnap = await getDocs(
          query(
            collection(db, 'mentorInfluencers', profile!.uid, 'referidos'),
            where('email', '==', searchEmail.toLowerCase().trim())
          )
        );

        setFoundUser({
          id: docSnap.id,
          ...targetData,
          alreadyAssociated: !existingSnap.empty
        });
      }
    } catch (err: any) {
      console.error("Error buscando usuario:", err);
      setSearchError('Error al buscar el usuario: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePromote = async () => {
    if (!foundUser || !profile?.uid || !db) return;
    setIsPromoting(true);
    try {
      // Step 1: Write to mentor's own subcollection
      await setDoc(
        doc(db, 'mentorInfluencers', profile.uid, 'referidos', foundUser.id),
        {
          uid: foundUser.id,
          displayName: foundUser.displayName || null,
          email: foundUser.email,
          photoURL: foundUser.photoURL || null,
          addedAt: serverTimestamp(),
          addedByMentorId: profile.uid,
        },
        { merge: true }
      );

      // Step 2: Update the user document to add 'referido' role
      try {
        await updateDoc(doc(db, 'users', foundUser.id), {
          roles: arrayUnion('referido'),
          associatedMentors: arrayUnion(profile.uid)
        });
      } catch (roleErr) {
        console.warn('Could not update user roles, but relationship was saved:', roleErr);
      }

      toast({
        title: "¡Embajador Dado de Alta!",
        description: `${foundUser.displayName || foundUser.email} ahora es tu embajador.`,
        className: "bg-emerald-600 text-white border-none"
      });

      closeModal();
      fetchInfluencersStats();

    } catch (err: any) {
      console.error("Error promoviendo usuario:", err);
      toast({
        title: "Error al dar de alta",
        description: "No se pudo registrar el embajador. " + err.message,
        variant: "destructive"
      });
    } finally {
      setIsPromoting(false);
    }
  };

  const closeModal = () => {
    setShowAltaModal(false);
    setSearchEmail('');
    setFoundUser(null);
    setSearchError(null);
  };

  if (isAuthLoading || loadingData) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-accent/20" />
        </div>
      </DashboardLayout>
    );
  }

  const globalLeads = influencers.reduce((acc, curr) => acc + curr.totalLeads, 0);
  const globalConversions = influencers.reduce((acc, curr) => acc + curr.convertedLeads, 0);
  const globalRate = globalLeads > 0 ? Math.round((globalConversions / globalLeads) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-10 md:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 py-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Control de Embajadores
              <Badge className="bg-indigo-100 text-indigo-700 border-none rounded-full px-3 py-1">Tutor Mode</Badge>
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-2 font-medium max-w-2xl">
              Tus embajadores y referidos. Solo ves a los embajadores que vos diste de alta.
            </p>
          </div>
          <Button
            onClick={() => setShowAltaModal(true)}
            className="h-12 px-6 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold shadow-lg gap-2"
          >
            <UserPlus className="h-5 w-5" /> Dar de Alta Embajador
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none shadow-xl rounded-2xl bg-white overflow-hidden relative group">
            <Users className="absolute -right-4 -bottom-4 h-24 w-24 text-slate-100 transition-transform group-hover:scale-110" />
            <CardContent className="p-6">
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">Total Embajadores</p>
              <p className="text-4xl font-black text-slate-800">{influencers.length}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden relative">
            <Users className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10" />
            <CardContent className="p-6">
              <p className="text-indigo-100 font-bold uppercase text-[10px] tracking-widest mb-1">Leads Traídos</p>
              <p className="text-4xl font-black">{globalLeads}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden relative">
            <Target className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10" />
            <CardContent className="p-6">
              <p className="text-emerald-100 font-bold uppercase text-[10px] tracking-widest mb-1">Ventas Exitosas</p>
              <p className="text-4xl font-black">{globalConversions}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-2xl bg-slate-900 text-white overflow-hidden relative">
            <Percent className="absolute -right-4 -bottom-4 h-24 w-24 opacity-5" />
            <CardContent className="p-6">
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">Tasa Global</p>
              <p className="text-4xl font-black text-accent">{globalRate}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Search className="h-5 w-5 text-accent" />
            Tus Embajadores
          </h2>

          <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/80 font-black tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Embajador</th>
                    <th className="px-6 py-4 text-center">Accesos</th>
                    <th className="px-6 py-4 text-center">Leads</th>
                    <th className="px-6 py-4 text-center">Ventas</th>
                    <th className="px-6 py-4 text-right">Conversión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {influencers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
                            <Users className="h-8 w-8 text-indigo-300" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 mb-1">Aún no tenés embajadores</p>
                            <p className="text-slate-500 text-sm">
                              Hacé clic en "Dar de Alta Embajador" para agregar tu primer embajador.
                            </p>
                          </div>
                          <Button
                            onClick={() => setShowAltaModal(true)}
                            className="mt-2 h-10 px-5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold gap-2"
                          >
                            <UserPlus className="h-4 w-4" /> Dar de Alta Embajador
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    influencers.map(inf => {
                      const rate = inf.totalLeads > 0
                        ? Math.round((inf.convertedLeads / inf.totalLeads) * 100)
                        : 0;
                      return (
                        <Fragment key={inf.uid}>
                          <tr className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={inf.photoURL} />
                                  <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                                    {inf.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-bold text-slate-800">{inf.name}</div>
                                  <div className="text-xs text-slate-500">{inf.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex items-center justify-center bg-slate-100 text-slate-700 h-8 px-3 rounded-lg text-xs font-bold gap-1.5">
                                <MousePointer2 className="h-3 w-3 text-indigo-500" /> {inf.totalClicks}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-black text-slate-700">{inf.totalLeads}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-black text-emerald-600">{inf.convertedLeads}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex items-center gap-1.5 bg-accent/10 text-accent px-2.5 py-1 rounded-md text-[11px] font-bold">
                                {rate}%
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={5} className="px-6 py-0">
                              <div className="border-t border-slate-100 bg-slate-50/80">
                                <div className="px-6 py-4">
                                  <div className="flex items-center justify-between gap-4">
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cursos</p>
                                      <p className="text-sm font-bold text-slate-800">Detalle de cursos asignados a {inf.name}</p>
                                    </div>
                                    <div className="text-right text-xs text-slate-500">
                                      <p>{inf.courses.length} curso{inf.courses.length !== 1 ? 's' : ''} asignado{inf.courses.length !== 1 ? 's' : ''}</p>
                                    </div>
                                  </div>

                                  <div className="mt-4 grid gap-3">
                                    {inf.courses.length === 0 ? (
                                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                                        Este embajador aún no tiene cursos asignados.
                                      </div>
                                    ) : (
                                      inf.courses.map(course => (
                                        <div key={course.landingId} className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-2">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-700">
                                                  {course.landingTitle}
                                                </span>
                                                <span className="text-xs text-slate-500">Landing: {course.landingId}</span>
                                              </div>
                                              <p className="font-black text-slate-800">{course.title}</p>
                                              <p className="text-sm text-slate-500">{course.description}</p>
                                            </div>

                                            <div className="flex flex-wrap gap-2 lg:justify-end">
                                              <span className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                                                Precio: ${course.price}
                                              </span>
                                              <span className="inline-flex items-center rounded-xl bg-violet-100 px-3 py-2 text-xs font-bold text-violet-700">
                                                Clicks: {course.clicks}
                                              </span>
                                              <span className="inline-flex items-center rounded-xl bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700">
                                                Leads: {course.leads}
                                              </span>
                                              <span className="inline-flex items-center rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">
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

      {/* ── Modal de Alta ──────────────────────────────────────────────────── */}
      <Dialog open={showAltaModal} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="mw-md p-0">

          {/* Header del modal */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Dar de Alta Embajador</h2>
              <p className="text-xs text-slate-500 font-medium">Buscá al usuario por su email de registro</p>
            </div>
          </div>

            {/* Body del modal */}
            <div className="p-6 space-y-5">
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="flex-1 relative">
                  <Input
                    type="email"
                    placeholder="email@ejemplo.com"
                    required
                    value={searchEmail}
                    onChange={e => setSearchEmail(e.target.value)}
                    className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200"
                    autoFocus
                  />
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
                <Button
                  type="submit"
                  disabled={isSearching}
                  className="h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                </Button>
              </form>

              {searchError && (
                <div className="flex items-start gap-3 bg-rose-50 text-rose-600 p-4 rounded-xl">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="text-sm font-medium">{searchError}</div>
                </div>
              )}

              {foundUser && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 bg-slate-50/50">
                    <Avatar className="h-14 w-14 shadow-md">
                      <AvatarImage src={foundUser.photoURL} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl font-black">
                        {(foundUser.displayName || foundUser.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 text-center sm:text-left">
                      <h4 className="text-base font-bold text-slate-900">
                        {foundUser.displayName || 'Usuario sin nombre'}
                      </h4>
                      <p className="text-sm text-slate-500">{foundUser.email}</p>
                      <p className="text-xs text-slate-400 mt-1">Usuario registrado en la plataforma</p>
                    </div>

                    <div className="shrink-0">
                      {foundUser.alreadyAssociated ? (
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl text-sm font-bold">
                          <CheckCircle2 className="h-4 w-4" /> Ya es tu embajador
                        </div>
                      ) : (
                        <Button
                          onClick={handlePromote}
                          disabled={isPromoting}
                          className="h-10 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl shadow-md gap-2"
                        >
                          {isPromoting
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <UserPlus className="h-4 w-4" />}
                          Dar de Alta
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-indigo-50/60 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">¿Cómo funciona?</p>
                <ul className="text-xs text-slate-600 space-y-1.5 font-medium">
                  <li>• El usuario debe estar <strong>registrado</strong> en la plataforma con ese email.</li>
                  <li>• Solo verás a <strong>tus propios</strong> embajadores, sin importar si trabajan con otros tutores.</li>
                  <li>• Luego podrás asignarles landings desde tus campañas.</li>
                </ul>
              </div>
            </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
