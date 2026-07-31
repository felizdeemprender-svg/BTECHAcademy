
'use client';

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Rocket, 
  Plus, 
  Trash2, 
  Mail,
  Instagram,
  Megaphone,
  Calendar,
  ChevronRight,
  Clock,
  TrendingUp,
  Activity,
  Save,
  Pencil,
  X,
  Zap,
  PlayCircle,
  Settings2,
  Cpu,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format, differenceInDays } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function CampaignsDashboardPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<any>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Campaigns Query
  const campaignsQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(collection(db, 'campaigns'), where('mentorId', '==', profile.uid));
  }, [db, profile?.uid]);
  const { data: rawCampaigns, isLoading: campaignsLoading } = useCollection(campaignsQuery);

  const campaigns = useMemo(() => {
    if (!rawCampaigns) return null;
    return [...rawCampaigns].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [rawCampaigns]);

  const handleDeleteCampaign = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'campaigns', id));
      toast({ title: 'Campaña eliminada' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al borrar' });
    }
  };

  const handleOpenSchedule = (camp: any) => {
    setSelectedCampaign(camp);
    setEditingStrategy(JSON.parse(JSON.stringify(camp.strategy))); // Deep copy
    setIsEditing(false);
  };

  const handleUpdateEvent = (idx: number, field: string, value: any) => {
    const newTimeline = [...editingStrategy.timeline];
    newTimeline[idx] = { ...newTimeline[idx], [field]: value };
    setEditingStrategy({ ...editingStrategy, timeline: newTimeline });
  };

  const handleSavePlanChanges = async () => {
    if (!selectedCampaign || !editingStrategy) return;
    setSavingPlan(true);
    try {
      await updateDoc(doc(db, 'campaigns', selectedCampaign.id), {
        strategy: editingStrategy,
        updatedAt: serverTimestamp()
      });
      toast({ title: 'Cronograma Actualizado', description: 'Los cambios se han guardado en el plan activo.' });
      setIsEditing(false);
      setSelectedCampaign({ ...selectedCampaign, strategy: editingStrategy });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al guardar cambios' });
    } finally {
      setSavingPlan(false);
    }
  };

  const handleAddEvent = () => {
    const lastDay = editingStrategy.timeline.length > 0 
      ? Math.max(...editingStrategy.timeline.map((e: any) => e.day)) 
      : 0;
    
    const newEvent = {
      day: lastDay + 1,
      phase: 'Ajuste',
      variantIndex: 0,
      action: 'Nueva acción coordinada',
      channels: ['Social']
    };
    
    setEditingStrategy({
      ...editingStrategy,
      timeline: [...editingStrategy.timeline, newEvent].sort((a: any, b: any) => a.day - b.day)
    });
  };

  const handleDeleteEvent = (idx: number) => {
    const newTimeline = editingStrategy.timeline.filter((_: any, i: number) => i !== idx);
    setEditingStrategy({ ...editingStrategy, timeline: newTimeline });
  };

  const toggleAutoPilot = async (camp: any) => {
    const newVal = !camp.autoPilot;
    try {
      await updateDoc(doc(db, 'campaigns', camp.id), {
        autoPilot: newVal,
        updatedAt: serverTimestamp()
      });
      toast({ 
        title: newVal ? 'Piloto Automático Activado' : 'Control Manual Activado',
        description: newVal ? 'Evo Engine gestionará tu cronograma.' : 'La ejecución ahora depende de tus disparos manuales.'
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al cambiar modo' });
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
              onClick={() => router.push('/mentoria/marketing/execution')} 
              className="h-14 px-8 rounded-2xl font-bold border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 gap-2 shadow-sm relative group"
            >
              <Cpu className="h-5 w-5 fill-emerald-500 group-hover:scale-110 transition-transform" /> 
              Centro de Mando
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
            </Button>
            <Button 
              onClick={() => router.push('/mentoria/marketing/build')} 
              className="h-14 px-8 rounded-2xl font-bold flex items-center gap-2 bg-accent hover:bg-accent/90 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5" /> Nueva Coordinación
            </Button>
          </div>
        </header>

        <div className="grid gap-8">
          {campaignsLoading ? (
            [1, 2].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)
          ) : campaigns?.length === 0 ? (
            <div className="py-24 text-center bg-secondary/10 rounded-lg border-2 border-dashed">
              <Activity className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-600">No hay campañas coordinadas</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">Selecciona un pack multimedia y Gemini diseñará el cronograma de emisión ideal.</p>
              </div>
              <Button onClick={() => router.push('/mentoria/marketing/build')} variant="link" className="font-bold text-accent mt-4">Comenzar orquestación</Button>
            </div>
          ) : (
            <div className="grid gap-8">
              {campaigns?.map((camp) => {
                const start = camp.startDate ? new Date(camp.startDate) : new Date(camp.createdAt.seconds * 1000);
                const currentDay = differenceInDays(new Date(), start) + 1;
                
                return (
                  <Card key={camp.id} className="group transition-all duration-500">
                    <div className="flex flex-col lg:flex-row items-stretch">
                      <div className="bg-slate-900 p-8 lg:w-80 flex flex-col justify-between text-white shrink-0">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <Badge className={cn("border-none text-[8px] font-black uppercase tracking-widest", camp.isActive ? "bg-emerald-500" : "bg-slate-500")}>
                              {camp.isActive ? 'Activa' : 'Pausada'}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black uppercase text-white/40">Auto-Pilot</span>
                              <Switch 
                                checked={camp.autoPilot} 
                                onCheckedChange={() => toggleAutoPilot(camp)} 
                                className="scale-75"
                              />
                            </div>
                          </div>
                          <h3 className="text-2xl font-bold leading-tight">{camp.title}</h3>
                          <p className="text-slate-400 text-xs mt-2 uppercase font-bold tracking-tighter">Iniciado: {format(start, 'dd/MM/yyyy')}</p>
                        </div>
                        <div className="pt-8 space-y-3">
                          <Button onClick={() => handleOpenSchedule(camp)} variant="secondary" className="w-full rounded-xl font-bold gap-2">
                            <Calendar className="h-4 w-4" /> Gestionar Plan
                          </Button>
                          <Button onClick={() => handleDeleteCampaign(camp.id)} variant="ghost" className="w-full text-rose-400 hover:text-rose-300 hover:bg-white/5 rounded-xl font-bold gap-2">
                            <Trash2 className="h-4 w-4" /> Borrar Campaña
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex-1 p-8 overflow-x-auto">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                            <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">Ejecución de Variante Actual</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-300" />
                            <span className="text-xs font-black text-slate-400 uppercase">Día Actual: {currentDay}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-6 min-w-max pb-4">
                          {camp.strategy?.timeline?.map((step: any, i: number) => {
                            const isPast = step.day < currentDay;
                            const isToday = step.day === currentDay;
                            
                            return (
                              <div key={i} className={cn(
                                "w-64 p-6 rounded-3xl border-2 flex flex-col justify-between transition-all",
                                isToday ? "bg-emerald-50 border-emerald-500 shadow-lg scale-105" : 
                                isPast ? "bg-slate-50 border-slate-200 opacity-40" : "bg-white border-slate-100"
                              )}>
                                <div>
                                  <div className="flex justify-between items-center mb-3">
                                    <Badge className={cn("h-5 px-2 text-[8px] font-black", isToday ? "bg-emerald-500" : "bg-slate-200")}>DÍA {step.day}</Badge>
                                    {isToday && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
                                    <span className="text-[10px] font-bold text-slate-400">VAR {step.variantIndex + 1}</span>
                                  </div>
                                  <p className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">{step.action}</p>
                                </div>
                                <div className="flex gap-1 mt-4">
                                  {step.channels.map((ch: string) => (
                                    <div key={ch} title={ch} className="w-6 h-6 rounded bg-white flex items-center justify-center text-slate-400 border shadow-sm">
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
            
            <ScrollArea className="flex-1 p-8 bg-slate-50">
              <div className="space-y-8">
                {!isEditing ? (
                  <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Fundamento Estratégico</h4>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium italic">"{selectedCampaign?.strategy?.logic}"</p>
                  </div>
                ) : (
                  <div className="flex justify-between items-center px-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary">Ajustes en la Línea de Tiempo</h4>
                    <Button size="sm" onClick={handleAddEvent} className="rounded-xl font-bold gap-2">
                      <Plus className="h-3.5 w-3.5" /> Añadir Hito
                    </Button>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-1/2 before:bg-slate-200">
                    {(isEditing ? editingStrategy?.timeline : selectedCampaign?.strategy?.timeline)?.map((step: any, i: number) => (
                      <div key={i} className="relative flex gap-4 items-stretch group">
                        <div className="w-12 flex flex-col items-center">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg z-10",
                            isEditing ? "bg-accent text-white" : "bg-primary text-white"
                          )}>
                            {isEditing ? (
                              <input 
                                type="number" 
                                value={step.day} 
                                onChange={e => handleUpdateEvent(i, 'day', parseInt(e.target.value) || 0)}
                                className="w-full text-center bg-transparent border-none outline-none text-white"
                              />
                            ) : step.day}
                          </div>
                          <div className="flex-1 w-0.5 bg-slate-200 group-last:bg-transparent" />
                        </div>
                        <Card className="flex-1 p-6 rounded-lg border-2 border-slate-100 shadow-sm bg-white hover:shadow-md transition-all mb-4 relative overflow-hidden">
                          {isEditing && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteEvent(i)}
                              className="absolute top-4 right-4 h-8 w-8 text-rose-400 hover:bg-rose-50 rounded-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[8px] font-black uppercase">{isEditing ? 'FASE' : step.phase}</Badge>
                                {isEditing && (
                                  <input 
                                    value={step.phase} 
                                    onChange={e => handleUpdateEvent(i, 'phase', e.target.value)}
                                    className="text-[10px] font-bold text-slate-400 border-none bg-transparent outline-none w-full"
                                  />
                                )}
                              </div>
                              {isEditing ? (
                                <Textarea 
                                  value={step.action} 
                                  onChange={e => handleUpdateEvent(i, 'action', e.target.value)}
                                  className="font-bold text-slate-800 border-none bg-slate-50 rounded-xl p-3 min-h-[60px]"
                                />
                              ) : (
                                <p className="font-bold text-slate-800">{step.action}</p>
                              )}
                            </div>
                            
                            <div className="space-y-4 flex flex-col justify-end">
                              <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase text-slate-400 ml-1">Variante</p>
                                {isEditing ? (
                                  <Select 
                                    value={step.variantIndex.toString()} 
                                    onValueChange={v => handleUpdateEvent(i, 'variantIndex', parseInt(v))}
                                  >
                                    <SelectTrigger className="h-8 rounded-lg bg-emerald-50 border-none font-bold text-[10px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">Var 1 (Mínima)</SelectItem>
                                      <SelectItem value="1">Var 2 (Equilibrada)</SelectItem>
                                      <SelectItem value="2">Var 3 (Detallada)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge className="bg-slate-900 text-white border-none h-5 px-2 text-[8px] font-bold">Variante {step.variantIndex + 1}</Badge>
                                )}
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {isEditing ? (
                                  ['Email', 'Social', 'Ads'].map(ch => (
                                    <Badge 
                                      key={ch} 
                                      variant={step.channels.includes(ch) ? 'default' : 'outline'}
                                      className="cursor-pointer text-[7px] font-black uppercase px-1.5 h-4"
                                      onClick={() => {
                                        const newChans = step.channels.includes(ch) 
                                          ? step.channels.filter((c: string) => c !== ch) 
                                          : [...step.channels, ch];
                                        handleUpdateEvent(i, 'channels', newChans);
                                      }}
                                    >
                                      {ch}
                                    </Badge>
                                  ))
                                ) : (
                                  step.channels.map((ch: string) => (
                                    <div key={ch} className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                                      {ch === 'Email' ? <Mail className="h-3 w-3" /> : ch === 'Social' ? <Instagram className="h-3 w-3" /> : <Megaphone className="h-3 w-3" />}
                                      {ch}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
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
