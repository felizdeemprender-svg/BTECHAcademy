'use client';

import { useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Rocket,
  Zap,
  Loader2,
  CheckCircle2,
  Mail,
  Instagram,
  Megaphone,
  Clock,
  Play,
  Settings2,
  AlertCircle,
  TrendingUp,
  BrainCircuit,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Info,
  X,
  KeyRound,
  Globe,
  Database,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  BookOpen,
  Sparkles,
  Search,
  Layout,
  LayoutTemplate,
  Cpu,
  Linkedin,
  Twitter,
  MonitorPlay,
  ShieldAlert,
  Server
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useMentorCampaigns } from '@/hooks/mentoring/use-mentor-campaigns';
import { executeCampaign } from '@/lib/api/mentoring-client';
import { pastActions } from '@/domain/marketing';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);



export default function MarketingAutomationEnginePage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [executing, setExecuting] = useState<string | null>(null);

  // Nueva arquitectura (flag): lee vía /api/campaigns. Apagado = query directa (sin cambios).
  const newApi = useMentorCampaigns(profile?.uid);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Sin sesión');
    return user.getIdToken();
  }, [user]);


  interface ActiveCampaignModel {
    id: string;
    title: string;
    currentDay: number;
    todayActions: any[];
    pastCount: number;
    totalActions: number;
    progress: number;
    executionLogs: any[];
  }

  const activeCampaigns: ActiveCampaignModel[] = useMemo(() => {
    if (!newApi.data) return [];
    return newApi.data
      .filter(s => s.executable)
      .map(s => {
        const c: any = s.campaign;
        const timeline: any[] = c.strategy?.timeline ?? [];
        const past = pastActions(timeline, s.currentDay);
        return {
          id: c.id,
          title: c.title,
          currentDay: s.currentDay,
          todayActions: s.today,
          pastCount: past.length,
          totalActions: timeline.length || 1,
          progress: s.progressPercent,
          executionLogs: c.executionLogs ?? [],
        };
      });
  }, [newApi.data]);

  const pageLoading = newApi.isLoading && !newApi.data;

  const handleManualDispatch = async (camp: any) => {
    setExecuting(camp.id);
    try {
      const result = await executeCampaign(camp.id, await getToken());
      toast({
        title: 'Despliegue Exitoso',
        description: `Se registraron ${result.logsAppended} emisiones para el Día ${result.currentDay}.`
      });
      await newApi.refetch();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fallo de Protocolo', description: e instanceof Error ? e.message : undefined });
    } finally {
      setExecuting(null);
    }
  };




  return (

    <DashboardLayout>
      <div className="space-y-10 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-8">
          <div>
            <div className="flex items-center gap-2 text-accent mb-2">
              <Zap className="h-5 w-5 fill-accent" />
              <span className="text-xs font-bold uppercase tracking-[0.3em]">Evo Automation Engine</span>
            </div>
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Centro de Mando</h1>
            <p className="text-muted-foreground text-lg font-medium">Control de motores para emisión multicanal automática.</p>
          </div>
          <div className="bg-foreground px-6 py-4 rounded-[1.5rem] border border-white/10 flex items-center gap-6">
            <div className="text-center">
              <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">En Emisión</p>
              <p className="text-2xl font-black text-white">{activeCampaigns.length}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-ping" />
              <span className="text-[10px] font-black uppercase text-success tracking-tighter">Sistemas OK</span>
            </div>
          </div>
        </header>

        {pageLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary opacity-20" /></div>
        ) : newApi.error ? (
          <div className="py-24 text-center bg-secondary/10 rounded-lg border-2 border-dashed">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-muted-foreground">Error al cargar el centro de mando</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">{newApi.error}</p>
            </div>
            <Button onClick={() => newApi.refetch()} variant="link" className="font-bold text-accent mt-4">Reintentar</Button>
          </div>
        ) : activeCampaigns.length > 0 && (
          <div className="grid gap-8">
            {activeCampaigns.map((camp) => (
              <Card key={camp.id} className="rounded-lg bg-white overflow-hidden group">
                <div className="flex flex-col lg:flex-row">
                  <div className="lg:w-80 bg-foreground p-10 text-white shrink-0 flex flex-col justify-between relative overflow-hidden">
                    <BrainCircuit className="absolute -right-10 -top-10 h-48 w-48 opacity-10 pointer-events-none" />
                    <div className="relative z-10">
                      <Badge className="bg-accent text-white border-none h-5 px-2 text-[8px] font-black uppercase tracking-widest mb-4">Auto-Pilot Active</Badge>
                      <h3 className="text-2xl font-bold leading-tight">{camp.title}</h3>
                      <p className="text-muted-foreground text-xs mt-2 uppercase font-bold tracking-tighter">Ciclo: Día {camp.currentDay}</p>
                    </div>
                    <div className="pt-10 relative z-10">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground mb-2">
                        <span>Progreso Plan</span>
                        <span>{camp.progress}%</span>
                      </div>
                      <Progress value={camp.progress} className="h-1.5 bg-white/10" />
                    </div>
                  </div>

                  <div className="flex-1 p-10 space-y-10">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2">
                        <Activity className="h-4 w-4 text-success" /> Despliegues para hoy
                      </h4>
                    </div>

                    <div className="grid gap-4">
                      {camp.todayActions.length === 0 ? (
                        <div className="p-10 bg-muted rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center gap-3">
                          <Clock className="h-8 w-8 text-border" />
                          <p className="font-bold text-muted-foreground">Sin lanzamientos previstos para hoy</p>
                        </div>
                      ) : camp.todayActions.map((action: any, i: number) => (
                        <div key={i} className="bg-success/10/50 border-2 border-success/15 p-6 rounded-lg flex flex-col md:flex-row justify-between items-center gap-6 group/item hover:bg-success/10 transition-all">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-success text-white flex items-center justify-center shadow-lg">
                              <Zap className="h-7 w-7" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-success text-white border-none text-[8px] font-black uppercase h-5">{action.phase}</Badge>
                                <span className="text-xs font-black text-success">Variante {action.variantIndex + 1}</span>
                              </div>
                              <p className="font-bold text-lg text-foreground leading-tight">{action.action}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 bg-white/60 p-2 rounded-2xl border border-success/20">
                            {action.channels.map((ch: string) => (
                              <div key={ch} title={ch} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-success border border-success/15">
                                {ch === 'Email' ? <Mail className="h-5 w-5" /> : ch === 'Social' ? <Instagram className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Execution Logs / Provider Feedback History */}
                    {camp.executionLogs && camp.executionLogs.length > 0 && (
                      <div className="pt-8 border-t border-muted space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.25em] flex items-center gap-2">
                          <Database className="h-3.5 w-3.5 text-muted-foreground" /> Historial de Emisiones y Feedback
                        </h5>
                        <div className="max-h-[280px] overflow-y-auto pr-2 space-y-3 scrollbar-thin">
                          {[...camp.executionLogs].reverse().map((log: any, logIdx: number) => {
                            const isSuccess = log.status === 'success';
                            const isSandbox = log.mode === 'sandbox';
                            const date = log.timestamp ? new Date(log.timestamp) : null;
                            const formattedTime = date && !isNaN(date.getTime())
                              ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                              : '';

                            return (
                              <div key={logIdx} className={cn(
                                "p-4 rounded-2xl border text-xs transition-all relative overflow-hidden",
                                isSuccess ? "bg-muted/50 border-muted" : "bg-danger/10/30 border-danger/15"
                              )}>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge className={cn("text-[7px] font-black uppercase tracking-wider h-4 border-none",
                                      isSuccess ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                                    )}>
                                      {isSuccess ? 'Éxito' : 'Error'}
                                    </Badge>
                                    <Badge className="text-[7px] font-black uppercase bg-muted text-muted-foreground border-none h-4">
                                      Día {log.day}
                                    </Badge>
                                    {log.platform && (
                                      <Badge className="text-[7px] font-black uppercase bg-blue-50 text-blue-700 border-none h-4">
                                        {log.platform}
                                      </Badge>
                                    )}
                                    <Badge className={cn("text-[7px] font-black uppercase border-none h-4",
                                      isSandbox ? "bg-warn/10 text-warn" : "bg-success/10 text-success"
                                    )}>
                                      {isSandbox ? 'Sandbox' : 'Real'}
                                    </Badge>
                                  </div>
                                  {formattedTime && (
                                    <span className="text-[9px] font-black text-muted-foreground">{formattedTime} hs</span>
                                  )}
                                </div>
                                <p className="font-bold text-foreground leading-snug">{log.action}</p>
                                <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed font-medium bg-white p-2.5 rounded-lg border border-muted/50">
                                  {log.feedback}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {camp.todayActions.length > 0 && (
                      <div className="pt-6 border-t flex justify-end">
                        <Button
                          onClick={() => handleManualDispatch(camp)}
                          disabled={executing === camp.id}
                          className="h-14 px-10 rounded-2xl font-bold text-lg bg-foreground gap-3"
                        >
                          {executing === camp.id ? <Loader2 className="animate-spin h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                          Disparar Automatización
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

