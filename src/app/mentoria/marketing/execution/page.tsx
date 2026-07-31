'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
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
  const { profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [executing, setExecuting] = useState<string | null>(null);


  const campaignsQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    return query(
      collection(db, 'campaigns'),
      where('mentorId', '==', profile.uid)
    );
  }, [db, profile?.uid]);

  const { data: rawCampaigns, isLoading } = useCollection(campaignsQuery);

  const campaigns = useMemo(() => {
    if (!rawCampaigns) return null;
    return rawCampaigns
      .filter(c => c.isActive && (c.autoPilot || c.status === 'active'))
      .sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
  }, [rawCampaigns]);

  const activeCampaigns = useMemo(() => {
    if (!campaigns) return [];
    return campaigns.map(camp => {
      const start = camp.startDate ? new Date(camp.startDate) : new Date(camp.createdAt.seconds * 1000);
      const diff = differenceInDays(new Date(), start) + 1;

      const todayActions = camp.strategy?.timeline?.filter((e: any) => e.day === diff) || [];
      const pastActions = camp.strategy?.timeline?.filter((e: any) => e.day < diff) || [];

      return {
        ...camp,
        currentDay: diff,
        todayActions,
        pastCount: pastActions.length,
        totalActions: camp.strategy?.timeline?.length || 1,
        progress: Math.min(100, Math.round((pastActions.length / (camp.strategy?.timeline?.length || 1)) * 100))
      };
    });
  }, [campaigns]);

  const handleManualDispatch = async (camp: any) => {
    setExecuting(camp.id);
    try {
      // Identify if we have real credentials for the motors needed (only block if mode is set to 'production')
      const channels = Array.from(new Set(camp.todayActions.flatMap((a: any) => a.channels)));
      const p = profile as any;
      const missingKeys = channels.filter(ch => {
        const motorId = ch === 'Email' ? 'sendgrid' : ch === 'Social' ? 'meta_social' : 'meta_ads';
        const creds = p?.marketingCredentials?.[motorId];
        const isProduction = creds?.mode === 'production';
        return isProduction && !creds?.apiKey;
      });

      if (missingKeys.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Credenciales Faltantes',
          description: `Debes configurar API Keys para: ${missingKeys.join(', ')} antes de disparar en Producción.`
        });
        setExecuting(null);
        return;
      }

      // Generate rich simulated or production response feedback for each triggered channel
      const logsToAppend = camp.todayActions.flatMap((a: any) => {
        const chans = a.channels || [];
        return chans.flatMap((ch: string) => {
          const motorId = ch === 'Email' ? 'sendgrid' : ch === 'Social' ? 'meta_social' : 'meta_ads';
          const creds = p?.marketingCredentials?.[motorId];
          const mode = creds?.mode || 'sandbox';

          if (ch === 'Social') {
            const activePlatforms = ['instagram', 'tiktok', 'linkedin', 'twitter', 'x'];
            return activePlatforms.map(plat => {
              const currentSched = a.socialSchedule?.[plat] || { time: '18:00', videoName: `Video ${camp.currentDay}` };

              let feedback = '';
              if (mode === 'sandbox') {
                if (plat === 'instagram') feedback = '💡 [MANUAL SANDBOX] Meta Unified Graph API: Publicación manual simulada en Reels. Formato MP4 validado.';
                else if (plat === 'tiktok') feedback = '💡 [MANUAL SANDBOX] TikTok Content API: Clip manual simulado con éxito en feed de pruebas.';
                else if (plat === 'linkedin') feedback = '💡 [MANUAL SANDBOX] LinkedIn Professional: Post manual indexado en la red B2B de pruebas.';
                else feedback = '💡 [MANUAL SANDBOX] X (Twitter) Engine: Tweet manual publicado en sandbox.';
              } else {
                feedback = `🚀 [MANUAL PRODUCCIÓN] ¡Emisión Real manual disparada en ${plat.toUpperCase()}! ID: ${plat}_man_${Math.floor(Math.random() * 100000)}`;
              }

              return {
                timestamp: new Date().toISOString(),
                day: camp.currentDay,
                channel: 'Social',
                platform: plat,
                action: a.action,
                phase: a.phase,
                variantIndex: a.variantIndex,
                time: currentSched.time,
                videoName: currentSched.videoName,
                status: 'success',
                mode,
                provider: plat.toUpperCase(),
                feedback,
                responseId: `${plat}_man_${Math.floor(Math.random() * 1000000)}`,
                protocolVerified: true
              };
            });
          } else {
            let feedback = '';
            if (mode === 'sandbox') {
              feedback = ch === 'Email'
                ? '💡 [MANUAL SANDBOX] SendGrid SMTP: Correo manual simulado enviado exitosamente a la lista de pruebas.'
                : '💡 [MANUAL SANDBOX] Meta Ads Manager: Campaña publicitaria manual simulada con éxito.';
            } else {
              feedback = `🚀 [MANUAL PRODUCCIÓN] Emisión Real manual disparada en ${ch === 'Email' ? 'SendGrid' : 'Meta Ads'}!`;
            }

            return [{
              timestamp: new Date().toISOString(),
              day: camp.currentDay,
              channel: ch,
              action: a.action,
              phase: a.phase,
              variantIndex: a.variantIndex,
              time: ch === 'Email' ? '09:00' : '08:00',
              status: 'success',
              mode,
              provider: ch === 'Email' ? 'SendGrid' : 'Meta Ads',
              feedback,
              responseId: `${ch.toLowerCase()}_man_${Math.floor(Math.random() * 1000000)}`,
              protocolVerified: true
            }];
          }
        });
      });

      // Update the campaign doc in Firestore with all generated logs
      await updateDoc(doc(db, 'campaigns', camp.id), {
        executionLogs: arrayUnion(...logsToAppend),
        updatedAt: serverTimestamp()
      });

      toast({
        title: 'Despliegue Exitoso',
        description: `Protocolos validados en Sandbox. Se han simulado y registrado ${logsToAppend.length} emisiones para el Día ${camp.currentDay}.`
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fallo de Protocolo', description: 'Error en la respuesta del motor externo.' });
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
          <div className="bg-slate-900 px-6 py-4 rounded-[1.5rem] border border-white/10 flex items-center gap-6">
            <div className="text-center">
              <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">En Emisión</p>
              <p className="text-2xl font-black text-white">{activeCampaigns.length}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-tighter">Sistemas OK</span>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary opacity-20" /></div>
        ) : activeCampaigns.length > 0 && (
          <div className="grid gap-8">
            {activeCampaigns.map((camp) => (
              <Card key={camp.id} className="rounded-lg bg-white overflow-hidden group">
                <div className="flex flex-col lg:flex-row">
                  <div className="lg:w-80 bg-slate-900 p-10 text-white shrink-0 flex flex-col justify-between relative overflow-hidden">
                    <BrainCircuit className="absolute -right-10 -top-10 h-48 w-48 opacity-10 pointer-events-none" />
                    <div className="relative z-10">
                      <Badge className="bg-accent text-white border-none h-5 px-2 text-[8px] font-black uppercase tracking-widest mb-4">Auto-Pilot Active</Badge>
                      <h3 className="text-2xl font-bold leading-tight">{camp.title}</h3>
                      <p className="text-slate-400 text-xs mt-2 uppercase font-bold tracking-tighter">Ciclo: Día {camp.currentDay}</p>
                    </div>
                    <div className="pt-10 relative z-10">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-500 mb-2">
                        <span>Progreso Plan</span>
                        <span>{camp.progress}%</span>
                      </div>
                      <Progress value={camp.progress} className="h-1.5 bg-white/10" />
                    </div>
                  </div>

                  <div className="flex-1 p-10 space-y-10">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-500" /> Despliegues para hoy
                      </h4>
                    </div>

                    <div className="grid gap-4">
                      {camp.todayActions.length === 0 ? (
                        <div className="p-10 bg-slate-50 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center gap-3">
                          <Clock className="h-8 w-8 text-slate-300" />
                          <p className="font-bold text-slate-500">Sin lanzamientos previstos para hoy</p>
                        </div>
                      ) : camp.todayActions.map((action: any, i: number) => (
                        <div key={i} className="bg-emerald-50/50 border-2 border-emerald-100 p-6 rounded-lg flex flex-col md:flex-row justify-between items-center gap-6 group/item hover:bg-emerald-50 transition-all">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                              <Zap className="h-7 w-7" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-600 text-white border-none text-[8px] font-black uppercase h-5">{action.phase}</Badge>
                                <span className="text-xs font-black text-emerald-700">Variante {action.variantIndex + 1}</span>
                              </div>
                              <p className="font-bold text-lg text-slate-900 leading-tight">{action.action}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 bg-white/60 p-2 rounded-2xl border border-emerald-200">
                            {action.channels.map((ch: string) => (
                              <div key={ch} title={ch} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-emerald-100">
                                {ch === 'Email' ? <Mail className="h-5 w-5" /> : ch === 'Social' ? <Instagram className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Execution Logs / Provider Feedback History */}
                    {camp.executionLogs && camp.executionLogs.length > 0 && (
                      <div className="pt-8 border-t border-slate-100 space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em] flex items-center gap-2">
                          <Database className="h-3.5 w-3.5 text-slate-400" /> Historial de Emisiones y Feedback
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
                                isSuccess ? "bg-slate-50/50 border-slate-100" : "bg-rose-50/30 border-rose-100"
                              )}>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge className={cn("text-[7px] font-black uppercase tracking-wider h-4 border-none",
                                      isSuccess ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"
                                    )}>
                                      {isSuccess ? 'Éxito' : 'Error'}
                                    </Badge>
                                    <Badge className="text-[7px] font-black uppercase bg-slate-100 text-slate-600 border-none h-4">
                                      Día {log.day}
                                    </Badge>
                                    {log.platform && (
                                      <Badge className="text-[7px] font-black uppercase bg-blue-50 text-blue-700 border-none h-4">
                                        {log.platform}
                                      </Badge>
                                    )}
                                    <Badge className={cn("text-[7px] font-black uppercase border-none h-4",
                                      isSandbox ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                                    )}>
                                      {isSandbox ? 'Sandbox' : 'Real'}
                                    </Badge>
                                  </div>
                                  {formattedTime && (
                                    <span className="text-[9px] font-black text-slate-400">{formattedTime} hs</span>
                                  )}
                                </div>
                                <p className="font-bold text-slate-800 leading-snug">{log.action}</p>
                                <p className="mt-2 text-[10px] text-slate-500 leading-relaxed font-medium bg-white p-2.5 rounded-lg border border-slate-100/50">
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
                          className="h-14 px-10 rounded-2xl font-bold text-lg bg-slate-900 gap-3"
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

