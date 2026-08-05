'use client';

import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, getDocs, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  Trash2,
  Copy,
  Loader2,
  ExternalLink,
  Layout,
  FileEdit,
  Search,
  ChevronDown,
  ChevronRight,
  BookOpen,
  DollarSign,
  Globe,
  ShieldOff,
  Megaphone,
  Star,
  Users,
  BarChart2,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  MousePointer2,
  CalendarClock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Determina etiqueta y color basándose en landingType (campo real) y referidoId
function getPageTypeInfo(page: any) {
  const lt = page.landingType as string | undefined;

  if (lt === 'general') {
    return { label: 'General', color: 'bg-blue-500/10 text-blue-700', icon: Globe };
  }
  if (lt === 'promocion') {
    if (page.referidoId) {
      return { label: 'Promo Embajador', color: 'bg-primary/10 text-primary', icon: Users };
    }
    return { label: 'Promo Directa', color: 'bg-warn/10 text-warn', icon: Megaphone };
  }
  // Pages del builder de campañas (type !== 'landing_only')
  if (page.type === 'landing_only') {
    return { label: 'Pack x3', color: 'bg-success/10 text-success', icon: Star };
  }
  return { label: 'Pack Multimedia', color: 'bg-muted-foreground/10 text-muted-foreground', icon: Layout };
}

