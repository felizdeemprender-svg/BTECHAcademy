
'use client';

import { useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Trash2,
  Mail,
  Instagram,
  Megaphone,
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  Save,
  Pencil,
  X,
  Cpu,
  Loader2,
  Youtube,
  Twitter,
  Linkedin,
  Eye,
  MoreVertical,
  CheckCircle2,
  Pause,
  Play
} from 'lucide-react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, ShieldAlert, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useMentorCampaigns } from '@/hooks/mentoring/use-mentor-campaigns';
import { deleteCampaign, patchCampaign } from '@/lib/api/mentoring-client';
import { campaignCurrentDay } from '@/domain/marketing';
import { Switch } from '@/components/ui/switch';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export interface CampaignCardModel {
  id: string;
  title: string;
  status: string;
  productionStatus: string;
  isActive: boolean;
  autoPilot: boolean;
  start: Date;
  timeline: any[];
  logic?: string;
  progress: { sealed: number; total: number };
  /** Documento original para los handlers legacy (editar/borrar/toggle: misma ruta de escritura). */
  source: any;
}

export default function CampaignsDashboardPage() {
  const { profile, user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [configModal, setConfigModal] = useState<{ open: boolean; campaign?: any; startDate?: string; saving?: boolean }>({ open: false });
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; campaign?: any }>({ open: false });

  // Nueva arquitectura (flag): lee/escribe vía /api/campaigns. Apagado = Firestore directo (sin cambios).
  const newApi = useMentorCampaigns(profile?.uid);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Sin sesión');
    return user.getIdToken();
  }, [user]);

  const campaigns: CampaignCardModel[] | null = useMemo(() => {
    if (!newApi.data) return null;
    return newApi.data.map((s) => {
      const c: any = s.campaign;
      return {
        id: c.id,
        title: c.title,
        status: c.status || c.campaignStatus || 'draft',
        productionStatus: c.productionStatus || 'producing',
        isActive: !!c.isActive,
        autoPilot: !!c.autoPilot,
        start: c.startDate ? new Date(c.startDate) : c.createdAt ? new Date(c.createdAt) : new Date(0),
        timeline: c.strategy?.timeline ?? [],
        logic: c.strategy?.logic,
        progress: c.progress || { sealed: 0, total: 0 },
        source: c,
      };
    });
  }, [newApi.data]);

  const listLoading = newApi.isLoading && !newApi.data;

  const ensureGoogleToken = async () => {
    const storedToken = localStorage.getItem('evo_google_token');
    const storedExpiry = localStorage.getItem('evo_google_token_expiry');
    const isValid = storedToken && storedToken !== 'null' && storedExpiry && Date.now() < Number(storedExpiry);
    if (isValid) return storedToken;

    const { initializeFirebase } = await import('@/firebase');
    const { auth } = initializeFirebase();
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');

    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    if (auth.currentUser?.email) {
      provider.setCustomParameters({ login_hint: auth.currentUser.email });
    }

    try {
      const authResult = await signInWithPopup(auth, provider);
      const accessToken = GoogleAuthProvider.credentialFromResult(authResult)?.accessToken || null;
      if (accessToken) {
        localStorage.setItem('evo_google_token', accessToken);
        localStorage.setItem('evo_google_token_expiry', String(Date.now() + 3300000));
      }
      return accessToken;
    } catch (error) {
      console.warn("No se pudo renovar token de Google Drive", error);
      return null;
    }
  };

  // Delete Campaign functionality disabled to protect campaign integrity

  const handleOpenConfig = (camp: any) => {
    setConfigModal({ 
      open: true, 
      campaign: camp, 
      startDate: camp.startDate ? new Date(camp.startDate).toISOString().split('T')[0] : new Date(camp.createdAt || Date.now()).toISOString().split('T')[0]
    });
  };

  const handleSaveConfig = async () => {
    if (!configModal.campaign || !configModal.startDate) return;
    setConfigModal(prev => ({ ...prev, saving: true }));
    try {
      const updates = { startDate: new Date(configModal.startDate + 'T00:00:00').toISOString() };
      await patchCampaign(configModal.campaign.id, await getToken(), updates);
      toast({ title: 'Configuración Actualizada', description: 'La fecha de la campaña ha sido modificada.' });
      await newApi.refetch();
      setConfigModal({ open: false });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al actualizar', description: e instanceof Error ? e.message : undefined });
      setConfigModal(prev => ({ ...prev, saving: false }));
    }
  };

  // AutoPilot has been deprecated; execution relies on manual triggers and ready status

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm("ATENCIÓN: Esto eliminará la campaña y en cascada TODOS sus archivos generados (imágenes, metadatos). ¿Estás completamente seguro?")) {
      return;
    }
    setDeletingId(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${await getToken()}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete campaign');
      }
      toast({ title: 'Campaña eliminada', description: 'La campaña y sus recursos han sido purgados exitosamente.' });
      await newApi.refetch();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al borrar', description: e instanceof Error ? e.message : 'Error interno' });
    } finally {
      setDeletingId(null);
    }
  };

  const [approvingCampaign, setApprovingCampaign] = useState<any | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Mapeo de channel a motorId en marketingCredentials
  const CHANNEL_MOTOR_MAP: Record<string, string[]> = {
    'instagram': ['meta_social'],
    'facebook': ['meta_social'],
    'linkedin': ['linkedin'],
    'twitter': ['twitter'],
    'tiktok': ['tiktok'],
    'youtube': ['youtube'],
    'email': ['sendgrid', 'mailchimp', 'brevo'], // Anyone is fine
    'ads': ['meta_ads', 'google_ads'] // Anyone is fine
  };

  const getValidationStatus = (channel: string) => {
    if (!channel) return { valid: true, status: 'connected' };
    const p = profile as any;
    const creds = p?.marketingCredentials || {};
    const motorIds = CHANNEL_MOTOR_MAP[channel.toLowerCase()];
    if (!motorIds) return { valid: true, status: 'connected' };
    
    for (const mId of motorIds) {
      const c = creds[mId];
      if (c && c.apiKey && c.apiKey.length > 5) {
        if (c.status === 'connected') return { valid: true, status: 'connected' };
        if (c.status === 'error') return { valid: false, status: 'error' };
        return { valid: true, status: 'pending' };
      }
    }
    return { valid: false, status: 'missing' };
  };

  const handleApproveClick = (camp: any) => {
    setApprovingCampaign(camp);
  };

  const confirmDeploy = async () => {
    if (!approvingCampaign) return;
    setIsApproving(true);
    try {
      await patchCampaign(approvingCampaign.id, await getToken(), { status: 'deploying', productionStatus: 'sealed' });
      toast({ title: 'Campaña Aprobada', description: 'La campaña está en cola en el Centro de Mando.' });
      await newApi.refetch();
      setApprovingCampaign(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al aprobar', description: e instanceof Error ? e.message : 'Error interno' });
    } finally {
      setIsApproving(false);
    }
  };

  const [togglingPauseId, setTogglingPauseId] = useState<string | null>(null);

  const handleTogglePause = async (campaignId: string, currentStatus: string) => {
    const isPaused = currentStatus === 'paused';
    const newStatus = isPaused ? 'deploying' : 'paused'; // or active? deploying is the standard state before completion
    const actionName = isPaused ? 'Reanudar' : 'Pausar';
    
    if (!window.confirm(`¿Seguro que deseas ${actionName.toLowerCase()} esta campaña?`)) {
      return;
    }
    setTogglingPauseId(campaignId);
    try {
      await patchCampaign(campaignId, await getToken(), { status: newStatus });
      toast({ title: `Campaña ${isPaused ? 'Reanudada' : 'Pausada'}`, description: `El Centro de Mando ha sido notificado.` });
      await newApi.refetch();
    } catch (e) {
      toast({ variant: 'destructive', title: `Error al ${actionName.toLowerCase()}`, description: e instanceof Error ? e.message : 'Error interno' });
    } finally {
      setTogglingPauseId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Orquestador de Campañas</h1>
            <p className="text-muted-foreground text-lg font-medium">Diseña el cronograma de emisión y coordina la distribución en tus canales.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => router.push('/marketing/build')} 
              className="h-14 px-8 rounded-2xl font-bold flex items-center gap-2 bg-accent hover:bg-accent/90 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5" /> Planificar Campaña
            </Button>
          </div>
        </header>

        <div className="grid gap-8">
          {listLoading ? (
            [1, 2].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)
          ) : newApi.error && !campaigns?.length ? (
            <div className="py-24 text-center bg-secondary/10 rounded-lg border-2 border-dashed">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-muted-foreground">Error al cargar campañas</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">{newApi.error}</p>
              </div>
              <Button onClick={() => newApi.refetch()} variant="link" className="font-bold text-accent mt-4">Reintentar</Button>
            </div>
          ) : campaigns?.length === 0 ? (
            <div className="py-24 text-center bg-secondary/10 rounded-lg border-2 border-dashed">
              <Activity className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-muted-foreground">No hay campañas coordinadas</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">Selecciona un pack multimedia y Gemini diseñará el cronograma de emisión ideal.</p>
              </div>
              <Button onClick={() => router.push('/marketing/build')} variant="link" className="font-bold text-accent mt-4">Comenzar orquestación</Button>
            </div>
          ) : (
            <Card className="rounded-3xl border-2 shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/10">
                  <TableRow>
                    <TableHead className="font-bold uppercase tracking-widest text-xs text-muted-foreground py-5 pl-6">Campaña / Misión</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-xs text-muted-foreground">Estado</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-xs text-muted-foreground">Inicio (Día 1)</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-xs text-muted-foreground">Canales</TableHead>
                    <TableHead className="text-right pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns?.map((camp) => {
                    const start = camp.start;
                    const currentDay = campaignCurrentDay(start);
                    
                    let estadoCfg = { label: 'Borrador', color: 'bg-muted-foreground' };
                    const map: any = {
                      'draft': { label: 'Borrador', color: 'bg-muted-foreground' },
                      'ready_for_distribution': { label: 'Aprobación Requerida', color: 'bg-indigo-500' },
                      'deploying': { label: 'Desplegando', color: 'bg-amber-500' },
                      'completed': { label: 'Completada', color: 'bg-success' },
                      // legacy fallbacks
                      'processing': { label: 'Procesando IA', color: 'bg-blue-500' },
                      'drafts_ready': { label: 'Revisión Pendiente', color: 'bg-amber-500' },
                      'ready_to_publish': { label: 'Lista p/ Despliegue', color: 'bg-indigo-500' },
                      'active': { label: 'En Emisión', color: 'bg-success' },
                      'paused': { label: 'Pausada', color: 'bg-danger' },
                      'finished': { label: 'Finalizada', color: 'bg-slate-700' }
                    };
                    estadoCfg = map[camp.status] || estadoCfg;

                    // Compute total channels
                    const channels = new Set<string>();
                    camp.timeline?.forEach(step => {
                      step.channels?.forEach((c: string) => channels.add(c));
                    });

                    return (
                      <TableRow key={camp.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="py-6 pl-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-lg text-primary">{camp.title}</span>
                            <span className="text-xs font-semibold text-muted-foreground mt-1 line-clamp-1 max-w-sm">{camp.logic}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 items-start">
                            <Badge className={cn("border-none text-[9px] font-black uppercase tracking-widest", estadoCfg.color)}>
                              {estadoCfg.label}
                            </Badge>
                            {camp.progress.total > 0 && (
                              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {camp.progress.sealed} / {camp.progress.total} Sellados
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{format(start, 'dd/MM/yyyy')}</span>
                            <span className="text-xs text-muted-foreground font-medium uppercase mt-1">Día actual: {currentDay}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 opacity-70">
                            {Array.from(channels).map(ch => (
                              <Badge key={ch} variant="outline" className="text-[9px] uppercase font-bold tracking-widest px-1.5 bg-white">
                                {ch}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            {camp.status === 'ready_for_distribution' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApproveClick(camp)}
                                className="h-9 w-9 rounded-xl text-success hover:text-success hover:bg-success/10"
                                title="Aprobar para Despliegue"
                              >
                                <CheckCircle2 className="h-5 w-5" />
                              </Button>
                            )}

                            {(camp.status === 'deploying' || camp.status === 'active' || camp.status === 'paused') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleTogglePause(camp.id, camp.status)}
                                disabled={togglingPauseId === camp.id}
                                className={cn(
                                  "h-9 w-9 rounded-xl", 
                                  camp.status === 'paused' 
                                    ? "text-success hover:text-success hover:bg-success/10" 
                                    : "text-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
                                )}
                                title={camp.status === 'paused' ? 'Reanudar Despliegue' : 'Pausar Despliegue'}
                              >
                                {togglingPauseId === camp.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : camp.status === 'paused' ? (
                                  <Play className="h-5 w-5" />
                                ) : (
                                  <Pause className="h-5 w-5" />
                                )}
                              </Button>
                            )}

                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setDetailsModal({ open: true, campaign: camp })}
                              className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
                              title="Ver Cronograma y Estrategia"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleOpenConfig(camp.source)}
                              className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
                              title="Configurar Fechas"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteCampaign(camp.id)}
                              disabled={deletingId === camp.id}
                              className="h-9 w-9 rounded-xl text-danger hover:text-danger hover:bg-danger/10"
                              title="Eliminar Campaña"
                            >
                              {deletingId === camp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>

        {/* Dialog: Configuración de Fechas */}
        <Dialog open={configModal.open} onOpenChange={(open) => !open && setConfigModal({ open: false })}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-headline font-bold text-2xl text-primary">Configuración de Campaña</DialogTitle>
              <DialogDescription>
                Modifica la fecha de inicio del cronograma de ejecución.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-muted-foreground">Fecha de Lanzamiento (Día 1)</Label>
                <Input
                  type="date"
                  value={configModal.startDate || ''}
                  onChange={e => setConfigModal(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-secondary/10 border-border/50 px-4 font-bold h-12"
                />
              </div>
            </div>
            <DialogFooter className="sm:justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfigModal({ open: false })} className="rounded-xl font-bold hover:bg-muted">
                Cancelar
              </Button>
              <Button onClick={handleSaveConfig} disabled={!configModal.startDate || configModal.saving} className="rounded-xl font-bold gap-2">
                {configModal.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Dialog: Detalles (Cronograma visual) */}
        <Dialog open={detailsModal.open} onOpenChange={(open) => !open && setDetailsModal({ open: false })}>
          <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden bg-muted/30">
            <div className="p-8 pb-4 shrink-0 bg-white border-b">
              <div className="flex items-center justify-between">
                <DialogHeader className="text-left space-y-1">
                  <DialogTitle className="text-3xl font-headline font-bold text-primary">
                    {detailsModal.campaign?.title}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground font-medium text-base">
                    {detailsModal.campaign?.logic}
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-8">
              <div className="flex flex-col gap-4 max-w-4xl mx-auto pb-8">
                {detailsModal.campaign?.timeline?.map((step: any, i: number) => {
                  const currentDay = campaignCurrentDay(detailsModal.campaign?.start);
                  const isPast = step.day < currentDay;
                  const isToday = step.day === currentDay;
                  
                  return (
                    <div key={i} className={cn(
                      "w-full p-5 rounded-2xl border-2 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all",
                      isToday ? "bg-success/10 border-success shadow-md" : 
                      isPast ? "bg-muted/40 border-border text-muted-foreground" : "bg-card border-border hover:border-primary/30 shadow-sm"
                    )}>
                      <div className="flex items-center gap-6 flex-1">
                        <div className="flex flex-col items-center justify-center shrink-0 w-20">
                          <Badge className={cn("px-3 py-1 text-[11px] font-black tracking-widest", isToday ? "bg-success text-white" : "bg-border text-muted-foreground")}>
                            DÍA {step.day}
                          </Badge>
                          <span className="text-[10px] font-black uppercase mt-2 opacity-70">VAR {step.variantIndex + 1}</span>
                          {isToday && <div className="mt-2 w-2 h-2 rounded-full bg-success animate-ping" />}
                        </div>
                        
                        <div className="flex-1 border-l pl-6 py-2 border-border/50">
                          <p className="font-bold text-lg leading-snug mb-3">{step.action}</p>
                          {step.socialSchedule && Object.keys(step.socialSchedule).length > 0 && (
                            <div className="flex flex-col gap-2 mt-2">
                              {Object.entries(step.socialSchedule).map(([plat, posts]: [string, any]) => {
                                const postArray = Array.isArray(posts) ? posts : [posts];
                                return postArray.map((p, idx) => (
                                  <div key={`${plat}-${idx}`} className="flex items-center gap-3 text-xs text-foreground bg-background shadow-sm w-fit px-3 py-1.5 rounded-lg border border-border/60">
                                    <span className="font-mono font-bold">{p.time}</span>
                                    <span className="capitalize font-bold text-primary">{plat}</span>
                                    <span className="capitalize text-muted-foreground font-medium">{p.format || 'Feed'}</span>
                                    <span className="font-medium bg-muted/50 px-2 py-0.5 rounded text-xs border border-border/30">{p.videoName || 'Video'}</span>
                                  </div>
                                ));
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 shrink-0 md:justify-end">
                        {step.channels?.map((ch: string) => {
                          if (ch === 'Social' && step.socialSchedule) {
                            return Object.keys(step.socialSchedule).map(plat => (
                              <div key={`${ch}-${plat}`} title={plat} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-muted-foreground border shadow-sm">
                                {plat === 'instagram' && <Instagram className="h-4 w-4" />}
                                {plat === 'tiktok' && <TikTokIcon className="h-4 w-4" />}
                                {plat === 'youtube' && <Youtube className="h-4 w-4" />}
                                {plat === 'linkedin' && <Linkedin className="h-4 w-4" />}
                                {(plat === 'twitter' || plat === 'x') && <Twitter className="h-4 w-4" />}
                              </div>
                            ));
                          }
                          return (
                            <div key={ch} title={ch} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-muted-foreground border shadow-sm">
                              {ch === 'Email' ? <Mail className="h-4 w-4" /> : ch === 'Social' ? <Instagram className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
        {/* Modal de Validación de APIs (Aprobación) */}
        {approvingCampaign && (
          <Dialog open={!!approvingCampaign} onOpenChange={(open) => !open && setApprovingCampaign(null)}>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-headline font-bold text-2xl text-primary flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-success" />
                  Validación de Despliegue
                </DialogTitle>
                <DialogDescription>
                  El Centro de Mando requiere permisos válidos para emitir contenido en las redes planificadas.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                {(() => {
                  const channelsRequired = Array.from(new Set(
                    approvingCampaign.timeline.flatMap((t: any) => {
                      const chs = t.channels || [];
                      return chs.flatMap((c: string) => {
                        if (c === 'Social' && t.socialSchedule) {
                          return Object.keys(t.socialSchedule);
                        }
                        return c;
                      });
                    })
                  ));
                  const validations = channelsRequired.map(ch => ({
                    channel: ch as string,
                    state: getValidationStatus(ch as string)
                  }));
                  const allValid = validations.every(v => v.state.valid);

                  return (
                    <>
                      <div className="bg-muted p-4 rounded-xl space-y-3">
                        <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">Canales a verificar:</p>
                        {validations.map((v, i) => (
                          <div key={i} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                            <span className="text-sm font-bold capitalize">{v.channel}</span>
                            {v.state.status === 'connected' && (
                              <Badge className="bg-success/15 text-success hover:bg-success/20 border-none font-bold">Usuario Registrado</Badge>
                            )}
                            {v.state.status === 'pending' && (
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold">Clave Registrada</Badge>
                            )}
                            {v.state.status === 'error' && (
                              <Badge variant="destructive" className="font-bold flex items-center gap-1">
                                <ShieldAlert className="h-3 w-3" /> Conexión Rechazada
                              </Badge>
                            )}
                            {v.state.status === 'missing' && (
                              <Badge variant="destructive" className="font-bold flex items-center gap-1">
                                <ShieldAlert className="h-3 w-3" /> Requiere API Key
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>

                      {!allValid && (
                        <div className="bg-warn/15 border border-warn/30 text-warn-foreground p-4 rounded-xl flex gap-3 text-sm">
                          <AlertCircle className="h-5 w-5 shrink-0 text-warn" />
                          <div>
                            <p className="font-bold text-warn mb-1">Conexión Incompleta</p>
                            <p className="text-warn/80 text-xs">Debes vincular las credenciales de los canales faltantes para poder autorizar el despliegue automático.</p>
                            <Link href="/dashboard/publishing-engines" target="_blank" className="text-warn font-bold underline text-xs mt-2 inline-block">
                              Ir a Motores de Publicación
                            </Link>
                          </div>
                        </div>
                      )}

                      <DialogFooter className="mt-6 gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setApprovingCampaign(null)} className="rounded-xl">Cancelar</Button>
                        <Button 
                          onClick={confirmDeploy} 
                          disabled={!allValid || isApproving}
                          className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {isApproving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Confirmar y Desplegar
                        </Button>
                      </DialogFooter>
                    </>
                  );
                })()}
              </div>
            </DialogContent>
          </Dialog>
        )}

      </div>
    </DashboardLayout>
  );
}
