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
  Archive,
  ArchiveRestore,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ArrowRightLeft,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getEffectiveLandingStatus,
  checkPendingLimit,
  isAffiliateLanding,
  MAX_PENDING_LANDINGS_PER_PRODUCT,
  type LandingStatus,
} from '@/domain/sales-pages/landing-lifecycle';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useApiSalesPages } from '@/hooks/use-api-sales-pages';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function parseDate(dateValue: any): Date {
  if (!dateValue) return new Date(0);
  if (dateValue instanceof Date) return isNaN(dateValue.getTime()) ? new Date(0) : dateValue;
  if (typeof dateValue.toDate === 'function') {
    try {
      const d = dateValue.toDate();
      return isNaN(d.getTime()) ? new Date(0) : d;
    } catch {
      return new Date(0);
    }
  }
  if (typeof dateValue === 'object') {
    if (typeof dateValue.seconds === 'number') {
      const d = new Date(dateValue.seconds * 1000);
      return isNaN(d.getTime()) ? new Date(0) : d;
    }
    if (typeof dateValue._seconds === 'number') {
      const d = new Date(dateValue._seconds * 1000);
      return isNaN(d.getTime()) ? new Date(0) : d;
    }
  }
  const d = new Date(dateValue);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function formatDate(dateValue: any, formatStr = 'dd/MM/yy', options?: any): string {
  if (!dateValue) return '—';
  const d = parseDate(dateValue);
  if (d.getTime() === 0 || isNaN(d.getTime())) return '—';
  try {
    return format(d, formatStr, options);
  } catch {
    return '—';
  }
}

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

function getStatusBadgeInfo(status: LandingStatus) {
  switch (status) {
    case 'activa':
      return { label: 'Activa', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 font-bold', icon: CheckCircle2 };
    case 'programada':
      return { label: 'Programada', color: 'bg-blue-500/15 text-blue-700 border-blue-500/30 font-bold', icon: Clock };
    case 'pendiente':
      return { label: 'Pendiente', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30 font-bold', icon: AlertCircle };
    case 'expirada':
      return { label: 'Expirada', color: 'bg-rose-500/15 text-rose-700 border-rose-500/30 font-bold', icon: CalendarClock };
    case 'archivada':
      return { label: 'Archivada', color: 'bg-slate-500/15 text-slate-600 border-slate-500/30 font-bold', icon: Archive };
  }
}

export default function SalesLandingsDashboardPage() {
  const { profile, user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<'all' | 'course' | 'followup'>('all');
  const [scopeTab, setScopeTab] = useState<'tutor' | 'embajador'>('tutor');
  const [showArchived, setShowArchived] = useState(false);
  const [openCourses, setOpenCourses] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Estados para activación de landing única y relevo
  const [activatingPage, setActivatingPage] = useState<any | null>(null);
  const [selectedFallbackId, setSelectedFallbackId] = useState<string>('none');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Estados para cambiar landing de relevo
  const [editingFallbackPage, setEditingFallbackPage] = useState<any | null>(null);
  const [newFallbackId, setNewFallbackId] = useState<string>('none');

  // Estado para diálogo de asistencia al límite de 5 pendientes
  const [limitDialogData, setLimitDialogData] = useState<{
    courseId: string;
    courseName: string;
    pendingPages: any[];
    onResolved?: () => void;
  } | null>(null);

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
  const { data: rawPages, isLoading, refetch: refetchPages } = useApiSalesPages({
    type: 'all',
    mentorId: profile?.uid,
    skip: !profile?.uid
  });

  // Consulta de cursos del mentor para nombres
  const coursesQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'courses'), where('mentorId', '==', profile.uid));
  }, [db, profile?.uid]);
  const { data: courses } = useCollection(coursesQuery);

  // Consulta de mentorías (followups grupales)
  const followupsQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'followups'), where('mentorId', '==', profile.uid));
  }, [db, profile?.uid]);
  const { data: rawFollowups } = useCollection(followupsQuery);

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
    const map: Record<string, { title: string, productType: 'course' | 'followup' }> = {};
    courses?.forEach((c: any) => { map[c.id] = { title: c.title, productType: 'course' }; });
    rawFollowups?.forEach((f: any) => { map[f.id] = { title: f.title || f.goal || 'Mentoría grupal', productType: 'followup' }; });
    return map;
  }, [courses, rawFollowups]);

  // Agrupar landings por curso respetando solapa activa (tutor vs embajador) y estado
  const groupedByCourse = useMemo(() => {
    if (!rawPages) return null;

    const filtered = rawPages.filter((p: any) => {
      // Ocultar Packs Multimedia ya que no son landings reales sino contenedores de contenido
      if (p.type === 'campaign_videos' || p.type === 'campaign_pack') return false;

      // Filtrado por Solapa Principal (Oficiales vs Embajadores)
      const isAff = isAffiliateLanding(p);
      if (scopeTab === 'tutor' && isAff) return false;
      if (scopeTab === 'embajador' && !isAff) return false;

      // Filtrado por Archivadas
      const effectiveStatus = getEffectiveLandingStatus(p);
      if (!showArchived && effectiveStatus === 'archivada') return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.title?.toLowerCase().includes(term) ||
        courseMap[p.courseId]?.title?.toLowerCase().includes(term) ||
        p.type?.toLowerCase().includes(term) ||
        p.referidoName?.toLowerCase().includes(term)
      );
    });

    const groups: Record<string, {
      courseName: string;
      productType: 'course' | 'followup' | 'unknown';
      pages: any[];
      activePage?: any;
      pendingCount: number;
    }> = {};

    filtered.forEach((page: any) => {
      const cId = page.courseId || '__sin_curso__';
      const mapInfo = courseMap[cId];
      const cName = mapInfo ? mapInfo.title : (cId === '__sin_curso__' ? 'Sin Curso Asignado' : `Curso ${cId.substring(0, 6)}…`);
      const pType = mapInfo ? mapInfo.productType : 'unknown';

      if (!groups[cId]) {
        groups[cId] = { courseName: cName, productType: pType, pages: [], pendingCount: 0 };
      }
      groups[cId].pages.push(page);
    });

    // Ordenar páginas dentro de cada grupo y calcular pendingCount
    Object.values(groups).forEach(g => {
      g.pendingCount = g.pages.filter(p => getEffectiveLandingStatus(p) === 'pendiente').length;
      g.activePage = g.pages.find(p => getEffectiveLandingStatus(p) === 'activa');
      g.pages.sort((a: any, b: any) => {
        const rank = (status: LandingStatus) => {
          if (status === 'activa') return 1;
          if (status === 'programada') return 2;
          if (status === 'pendiente') return 3;
          if (status === 'expirada') return 4;
          return 5;
        };
        const rankA = rank(getEffectiveLandingStatus(a));
        const rankB = rank(getEffectiveLandingStatus(b));
        if (rankA !== rankB) return rankA - rankB;

        const dateA = parseDate(a.createdAt);
        const dateB = parseDate(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
    });

    return groups;
  }, [rawPages, courseMap, searchTerm, scopeTab, showArchived]);

  const toggleCourse = (id: string) => {
    setOpenCourses(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Mantener todas las cabeceras contraídas al cambiar de pestaña
  useEffect(() => {
    setOpenCourses([]);
  }, [scopeTab]);

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
      const token = await user?.getIdToken();
      const res = await fetch(`/api/sales-pages?pageId=${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast({ title: 'Landing eliminada' });
      refetchPages();
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
      const newUntil = new Date(newEndDate);
      const token = await user?.getIdToken();
      const res = await fetch('/api/sales-pages', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pageId: extendingPage.id,
          data: { activeUntil: newUntil.toISOString() }
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      toast({ title: '¡Prórroga aplicada!', description: `La landing "${extendingPage.title}" fue extendida hasta el ${newUntil.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}.` });
      setExtendingPage(null);
      setNewEndDate('');
      refetchPages();
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

      const newPageId = crypto.randomUUID();
      const newPageData = {
        ...cloningPage,
        landingType: 'promocion',
        referidoId: cloneData.referidoId,
        referidoName: embajadorName,
        title: `${cloningPage.title} - Promo ${embajadorName}`,
        price: Number(cloneData.price),
        activeFrom: start.toISOString(),
        activeUntil: end.toISOString(),
        isActive: false,
        status: 'pendiente',
        fallbackLandingId: null,
        stats: { conversions: 0, totalClicks: 0 },
      };
      delete newPageData.id;
      delete newPageData.createdAt;
      delete newPageData.updatedAt;

      const token = await user?.getIdToken();
      const res = await fetch('/api/sales-pages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pageId: newPageId,
          data: newPageData
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 && data.code === 'LIMIT_PENDING_REACHED') {
          setLimitDialogData({
            courseId: cloningPage.courseId || cloningPage.productId,
            courseName: cloningPage.title,
            pendingPages: data.pendingPages || [],
            onResolved: () => {
              handleClone();
            }
          });
          return;
        }
        throw new Error(data.error || 'Failed to clone');
      }
      toast({ title: 'Landing clonada con éxito', description: `Se ha creado la promoción para ${embajadorName}.` });
      setCloningPage(null);
      refetchPages();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al clonar', description: e.message });
    } finally {
      setIsCloning(false);
    }
  };

  const handleOpenActivation = (page: any) => {
    const courseId = page.courseId || page.productId;
    const isAff = isAffiliateLanding(page);
    const activeCurrent = (rawPages || []).find((p: any) => {
      const pCourse = p.courseId || p.productId;
      return pCourse === courseId && p.id !== page.id && isAffiliateLanding(p) === isAff && getEffectiveLandingStatus(p) === 'activa';
    });
    setActivatingPage(page);
    setSelectedFallbackId(page.fallbackLandingId || activeCurrent?.id || 'none');
  };

  const handleActivateLanding = async () => {
    if (!activatingPage) return;
    setIsUpdatingStatus(true);
    try {
      const token = await user?.getIdToken();
      const fallbackVal = selectedFallbackId === 'none' ? null : (selectedFallbackId || null);
      const res = await fetch('/api/sales-pages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pageId: activatingPage.id,
          data: {
            isActive: true,
            status: 'activa',
            fallbackLandingId: fallbackVal
          }
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al activar landing');
      }
      toast({ title: 'Landing Activada', description: `"${activatingPage.title}" es ahora la landing activa oficial.` });
      setActivatingPage(null);
      refetchPages();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al activar', description: e.message });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOpenEditFallback = (page: any) => {
    setEditingFallbackPage(page);
    setNewFallbackId(page.fallbackLandingId || 'none');
  };

  const handleSaveFallback = async () => {
    if (!editingFallbackPage) return;
    setIsUpdatingStatus(true);
    try {
      const token = await user?.getIdToken();
      const fallbackVal = newFallbackId === 'none' ? null : (newFallbackId || null);
      const res = await fetch('/api/sales-pages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pageId: editingFallbackPage.id,
          data: {
            fallbackLandingId: fallbackVal
          }
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar landing de relevo');
      }
      toast({ title: 'Relevo actualizado', description: 'Se guardó la landing que tomará el relevo al expirar.' });
      setEditingFallbackPage(null);
      refetchPages();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al guardar relevo', description: e.message });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleArchiveToggle = async (page: any) => {
    const effectiveStatus = getEffectiveLandingStatus(page);
    const isCurrentlyArchived = effectiveStatus === 'archivada';
    const targetStatus = isCurrentlyArchived ? 'pendiente' : 'archivada';

    if (isCurrentlyArchived) {
      const courseId = page.courseId || page.productId;
      const isAff = isAffiliateLanding(page);
      const limitCheck = checkPendingLimit(rawPages || [], courseId, isAff, page.referidoId);
      if (limitCheck.isLimitReached) {
        toast({
          variant: 'destructive',
          title: 'Cupo de 5 pendientes alcanzado',
          description: 'No se puede desarchivar porque el producto ya tiene 5 landings pendientes. Archiva otra primero.'
        });
        return;
      }
    }

    setIsUpdatingStatus(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/sales-pages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pageId: page.id,
          data: {
            status: targetStatus,
            isActive: false
          }
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al cambiar estado');
      }
      toast({
        title: targetStatus === 'archivada' ? 'Landing archivada' : 'Landing restaurada',
        description: targetStatus === 'archivada' ? 'Se liberó un cupo de pendientes.' : 'La landing volvió al estado pendiente.'
      });
      refetchPages();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleArchiveFromLimitDialog = async (pendingPageId: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/sales-pages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pageId: pendingPageId,
          data: {
            status: 'archivada',
            isActive: false
          }
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al archivar');
      }
      toast({ title: 'Cupo liberado', description: 'La landing seleccionada fue archivada exitosamente.' });
      const onRes = limitDialogData?.onResolved;
      setLimitDialogData(null);
      refetchPages();
      if (onRes) onRes();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al archivar', description: e.message });
    }
  };

  const officialCount = useMemo(() => (rawPages || []).filter(p => !isAffiliateLanding(p)).length, [rawPages]);
  const affiliateCount = useMemo(() => (rawPages || []).filter(p => isAffiliateLanding(p)).length, [rawPages]);
  const archivedCount = useMemo(() => (rawPages || []).filter(p => getEffectiveLandingStatus(p) === 'archivada').length, [rawPages]);

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
              {scopeTab === 'tutor' ? 'Canal Oficial del Tutor' : 'Canal de Embajadores'} · {courseCount} curso{courseCount !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            onClick={() => router.push('/marketing/landings/v2-build')}
            className="h-12 px-8 rounded-2xl font-bold flex items-center gap-2 bg-primary hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" /> Nueva Landing
          </Button>
        </header>

        {/* Pestañas de Alcance (Oficial vs Embajadores) y Filtro Archivadas */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-3">
          <div className="flex bg-muted p-1 rounded-2xl border border-border/50">
            <button
              onClick={() => setScopeTab('tutor')}
              className={cn(
                "px-5 py-2 text-sm font-bold rounded-xl transition-all flex items-center gap-2",
                scopeTab === 'tutor'
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Globe className="h-4 w-4 text-primary" />
              <span>Mis Landings Oficiales</span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-bold",
                scopeTab === 'tutor' ? "bg-primary/10 text-primary" : "bg-muted-foreground/10 text-muted-foreground"
              )}>
                {officialCount}
              </span>
            </button>
            <button
              onClick={() => setScopeTab('embajador')}
              className={cn(
                "px-5 py-2 text-sm font-bold rounded-xl transition-all flex items-center gap-2",
                scopeTab === 'embajador'
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-4 w-4 text-accent" />
              <span>Landings de Embajadores</span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-bold",
                scopeTab === 'embajador' ? "bg-primary/10 text-primary" : "bg-muted-foreground/10 text-muted-foreground"
              )}>
                {affiliateCount}
              </span>
            </button>
          </div>

          <button
            onClick={() => setShowArchived(prev => !prev)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all",
              showArchived
                ? "bg-secondary text-foreground border-border shadow-xs"
                : "text-muted-foreground border-dashed border-border/70 hover:bg-muted"
            )}
            title="Ver u ocultar landings archivadas"
          >
            <Archive className="h-3.5 w-3.5" />
            <span>{showArchived ? 'Ocultar Archivadas' : 'Ver Archivadas'}</span>
            {archivedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-bold text-muted-foreground">
                {archivedCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar landing o curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-xl border-border/50 bg-white"
            />
          </div>
          <div className="flex bg-muted p-1 rounded-xl w-fit border border-border/50">
            <button onClick={() => setCourseFilter('all')} className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-colors", courseFilter === 'all' ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>Todos</button>
            <button onClick={() => setCourseFilter('course')} className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-colors", courseFilter === 'course' ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>Cursos</button>
            <button onClick={() => setCourseFilter('followup')} className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-colors", courseFilter === 'followup' ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>Mentorías</button>
          </div>
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
                onClick={() => router.push('/marketing/landings/v2-build')}
                variant="link"
                className="font-bold text-primary mt-3"
              >
                Crear Landing ahora
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByCourse)
              .filter(([_, group]) => courseFilter === 'all' || group.productType === courseFilter)
              .map(([courseId, group]) => {
              const isOpen = openCourses.includes(courseId);
              return (
                <div key={courseId} className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
                  {/* Cabecera del grupo / curso */}
                  <button
                    onClick={() => toggleCourse(courseId)}
                    className={cn(
                      "w-full flex items-center justify-between px-6 py-4.5 transition-colors text-left border-l-4",
                      group.productType === 'followup' ? "border-l-accent" : "border-l-primary",
                      isOpen
                        ? "bg-muted/80 hover:bg-muted border-b border-border"
                        : "bg-muted/40 hover:bg-muted/70"
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                        group.productType === 'followup' ? "bg-accent text-white" : "bg-primary text-white"
                      )}>
                        {group.productType === 'followup' 
                          ? <Users className="h-5 w-5" />
                          : <BookOpen className="h-5 w-5" />
                        }
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <p className="font-extrabold text-foreground text-base tracking-tight leading-snug">{group.courseName}</p>
                          <span className={cn(
                            "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs",
                            group.pendingCount >= 5
                              ? "bg-danger text-white border-danger font-black"
                              : "bg-background text-foreground/80 border-border"
                          )}>
                            {group.pendingCount}/5 pendientes
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-semibold flex-wrap">
                          <span className="bg-background/90 text-foreground/80 px-2.5 py-0.5 rounded-md border border-border/60">
                            {group.pages.length} landing{group.pages.length !== 1 ? 's' : ''}
                          </span>
                          {scopeTab === 'tutor' && (
                            group.activePage ? (
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                Activa: <span className="underline decoration-dotted truncate max-w-[260px]">{group.activePage.title}</span>
                              </span>
                            ) : (
                              <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                Sin landing activa
                              </span>
                            )
                          )}
                        </div>
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
                      {scopeTab === 'tutor' ? (
                        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] items-center gap-4 px-6 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-border/40 min-w-[850px]">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Landing</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-28 text-center">Estado</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-24 text-center hidden sm:block">Tipo</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-16 text-center hidden md:block">Inicio</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-16 text-center hidden md:block">Fin</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-28 text-center hidden lg:block">Relevo</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20 text-center hidden md:block">Precio</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-48 text-right">Acciones</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] items-center gap-4 px-6 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-border/40 min-w-[750px]">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Landing</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-28 text-center">Estado</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32 text-center hidden md:block">Embajador</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-16 text-center hidden md:block">Inicio</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-16 text-center hidden md:block">Fin</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20 text-center hidden md:block">Precio</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-44 text-right">Acciones</span>
                        </div>
                      )}

                      {group.pages.map((page: any) => {
                        const rawStatus = getEffectiveLandingStatus(page);
                        // En canal oficial del tutor garantizamos que solo 1 landing por grupo sea 'activa' (la oficial designada)
                        const effectiveStatus = (scopeTab === 'tutor' && rawStatus === 'activa' && group.activePage?.id !== page.id)
                          ? 'pendiente'
                          : rawStatus;
                        const statusBadge = getStatusBadgeInfo(effectiveStatus);
                        const StatusBadgeIcon = statusBadge.icon;
                        const typeInfo = getPageTypeInfo(page);
                        const TypeIcon = typeInfo.icon;
                        const isConfirmDelete = confirmDeleteId === page.id;
                        const isDeleting = deletingIds[page.id];
                        const fallbackPage = page.fallbackLandingId
                          ? (rawPages || []).find((p: any) => p.id === page.fallbackLandingId)
                          : null;

                        return (
                          <div
                            key={page.id}
                            className={cn(
                              "items-center gap-4 px-6 py-3.5 border-b border-border/20 last:border-b-0 hover:bg-muted/50 transition-colors",
                              scopeTab === 'tutor'
                                ? "grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] min-w-[850px]"
                                : "grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] min-w-[750px]",
                              effectiveStatus === 'archivada' && "opacity-60 bg-muted/20"
                            )}
                          >
                            {/* Nombre y variantes */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm text-foreground truncate leading-tight">{page.title || 'Sin título'}</p>
                                {effectiveStatus === 'activa' && scopeTab === 'tutor' && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-success/15 text-success border border-success/30">
                                    Vigente
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <button
                                  onClick={() => window.open(`/v/${page.id}${effectiveStatus === 'pendiente' ? '?preview=true' : ''}`, '_blank')}
                                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" />
                                  {effectiveStatus === 'pendiente' ? 'Previsualizar' : 'Ver Landing'}
                                </button>
                                <span className="text-[10px] text-muted-foreground">
                                  Creada: {formatDate(page.createdAt)}
                                </span>
                              </div>
                            </div>

                            {/* Estado */}
                            <div className="w-28 text-center flex justify-center">
                              <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border', statusBadge.color)}>
                                <StatusBadgeIcon className="h-3 w-3" />
                                {statusBadge.label}
                              </span>
                            </div>

                            {/* Columnas específicas del canal Oficial del Tutor */}
                            {scopeTab === 'tutor' && (
                              <>
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
                                    {formatDate(page.activeFrom)}
                                  </span>
                                </div>

                                {/* Fin */}
                                <div className="w-16 text-center hidden md:block">
                                  <span className="text-[10px] font-bold text-muted-foreground">
                                    {formatDate(page.activeUntil)}
                                  </span>
                                </div>

                                {/* Relevo (Fallback) */}
                                <div className="w-28 text-center hidden lg:block truncate px-1">
                                  {page.landingType === 'promocion' ? (
                                    <button
                                      onClick={() => handleOpenEditFallback(page)}
                                      title="Hacé clic para cambiar la landing de relevo al vencer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-border/70 hover:border-primary/50 hover:bg-primary/5 transition-all text-[11px] font-semibold max-w-full truncate text-foreground group"
                                    >
                                      <span className="truncate">
                                        {fallbackPage ? fallbackPage.title : (page.fallbackLandingId ? 'ID ' + page.fallbackLandingId.substring(0, 6) : 'Ninguna')}
                                      </span>
                                      <ArrowRightLeft className="h-2.5 w-2.5 text-muted-foreground group-hover:text-primary shrink-0" />
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground">—</span>
                                  )}
                                </div>
                              </>
                            )}

                            {/* Columnas específicas del canal Embajador */}
                            {scopeTab === 'embajador' && (
                              <>
                                {/* Embajador */}
                                <div className="w-32 text-center hidden md:block truncate px-2">
                                  <span className="text-xs font-bold text-primary truncate block" title={page.referidoName || referidosMap[page.referidoId]}>
                                    {page.referidoId ? page.referidoName || referidosMap[page.referidoId] || 'ID: ' + page.referidoId.substring(0, 6) : '—'}
                                  </span>
                                </div>

                                {/* Inicio */}
                                <div className="w-16 text-center hidden md:block">
                                  <span className="text-[10px] font-bold text-muted-foreground">
                                    {formatDate(page.activeFrom)}
                                  </span>
                                </div>

                                {/* Fin */}
                                <div className="w-16 text-center hidden md:block">
                                  <span className="text-[10px] font-bold text-muted-foreground">
                                    {formatDate(page.activeUntil)}
                                  </span>
                                </div>
                              </>
                            )}

                            {/* Precio (común a ambos) */}
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

                            {/* Acciones */}
                            <div className={cn("flex items-center justify-end gap-1", scopeTab === 'tutor' ? "w-48" : "w-44")}>
                              {/* Activar landing */}
                              {effectiveStatus !== 'activa' && effectiveStatus !== 'archivada' && (
                                <button
                                  onClick={() => handleOpenActivation(page)}
                                  title="Establecer como landing activa oficial"
                                  className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-success hover:bg-success/10 transition-colors"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {/* Archivar / Desarchivar */}
                              <button
                                onClick={() => handleArchiveToggle(page)}
                                title={effectiveStatus === 'archivada' ? 'Desarchivar landing (pasar a pendiente)' : 'Archivar para liberar cupo'}
                                className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              >
                                {effectiveStatus === 'archivada' ? (
                                  <ArchiveRestore className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <Archive className="h-3.5 w-3.5" />
                                )}
                              </button>

                              {/* Clonar Promo (solo tutor) */}
                              {scopeTab === 'tutor' && (!page.landingType || page.landingType === 'general') && (
                                <button
                                  onClick={() => {
                                    setCloningPage(page);
                                    setCloneData({ referidoId: '', startDate: '', endDate: '', price: page.price || 0 });
                                  }}
                                  title="Clonar como Promoción"
                                  className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {/* Prorrogar vencimiento — solo para promocion */}
                              {page.landingType === 'promocion' && (
                                <button
                                  onClick={() => {
                                    const current = parseDate(page.activeUntil);
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

                              {/* Cambiar Landing de Relevo — solo para promocion */}
                              {page.landingType === 'promocion' && (
                                <button
                                  onClick={() => handleOpenEditFallback(page)}
                                  title="Cambiar landing de relevo al vencer"
                                  className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
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
                                onClick={() => router.push(`/marketing/landings/v2-edit/${page.id}`)}
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
                                    ? 'text-white bg-danger animate-pulse shadow-lg shadow-danger/20'
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
                                const date = formatDate(lead.createdAt, "dd MMM yyyy, HH:mm", { locale: es });

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
                                const date = formatDate(enroll.enrolledAt, "dd MMM yyyy, HH:mm", { locale: es });

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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-warn/10 flex items-center justify-center shrink-0">
                  <CalendarClock className="h-5 w-5 text-warn" />
                </div>
                <DialogTitle className="text-xl font-black text-foreground leading-tight">Prorrogar Vencimiento</DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground text-sm font-medium leading-relaxed pl-[3.25rem]">
                Extendé la fecha de cierre de la landing<br />
                <span className="font-bold text-foreground break-words line-clamp-3 mt-1" title={extendingPage?.title}>
                  &ldquo;{extendingPage?.title}&rdquo;
                </span>
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
                      {formatDate(extendingPage.activeUntil, "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
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

        {/* Modal de Activación y Relevo */}
        <Dialog open={!!activatingPage} onOpenChange={(open) => !open && setActivatingPage(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-success" />
                </div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Activar Landing Oficial
                </DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground text-sm font-medium">
                Al activar esta landing, la landing activa actual pasará automáticamente a estado <strong>pendiente</strong> para garantizar que solo haya 1 landing vigente en el canal oficial.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="p-3.5 rounded-xl bg-muted/60 border border-border/40 space-y-1.5">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Landing a Activar</p>
                <p className="text-sm font-bold text-foreground">{activatingPage?.title}</p>
                <div className="flex gap-2 pt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {getPageTypeInfo(activatingPage || {}).label}
                  </Badge>
                  {activatingPage?.price != null && (
                    <Badge variant="secondary" className="text-[10px]">
                      ARS ${activatingPage.price.toLocaleString('es-AR')}
                    </Badge>
                  )}
                </div>
              </div>

              {activatingPage?.landingType === 'promocion' && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Landing de Relevo (Al vencer la promoción)
                  </label>
                  <Select value={selectedFallbackId} onValueChange={setSelectedFallbackId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar landing de relevo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        Ninguna (sin landing de relevo)
                      </SelectItem>
                      {(rawPages || [])
                        .filter((p: any) => {
                          const cId = p.courseId || p.productId;
                          const actCId = activatingPage?.courseId || activatingPage?.productId;
                          return cId === actCId && p.id !== activatingPage?.id && !isAffiliateLanding(p);
                        })
                        .map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.title} ({p.landingType || 'general'})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Cuando esta promoción expire, el catálogo del tutor continuará automáticamente ofreciendo la landing de relevo seleccionada (o quedará sin landing activa si eliges &ldquo;Ninguna&rdquo;).
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
              <Button variant="ghost" onClick={() => setActivatingPage(null)} disabled={isUpdatingStatus}>
                Cancelar
              </Button>
              <Button onClick={handleActivateLanding} disabled={isUpdatingStatus} className="bg-success hover:bg-success/90 text-white font-bold">
                {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar y Activar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal para Cambiar Landing de Relevo */}
        <Dialog open={!!editingFallbackPage} onOpenChange={(open) => !open && setEditingFallbackPage(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Cambiar Landing de Relevo
                </DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground text-sm font-medium">
                Configura qué landing se activará automáticamente cuando la promoción <strong>&ldquo;{editingFallbackPage?.title}&rdquo;</strong> llegue a su fecha de vencimiento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Landing a Activar al Vencer
                </label>
                <Select value={newFallbackId} onValueChange={setNewFallbackId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar landing..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Ninguna (sin landing de relevo)
                    </SelectItem>
                    {(rawPages || [])
                      .filter((p: any) => {
                        const cId = p.courseId || p.productId;
                        const targetCId = editingFallbackPage?.courseId || editingFallbackPage?.productId;
                        return cId === targetCId && p.id !== editingFallbackPage?.id && !isAffiliateLanding(p);
                      })
                      .map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title} ({p.landingType || 'general'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Al expirar la promoción, el catálogo oficial del tutor activará esta landing seleccionada (o quedará sin landing activa si seleccionas &ldquo;Ninguna&rdquo;).
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
              <Button variant="ghost" onClick={() => setEditingFallbackPage(null)} disabled={isUpdatingStatus}>
                Cancelar
              </Button>
              <Button onClick={handleSaveFallback} disabled={isUpdatingStatus} className="bg-primary hover:bg-primary/90 text-white font-bold">
                {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Relevo'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Asistencia por Cupo de Pendientes (5 max) */}
        <Dialog open={!!limitDialogData} onOpenChange={(open) => !open && setLimitDialogData(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-danger/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-danger" />
                </div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Cupo de 5 Landings Pendientes Alcanzado
                </DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground text-sm font-medium">
                Para mantener el catálogo ordenado y la consistencia de ofertas, cada producto puede tener un máximo de 5 landings pendientes. Archiva una de las siguientes landings para liberar cupo y continuar:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-3 max-h-[50vh] overflow-y-auto">
              {limitDialogData?.pendingPages?.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/40 hover:bg-muted/80 transition-colors gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{p.title || 'Sin título'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Creada: {formatDate(p.createdAt)} · {p.landingType || 'general'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleArchiveFromLimitDialog(p.id)}
                    className="shrink-0 gap-1.5 text-xs font-bold border-danger/30 text-danger hover:bg-danger/10"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archivar
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-border/40">
              <Button variant="ghost" onClick={() => setLimitDialogData(null)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