export default function SalesLandingsDashboardPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [openCourses, setOpenCourses] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Estados para clonación de embajador
  const [cloningPage, setCloningPage] = useState<any | null>(null);
  const [cloneData, setCloneData] = useState({
    referidoId: '',
    startDate: '',
    endDate: '',
    price: 0
  });
  const [isCloning, setIsCloning] = useState(false);

  // Estados para estadísticas detalladas de una landing seleccionada
  const [selectedStatsPage, setSelectedStatsPage] = useState<any | null>(null);
  const [statsLeads, setStatsLeads] = useState<any[]>([]);
  const [statsEnrollments, setStatsEnrollments] = useState<any[]>([]);
  const [isLoadingStatsData, setIsLoadingStatsData] = useState(false);

  // Estados para prórroga de vencimiento
  const [extendingPage, setExtendingPage] = useState<any | null>(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  // Consulta de todas las sales pages del mentor
  const pagesQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'salesPages'), where('mentorId', '==', profile.uid));
  }, [db, profile?.uid]);
  const { data: rawPages, isLoading } = useCollection(pagesQuery);

  // Consulta de cursos del mentor para nombres
  const coursesQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'courses'), where('mentorId', '==', profile.uid));
  }, [db, profile?.uid]);
  const { data: courses } = useCollection(coursesQuery);

  // Consulta de referidos del mentor para nombres de embajadores
  const referidosQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'mentorInfluencers', profile.uid, 'referidos'));
  }, [db, profile?.uid]);
  const { data: referidos } = useCollection(referidosQuery);

  const referidosMap = useMemo(() => {
    const map: Record<string, string> = {};
    referidos?.forEach((r: any) => { map[r.id] = r.displayName || r.email || 'Embajador'; });
    return map;
  }, [referidos]);

  // Consulta global de todos los leads asociados a las landings del mentor (por lotes de 30)
  const [allLeads, setAllLeads] = useState<any[]>([]);

  useEffect(() => {
    if (!rawPages || rawPages.length === 0) {
      setAllLeads([]);
      return;
    }

    const fetchAllLeads = async () => {
      try {
        const pageIds = rawPages.map((p: any) => p.id);
        const chunks = [];
        for (let i = 0; i < pageIds.length; i += 30) {
          chunks.push(pageIds.slice(i, i + 30));
        }

        const allFetchedLeads: any[] = [];
        for (const chunk of chunks) {
          const q = query(collection(db, 'leads'), where('landingId', 'in', chunk));
          const snap = await getDocs(q);
          snap.docs.forEach(doc => {
            allFetchedLeads.push({ id: doc.id, ...doc.data() });
          });
        }
        setAllLeads(allFetchedLeads);
      } catch (err) {
        console.error("Error al cargar todos los leads para el panel:", err);
      }
    };

    fetchAllLeads();
  }, [db, rawPages]);

  const leadsByLanding = useMemo(() => {
    const map: Record<string, number> = {};
    allLeads.forEach((l: any) => {
      if (!l.landingId) return;
      map[l.landingId] = (map[l.landingId] || 0) + 1;
    });
    return map;
  }, [allLeads]);

  // Carga reactiva de detalles de la landing seleccionada (leads e inscripciones)
  useEffect(() => {
    if (!selectedStatsPage?.id) {
      setStatsLeads([]);
      setStatsEnrollments([]);
      return;
    }

    const fetchStatsData = async () => {
      setIsLoadingStatsData(true);
      try {
        // Consultar leads específicos de esta landing
        const qLeads = query(
          collection(db, 'leads'),
          where('landingId', '==', selectedStatsPage.id)
        );
        const leadsSnap = await getDocs(qLeads);
        const leadsData = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        leadsData.sort((a: any, b: any) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setStatsLeads(leadsData);

        // Consultar inscripciones (ventas) específicas de esta landing
        const qEnrollments = query(
          collection(db, 'enrollments'),
          where('metadata.pageId', '==', selectedStatsPage.id)
        );
        const enrollmentsSnap = await getDocs(qEnrollments);
        const enrollmentsData = enrollmentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        enrollmentsData.sort((a: any, b: any) => {
          const tA = a.enrolledAt?.seconds || 0;
          const tB = b.enrolledAt?.seconds || 0;
          return tB - tA;
        });
        setStatsEnrollments(enrollmentsData);
      } catch (err) {
        console.error("Error al cargar las estadísticas de la landing:", err);
      } finally {
        setIsLoadingStatsData(false);
      }
    };

    fetchStatsData();
  }, [db, selectedStatsPage?.id]);

  const courseMap = useMemo(() => {
    const map: Record<string, string> = {};
    courses?.forEach((c: any) => { map[c.id] = c.title; });
    return map;
  }, [courses]);

  // Agrupar landings por curso
  const groupedByCourse = useMemo(() => {
    if (!rawPages) return null;

    const filtered = rawPages.filter((p: any) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.title?.toLowerCase().includes(term) ||
        courseMap[p.courseId]?.toLowerCase().includes(term) ||
        p.type?.toLowerCase().includes(term)
      );
    });

    const groups: Record<string, { courseName: string; pages: any[] }> = {};
    filtered.forEach((page: any) => {
      const cId = page.courseId || '__sin_curso__';
      const cName = courseMap[cId] || (cId === '__sin_curso__' ? 'Sin Curso Asignado' : `Curso ${cId.substring(0, 6)}…`);
      if (!groups[cId]) groups[cId] = { courseName: cName, pages: [] };
      groups[cId].pages.push(page);
    });

    // Ordenar páginas dentro de cada grupo por fecha desc
    Object.values(groups).forEach(g => {
      g.pages.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    });

    return groups;
  }, [rawPages, courseMap, searchTerm]);

  const toggleCourse = (id: string) => {
    setOpenCourses(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Auto-expandir todos los cursos al cargar por primera vez
  useEffect(() => {
    if (groupedByCourse && openCourses.length === 0) {
      setOpenCourses(Object.keys(groupedByCourse));
    }
  }, [groupedByCourse]);

  const handleCopyLink = (id: string, variant: number) => {
    const url = `${window.location.origin}/v/${id}?v=${variant}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Enlace copiado', description: `URL de variante ${variant + 1} lista para compartir.` });
  };

  const handleDelete = async (e: React.BaseSyntheticEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(current => current === id ? null : current), 3000);
      toast({ title: '¿Confirmar borrado?', description: 'Pulsa de nuevo para eliminar permanentemente.' });
      return;
    }
    setConfirmDeleteId(null);
    setDeletingIds(prev => ({ ...prev, [id]: true }));
    try {
      await deleteDoc(doc(db, 'salesPages', id));
      toast({ title: 'Landing eliminada' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al borrar', description: e.message });
    } finally {
      setDeletingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleExtend = async () => {
    if (!extendingPage || !newEndDate) {
      toast({ variant: 'destructive', title: 'Fecha requerida', description: 'Por favor seleccioná una nueva fecha de vencimiento.' });
      return;
    }
    setIsExtending(true);
    try {
      const newUntil = Timestamp.fromDate(new Date(newEndDate));
      await updateDoc(doc(db, 'salesPages', extendingPage.id), { activeUntil: newUntil, updatedAt: Timestamp.now() });
      toast({ title: '¡Prórroga aplicada!', description: `La landing "${extendingPage.title}" fue extendida hasta el ${new Date(newEndDate).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}.` });
      setExtendingPage(null);
      setNewEndDate('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al extender', description: e.message });
    } finally {
      setIsExtending(false);
    }
  };

  const handleClone = async () => {
    if (!cloningPage || !cloneData.referidoId || !cloneData.startDate || !cloneData.endDate) {
      toast({ variant: 'destructive', title: 'Faltan datos', description: 'Por favor completa todos los campos.' });
      return;
    }
    setIsCloning(true);
    try {
      const start = new Date(cloneData.startDate);
      const end = new Date(cloneData.endDate);
      const embajadorName = referidosMap[cloneData.referidoId] || 'Embajador';

      const newPage = {
        ...cloningPage,
        landingType: 'promocion',
        referidoId: cloneData.referidoId,
        referidoName: embajadorName,
        title: `${cloningPage.title} - Promo ${embajadorName}`,
        price: Number(cloneData.price),
        activeFrom: Timestamp.fromDate(start),
        activeUntil: Timestamp.fromDate(end),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        stats: { conversions: 0, totalClicks: 0 },
      };
      delete newPage.id;

      await addDoc(collection(db, 'salesPages'), newPage);
      toast({ title: 'Landing clonada con éxito', description: `Se ha creado la promoción para ${embajadorName}.` });
      setCloningPage(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al clonar', description: e.message });
    } finally {
      setIsCloning(false);
    }
  };

  const totalCount = rawPages?.length ?? 0;
  const courseCount = groupedByCourse ? Object.keys(groupedByCourse).length : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Landings de Venta</h1>
            <p className="text-muted-foreground text-lg font-medium">
              {totalCount} landing{totalCount !== 1 ? 's' : ''} en {courseCount} curso{courseCount !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            onClick={() => router.push('/mentoria/marketing/landings/v2-build')}
            className="h-12 px-8 rounded-2xl font-bold flex items-center gap-2 bg-primary hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" /> Nueva Landing
          </Button>
        </header>

        {/* Buscador */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por curso, título o tipo…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-11 bg-white border-border/50 shadow-sm font-medium"
           size="lg" />
        </div>

        {/* Contenido */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : !groupedByCourse || Object.keys(groupedByCourse).length === 0 ? (
          <div className="py-24 text-center bg-secondary/5 rounded-3xl border-2 border-dashed">
            <Layout className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-muted-foreground mb-1">
              {searchTerm ? 'Sin resultados' : 'No hay landings creadas'}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {searchTerm
                ? `No encontramos landings que coincidan con "${searchTerm}"`
                : 'Crea tu primera landing de venta para empezar a comercializar tus cursos.'}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => router.push('/mentoria/marketing/landings/build')}
                variant="link"
                className="font-bold text-primary mt-3"
              >
                Crear Landing ahora
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByCourse).map(([courseId, group]) => {
              const isOpen = openCourses.includes(courseId);
              return (
                <div key={courseId} className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                  {/* Cabecera del grupo / curso */}
                  <button
                    onClick={() => toggleCourse(courseId)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-foreground text-sm leading-tight">{group.courseName}</p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {group.pages.length} landing{group.pages.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Resumen de tipos */}
                      <div className="hidden sm:flex gap-1.5">
                        {Array.from(new Set(group.pages.map((p: any) => p.landingType || p.type))).map((lt: any) => {
                          const info = getPageTypeInfo({ landingType: lt, type: lt, referidoId: null });
                          return (
                            <span key={lt} className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', info.color)}>
                              {info.label}
                            </span>
                          );
                        })}
                      </div>
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </button>

                   {/* Filas de landings */}
                   {isOpen && (
                     <div className="border-t border-border/40 overflow-x-auto">
                       {/* Cabecera de tabla */}
                       <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto_auto] items-center gap-4 px-6 py-2 bg-muted border-b border-border/30 min-w-[700px]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Landing</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-24 text-center hidden sm:block">Tipo</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-16 text-center hidden md:block">Inicio</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-16 text-center hidden md:block">Fin</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32 text-center hidden md:block">Embajador</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20 text-center hidden md:block">Precio</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20 text-center hidden lg:block">Creada</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-36 text-right">Acciones</span>
                      </div>

                      {group.pages.map((page: any) => {
                        const typeInfo = getPageTypeInfo(page);
                        const TypeIcon = typeInfo.icon;
                        const isConfirmDelete = confirmDeleteId === page.id;
                        const isDeleting = deletingIds[page.id];
                        const isV2 = !!page.content?.sections;
                        const variantsCount = isV2 ? 1 : (page.aiContent?.landings?.length || (page.aiContent?.landing ? 1 : 0));

                        return (
                          <div
                            key={page.id}
                             className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto_auto] items-center gap-4 px-6 py-3.5 border-b border-border/20 last:border-b-0 hover:bg-muted/50 transition-colors min-w-[700px]"
                          >
                            {/* Nombre y variantes */}
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-foreground truncate leading-tight">{page.title || 'Sin título'}</p>
                              {variantsCount > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {Array.from({ length: variantsCount }, (_, v) => {
                                    const label = isV2 ? 'Ver Landing' : (page.aiContent?.landings?.[v]?.marketingName || `Variante ${v + 1}`);
                                    const link = isV2 ? `/v/${page.id}` : `/v/${page.id}?v=${v}`;
                                    return (
                                      <button
                                        key={v}
                                        onClick={() => window.open(link, '_blank')}
                                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                                      >
                                        <ExternalLink className="h-2.5 w-2.5" />
                                        {label}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Tipo */}
                            <div className="w-24 justify-center hidden sm:flex">
                              <span className={cn('flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full', typeInfo.color)}>
                                <TypeIcon className="h-3 w-3" />
                                {typeInfo.label}
                              </span>
                            </div>

                            {/* Inicio */}
                            <div className="w-16 text-center hidden md:block">
                              <span className="text-[10px] font-bold text-muted-foreground">
                                {page.activeFrom?.toDate 
                                  ? format(page.activeFrom.toDate(), 'dd/MM/yy') 
                                  : page.activeFrom?.seconds 
                                    ? format(new Date(page.activeFrom.seconds * 1000), 'dd/MM/yy') 
                                    : '—'}
                              </span>
                            </div>

                            {/* Fin */}
                            <div className="w-16 text-center hidden md:block">
                              <span className="text-[10px] font-bold text-muted-foreground">
                                {page.activeUntil?.toDate 
                                  ? format(page.activeUntil.toDate(), 'dd/MM/yy') 
                                  : page.activeUntil?.seconds 
                                    ? format(new Date(page.activeUntil.seconds * 1000), 'dd/MM/yy') 
                                    : '—'}
                              </span>
                            </div>

                            {/* Embajador */}
                            <div className="w-32 text-center hidden md:block truncate px-2">
                              <span className="text-xs font-bold text-primary truncate">
                                {page.referidoId ? page.referidoName || referidosMap[page.referidoId] || 'ID: ' + page.referidoId.substring(0, 6) : '—'}
                              </span>
                            </div>

                            {/* Precio */}
                            <div className="w-20 text-center hidden md:flex items-center justify-center gap-1">
                              {page.price != null ? (
                                <span className="text-xs font-bold text-success flex items-center gap-0.5">
                                  <DollarSign className="h-3 w-3" />
                                  {page.price === 0 ? 'Gratis' : page.price.toLocaleString('es-AR')}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>

                            {/* Fecha */}
                            <div className="w-20 text-center hidden lg:block">
                              <span className="text-[10px] font-bold text-muted-foreground">
                                {page.createdAt?.toDate ? format(page.createdAt.toDate(), 'dd/MM/yy') : '—'}
                              </span>
                            </div>

                            {/* Acciones */}
                            <div className="w-36 flex items-center justify-end gap-1">
                              {/* Clonar Promo */}
                              {(!page.landingType || page.landingType === 'general') && (
                                <button
                                  onClick={() => {
                                    setCloningPage(page);
                                    setCloneData({ referidoId: '', startDate: '', endDate: '', price: page.price || 0 });
                                  }}
                                  title="Clonar Promo"
                                  className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {/* Prorrogar vencimiento — solo para landings de tipo promocion */}
                              {page.landingType === 'promocion' && (
                                <button
                                  onClick={() => {
                                    const current = page.activeUntil?.toDate
                                      ? page.activeUntil.toDate()
                                      : page.activeUntil?.seconds
                                        ? new Date(page.activeUntil.seconds * 1000)
                                        : new Date();
                                    // Formato yyyy-MM-ddTHH:mm requerido por datetime-local
                                    const pad = (n: number) => String(n).padStart(2, '0');
                                    const local = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}T${pad(current.getHours())}:${pad(current.getMinutes())}`;
                                    setNewEndDate(local);
                                    setExtendingPage(page);
                                  }}
                                  title="Prorrogar vencimiento"
                                  className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-warn hover:bg-warn/10 transition-colors"
                                >
                                  <CalendarClock className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {/* Ver Estadísticas */}
                              <button
                                onClick={() => setSelectedStatsPage(page)}
                                title="Ver Estadísticas"
                                className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                              >
                                <BarChart2 className="h-3.5 w-3.5" />
                              </button>
                              {/* Editar */}
                              <button
                                onClick={() => router.push(isV2 ? `/mentoria/marketing/landings/v2-edit/${page.id}` : `/mentoria/marketing/landings/build?id=${page.id}`)}
                                title="Editar"
                                className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                              >
                                <FileEdit className="h-3.5 w-3.5" />
                              </button>
                              {/* Eliminar */}
                              <button
                                onClick={(e) => handleDelete(e, page.id)}
                                title={isConfirmDelete ? '¿Confirmar?' : 'Eliminar'}
                                className={cn(
                                  'h-8 w-8 rounded-xl flex items-center justify-center transition-colors',
                                  isConfirmDelete
                                    ? 'bg-danger text-white animate-pulse'
                                    : 'text-muted-foreground hover:text-danger hover:bg-danger/10'
                                )}
                              >
                                {isDeleting
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />
                                }
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Detalle de Estadísticas */}
        <Dialog open={!!selectedStatsPage} onOpenChange={(open) => !open && setSelectedStatsPage(null)}>
          <DialogContent className="mw-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="pb-4 border-b border-muted">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <BarChart2 className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <div className="text-left font-sans">
                  <DialogTitle className="text-2xl font-black text-foreground tracking-tight">
                    Estadísticas de la Landing
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground font-medium line-clamp-1">
                    {selectedStatsPage?.title || 'Sin título'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {isLoadingStatsData ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-semibold">Cargando métricas de rendimiento...</p>
              </div>
            ) : (
              <div className="space-y-6 pt-4 font-sans">
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Accesos */}
                  <div className="bg-primary/10/50 border border-primary/15/50 rounded-2xl p-4 relative overflow-hidden group">
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-primary group-hover:scale-110 transition-transform">
                      <MousePointer2 className="h-16 w-16" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-primary">Accesos (Clics)</p>
                    <p className="text-3xl font-black text-foreground mt-1">
                      {Math.max(selectedStatsPage?.stats?.totalClicks || 0, statsLeads.length, selectedStatsPage?.stats?.conversions || 0).toLocaleString()}
                    </p>
                  </div>

                  {/* Leads */}
                  <div className="bg-primary/10/50 border border-primary/15/50 rounded-2xl p-4 relative overflow-hidden group">
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-primary group-hover:scale-110 transition-transform">
                      <Users className="h-16 w-16" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-primary">Leads Obtenidos</p>
                    <p className="text-3xl font-black text-foreground mt-1">
                      {statsLeads.length.toLocaleString()}
                    </p>
                  </div>

                  {/* Ventas */}
                  <div className="bg-success/10/50 border border-success/15/50 rounded-2xl p-4 relative overflow-hidden group">
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-success group-hover:scale-110 transition-transform">
                      <Target className="h-16 w-16" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-success">Ventas Realizadas</p>
                    <p className="text-3xl font-black text-foreground mt-1">
                      {(selectedStatsPage?.stats?.conversions || 0).toLocaleString()}
                    </p>
                  </div>

                  {/* Tasa de conversión */}
                  <div className="bg-warn/10/50 border border-warn/15/50 rounded-2xl p-4 relative overflow-hidden group">
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-warn group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-16 w-16" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-warn">Conversion Rate (CR)</p>
                    <p className="text-3xl font-black text-foreground mt-1">
                      {(() => {
                        const clicks = Math.max(selectedStatsPage?.stats?.totalClicks || 0, statsLeads.length, selectedStatsPage?.stats?.conversions || 0);
                        const convs = selectedStatsPage?.stats?.conversions || 0;
                        return clicks > 0 ? `${((convs / clicks) * 100).toFixed(1)}%` : '0.0%';
                      })()}
                    </p>
                  </div>
                </div>

                {/* Tabs for details */}
                <Tabs defaultValue="leads" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-xl">
                    <TabsTrigger value="leads" className="rounded-lg font-bold text-sm">
                      Historial de Leads ({statsLeads.length})
                    </TabsTrigger>
                    <TabsTrigger value="sales" className="rounded-lg font-bold text-sm">
                      Ventas / Inscritos ({statsEnrollments.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Leads Tab Content */}
                  <TabsContent value="leads" className="mt-4">
                    <div className="border border-muted rounded-2xl overflow-hidden shadow-sm bg-white">
                      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[10px] text-muted-foreground uppercase bg-muted font-black tracking-widest border-b border-muted sticky top-0 z-10">
                            <tr>
                              <th className="px-5 py-3">Estudiante</th>
                              <th className="px-5 py-3">Fecha</th>
                              <th className="px-5 py-3 text-right">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {statsLeads.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="px-5 py-10 text-center text-muted-foreground italic">
                                  Aún no hay leads registrados para esta landing.
                                </td>
                              </tr>
                            ) : (
                              statsLeads.map((lead: any) => {
                                const date = lead.createdAt?.seconds 
                                  ? format(new Date(lead.createdAt.seconds * 1000), "dd MMM yyyy, HH:mm", { locale: es })
                                  : 'Reciente';

                                return (
                                  <tr key={lead.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-5 py-3.5">
                                      <div className="font-bold text-foreground">{lead.studentName}</div>
                                      <div className="text-xs text-muted-foreground">{lead.studentEmail}</div>
                                    </td>
                                    <td className="px-5 py-3.5 text-muted-foreground text-xs font-semibold">
                                      {date}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                      {lead.status === 'converted' ? (
                                        <Badge className="bg-success/10 text-success hover:bg-success/10 border-none font-bold text-[10px]">
                                          <CheckCircle2 className="h-3 w-3 mr-1" /> Convertido
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-warn/10 text-warn hover:bg-warn/10 border-none font-bold text-[10px]">
                                          <Clock className="h-3 w-3 mr-1" /> Pendiente
                                        </Badge>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Sales Tab Content */}
                  <TabsContent value="sales" className="mt-4">
                    <div className="border border-muted rounded-2xl overflow-hidden shadow-sm bg-white">
                      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[10px] text-muted-foreground uppercase bg-muted font-black tracking-widest border-b border-muted sticky top-0 z-10">
                            <tr>
                              <th className="px-5 py-3">Alumno</th>
                              <th className="px-5 py-3">Fecha Compra</th>
                              <th className="px-5 py-3">ID Pago</th>
                              <th className="px-5 py-3 text-right">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {statsEnrollments.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground italic">
                                  Aún no hay inscripciones registradas para esta landing.
                                </td>
                              </tr>
                            ) : (
                              statsEnrollments.map((enroll: any) => {
                                const date = enroll.enrolledAt?.seconds 
                                  ? format(new Date(enroll.enrolledAt.seconds * 1000), "dd MMM yyyy, HH:mm", { locale: es })
                                  : 'Reciente';

                                return (
                                  <tr key={enroll.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-5 py-3.5">
                                      <div className="font-bold text-foreground">{enroll.inviteEmail}</div>
                                      <div className="text-[10px] text-muted-foreground">ID: {enroll.studentId}</div>
                                    </td>
                                    <td className="px-5 py-3.5 text-muted-foreground text-xs font-semibold">
                                      {date}
                                    </td>
                                    <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">
                                      {enroll.paymentId || 'N/A'}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-bold text-[10px]">
                                        {enroll.status === 'active' ? 'Activo' : enroll.status}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Nota de advertencia sobre la permanencia de los datos al borrar landings */}
                <div className="p-4 rounded-2xl bg-warn/10/80 border border-warn/15 text-xs text-warn leading-relaxed font-medium">
                  ⚠️ <strong>Nota de Integridad de Datos:</strong> Los leads y alumnos registrados son propiedad exclusiva del tutor de forma global. La eliminación de esta landing no afectará a los leads ni a los alumnos generados, los cuales permanecerán seguros en tu base de datos para no interrumpir su progreso.
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Clonación */}
        <Dialog open={!!cloningPage} onOpenChange={(open) => !open && setCloningPage(null)}>
          <DialogContent className="mw-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-foreground">Clonar para Embajador</DialogTitle>
              <DialogDescription>
                Crea una promoción exclusiva de "{cloningPage?.title}".
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Embajador / Influencer</label>
                <select
                  className="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-white px-4 py-2 text-sm ring-offset-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  value={cloneData.referidoId}
                  onChange={e => setCloneData({...cloneData, referidoId: e.target.value})}
                >
                  <option value="">Selecciona un embajador...</option>
                  {referidos?.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.displayName || r.email}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Fecha Inicio</label>
                  <Input 
                    type="datetime-local" 
                    value={cloneData.startDate}
                    onChange={e => setCloneData({...cloneData, startDate: e.target.value})}
                    className="bg-muted border-border"
                   size="lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Fecha Fin</label>
                  <Input 
                    type="datetime-local" 
                    value={cloneData.endDate}
                    onChange={e => setCloneData({...cloneData, endDate: e.target.value})}
                    className="bg-muted border-border"
                   size="lg" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Precio Promocional ($)</label>
                <Input 
                  type="number" 
                  value={cloneData.price}
                  onChange={e => setCloneData({...cloneData, price: Number(e.target.value)})}
                  className="bg-muted border-border font-bold text-lg"
                 size="lg" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-muted">
              <Button variant="ghost" onClick={() => setCloningPage(null)} disabled={isCloning} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleClone} disabled={isCloning} className="rounded-xl bg-primary hover:bg-primary">
                {isCloning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Promoción'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Prórroga de Vencimiento */}
        <Dialog open={!!extendingPage} onOpenChange={(open) => { if (!open) { setExtendingPage(null); setNewEndDate(''); } }}>
          <DialogContent className="mw-sm">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-warn/10 flex items-center justify-center shrink-0">
                  <CalendarClock className="h-5 w-5 text-warn" />
                </div>
                <DialogTitle className="text-xl font-black text-foreground leading-tight">Prorrogar Vencimiento</DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground text-sm font-medium leading-relaxed pl-[3.25rem]">
                Extendé la fecha de cierre de la landing<br />
                <span className="font-bold text-foreground truncate block mt-0.5">&ldquo;{extendingPage?.title}&rdquo;</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Fecha actual */}
              {extendingPage?.activeUntil && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted border border-muted">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Vencimiento actual</p>
                    <p className="text-sm font-bold text-foreground">
                      {(() => {
                        const d = extendingPage.activeUntil?.toDate
                          ? extendingPage.activeUntil.toDate()
                          : new Date(extendingPage.activeUntil.seconds * 1000);
                        return format(d, "dd 'de' MMMM yyyy, HH:mm", { locale: es });
                      })()}
                    </p>
                  </div>
                </div>
              )}

              {/* Nueva fecha */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Nueva fecha de vencimiento</label>
                <Input
                  type="datetime-local"
                  value={newEndDate}
                  onChange={e => setNewEndDate(e.target.value)}
                  className="bg-warn/10/60 border-warn/20 focus:border-warn font-semibold text-foreground"
                 size="lg" />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-muted">
              <Button
                variant="ghost"
                onClick={() => { setExtendingPage(null); setNewEndDate(''); }}
                disabled={isExtending}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExtend}
                disabled={isExtending || !newEndDate}
                className="rounded-xl bg-warn hover:bg-warn text-white font-bold shadow-md shadow-warn/20"
              >
                {isExtending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <><CalendarClock className="h-4 w-4 mr-1.5" /> Aplicar Prórroga</>
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
