
'use client';

import { useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useMentorCampaigns } from '@/hooks/mentoring/use-mentor-campaigns';
import { deleteCampaign, patchCampaign } from '@/lib/api/mentoring-client';
import { TimelineEditor } from '@/presentation/campaigns';
import { campaignCurrentDay } from '@/domain/marketing';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

export default function CampaignsDashboardPage() {
  const { profile, user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<any>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Nueva arquitectura (flag): lee/escribe vía /api/campaigns. Apagado = Firestore directo (sin cambios).
  const newApi = useMentorCampaigns(profile?.uid);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Sin sesión');
    return user.getIdToken();
  }, [user]);

  interface CampaignCardModel {
    id: string;
    title: string;
    isActive: boolean;
    autoPilot: boolean;
    start: Date;
    timeline: any[];
    logic?: string;
    /** Documento original para los handlers legacy (editar/borrar/toggle: misma ruta de escritura). */
    source: any;
  }

  const campaigns: CampaignCardModel[] | null = useMemo(() => {
    if (!newApi.data) return null;
    return newApi.data.map((s) => {
      const c: any = s.campaign;
      return {
        id: c.id,
        title: c.title,
        isActive: !!c.isActive,
        autoPilot: !!c.autoPilot,
        start: c.startDate ? new Date(c.startDate) : c.createdAt ? new Date(c.createdAt) : new Date(0),
        timeline: c.strategy?.timeline ?? [],
        logic: c.strategy?.logic,
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

  const handleDeleteCampaign = async (id: string) => {
    try {
      const { getDoc } = await import('firebase/firestore');
      const campRef = doc(db, 'campaigns', id);
      const campSnap = await getDoc(campRef);
      
      if (campSnap.exists()) {
        const campData = campSnap.data();
        const assets = campData.generatedAssets || {};
        const driveIds: string[] = [];

        if (assets.socials) {
          assets.socials.forEach((s: any) => {
             const driveId = s.production_notes?.video_drive_id;
             if (driveId) {
               const ids = driveId.split(',').map((i: string) => i.trim()).filter(Boolean);
               driveIds.push(...ids);
             }
          });
        }
        
        if (assets.ads) {
          assets.ads.forEach((s: any) => {
             const driveId = s.production_notes?.video_drive_id;
             if (driveId) {
               const ids = driveId.split(',').map((i: string) => i.trim()).filter(Boolean);
               driveIds.push(...ids);
             }
          });
        }

        if (driveIds.length > 0) {
           toast({ title: 'Limpiando Drive...', description: `Eliminando ${driveIds.length} videos asociados.` });
           const token = await ensureGoogleToken();
           if (token) {
              for (const driveId of driveIds) {
                 try {
                   await fetch(`https://www.googleapis.com/drive/v3/files/${driveId}`, {
                     method: 'DELETE',
                     headers: { 'Authorization': `Bearer ${token}` }
                   });
                 } catch (err) {
                   console.error(`Error borrando ${driveId}`, err);
                 }
              }
           } else {
             toast({ variant: 'destructive', title: 'Videos no borrados', description: 'No se autorizó Google Drive.' });
           }
        }
      }

      await deleteCampaign(campRef.id, await getToken());
      await newApi.refetch();
      toast({ title: 'Campaña eliminada exitosamente' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al borrar', description: e instanceof Error ? e.message : undefined });
    }
  };

  const handleOpenSchedule = (camp: any) => {
    setSelectedCampaign(camp);
    setEditingStrategy(JSON.parse(JSON.stringify(camp.strategy))); // Deep copy
    setIsEditing(false);
  };

  const handleSavePlanChanges = async () => {
    if (!selectedCampaign || !editingStrategy) return;
    setSavingPlan(true);
    try {
      await patchCampaign(selectedCampaign.id, await getToken(), { strategy: editingStrategy });
      toast({ title: 'Cronograma Actualizado', description: 'Los cambios se han guardado en el plan activo.' });
      setIsEditing(false);
      setSelectedCampaign({ ...selectedCampaign, strategy: editingStrategy });
      await newApi.refetch();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al guardar cambios', description: e instanceof Error ? e.message : undefined });
    } finally {
      setSavingPlan(false);
    }
  };

  const toggleAutoPilot = async (camp: any) => {
    const newVal = !camp.autoPilot;
    try {
      await patchCampaign(camp.id, await getToken(), { autoPilot: newVal });
      toast({
        title: newVal ? 'Piloto Automático Activado' : 'Control Manual Activado',
        description: newVal ? 'Evo Engine gestionará tu cronograma.' : 'La ejecución ahora depende de tus disparos manuales.'
      });
      await newApi.refetch();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al cambiar modo', description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Coordinación de Campañas</h1>
            <p className="text-muted-foreground text-lg font-medium">Orquestación multicanal de lanzamientos activos.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => router.push('/marketing/execution')} 
              className="h-14 px-8 rounded-2xl font-bold border-2 border-success text-success hover:bg-success/10 gap-2 shadow-sm relative group"
            >
              <Cpu className="h-5 w-5 fill-success group-hover:scale-110 transition-transform" /> 
              Centro de Mando
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-ping" />
            </Button>
            <Button 
              onClick={() => router.push('/marketing/build')} 
              className="h-14 px-8 rounded-2xl font-bold flex items-center gap-2 bg-accent hover:bg-accent/90 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5" /> Nueva Coordinación
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
            <div className="grid gap-8">
              {campaigns?.map((camp) => {
                const start = camp.start;
                const currentDay = campaignCurrentDay(start);

                return (
                  <Card key={camp.id} className="group transition-all duration-500">
                    <div className="flex flex-col lg:flex-row items-stretch">
                      <div className="bg-foreground p-8 lg:w-80 flex flex-col justify-between text-white shrink-0">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <Badge className={cn("border-none text-[8px] font-black uppercase tracking-widest", camp.isActive ? "bg-success" : "bg-muted-foreground")}>
                              {camp.isActive ? 'Activa' : 'Pausada'}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black uppercase text-white/40">Auto-Pilot</span>
                              <Switch
                                checked={camp.autoPilot}
                                onCheckedChange={() => toggleAutoPilot(camp.source)}
                                className="scale-75"
                              />
                            </div>
                          </div>
                          <h3 className="text-2xl font-bold leading-tight">{camp.title}</h3>
                          <p className="text-muted-foreground text-xs mt-2 uppercase font-bold tracking-tighter">Iniciado: {format(start, 'dd/MM/yyyy')}</p>
                        </div>
                        <div className="pt-8 space-y-3">
                          <Button onClick={() => handleOpenSchedule(camp.source)} variant="secondary" className="w-full rounded-xl font-bold gap-2">
                            <Calendar className="h-4 w-4" /> Gestionar Plan
                          </Button>
                          <Button onClick={() => handleDeleteCampaign(camp.id)} variant="ghost" className="w-full text-danger hover:text-danger/30 hover:bg-white/5 rounded-xl font-bold gap-2">
                            <Trash2 className="h-4 w-4" /> Borrar Campaña
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex-1 p-8 overflow-x-auto">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <TrendingUp className="h-5 w-5 text-success" />
                            <h4 className="text-sm font-black uppercase text-muted-foreground tracking-widest">Ejecución de Variante Actual</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-border" />
                            <span className="text-xs font-black text-muted-foreground uppercase">Día Actual: {currentDay}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-6 min-w-max pb-4">
                          {camp.timeline?.map((step: any, i: number) => {
                            const isPast = step.day < currentDay;
                            const isToday = step.day === currentDay;
                            
                            return (
                              <div key={i} className={cn(
                                "w-64 p-6 rounded-3xl border-2 flex flex-col justify-between transition-all",
                                isToday ? "bg-success/10 border-success shadow-lg scale-105" : 
                                isPast ? "bg-muted border-border opacity-40" : "bg-white border-muted"
                              )}>
                                <div>
                                  <div className="flex justify-between items-center mb-3">
                                    <Badge className={cn("h-5 px-2 text-[8px] font-black", isToday ? "bg-success" : "bg-border")}>DÍA {step.day}</Badge>
                                    {isToday && <div className="w-2 h-2 rounded-full bg-success animate-ping" />}
                                    <span className="text-[10px] font-bold text-muted-foreground">VAR {step.variantIndex + 1}</span>
                                  </div>
                                  <p className="font-bold text-sm text-foreground line-clamp-2 leading-snug">{step.action}</p>
                                </div>
                                <div className="flex gap-1 mt-4">
                                  {step.channels.map((ch: string) => (
                                    <div key={ch} title={ch} className="w-6 h-6 rounded bg-white flex items-center justify-center text-muted-foreground border shadow-sm">
                                      {ch === 'Email' ? <Mail className="h-3 w-3" /> : ch === 'Social' ? <Instagram className="h-3 w-3" /> : <Megaphone className="h-3 w-3" />}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Dialog: Campaign Schedule Detail & Editor */}
        <Dialog open={!!selectedCampaign} onOpenChange={open => !open && setSelectedCampaign(null)}>
          <DialogContent className="mw-4xl h-[85vh] flex flex-col">
            <div className="shrink-0 relative px-8 pt-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <DialogTitle className="text-2xl font-bold">{selectedCampaign?.title}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {isEditing ? 'Modificando Estrategia de Emisión' : 'Plan de Lanzamiento Activo'}
                  </DialogDescription>
                </div>
                <div className="flex gap-2">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} className="rounded-xl font-bold bg-primary/10 hover:bg-primary/20 border border-primary/20 gap-2">
                      <Pencil className="h-4 w-4" /> Editar Plan
                    </Button>
                  ) : (
                    <Button onClick={() => setIsEditing(false)} variant="ghost" className="text-muted-foreground hover:bg-muted rounded-xl">
                      <X className="h-4 w-4 mr-2" /> Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-8 bg-muted">
              <div className="space-y-8">
                {!isEditing && (
                  <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Fundamento Estratégico</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium italic">"{selectedCampaign?.strategy?.logic}"</p>
                  </div>
                )}

                <TimelineEditor
                  events={editingStrategy?.timeline ?? []}
                  onChange={(timeline) => setEditingStrategy({ ...editingStrategy, timeline })}
                  readOnly={!isEditing}
                  allowAdd={isEditing}
                />
              </div>
            </ScrollArea>
            
            <DialogFooter className="p-6 bg-white border-t shrink-0">
              {isEditing ? (
                <Button onClick={handleSavePlanChanges} disabled={savingPlan} className="w-full h-14 rounded-2xl font-bold text-lg bg-primary gap-2">
                  {savingPlan ? <Loader2 className="animate-spin" /> : <Save className="h-5 w-5" />} Actualizar Plan Maestro
                </Button>
              ) : (
                <Button onClick={() => setSelectedCampaign(null)} variant="outline" className="w-full h-12 rounded-xl font-bold border-2">
                  Cerrar Vista
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
