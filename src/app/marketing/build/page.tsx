
'use client';

import { useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Layout, 
  FileBox, 
  Loader2, 
  Rocket, 
  Zap,
  Target,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  Settings2,
  ArrowUpRight,
  Mail,
  Instagram,
  Megaphone,
  Plus,
  Trash2,
  Pencil,
  Lightbulb,
  UserCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { generateCoordinationPlan, CoordinationOutput } from '@/ai/flows/generate-coordination-plan';
import { useApiSalesPages } from '@/hooks/use-api-sales-pages';
import {
  publishCampaign,
  requestCoordinationPlan,
} from '@/lib/api/mentoring-client';
import { SocialScheduleEditor, TimelineEditor } from '@/presentation/campaigns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

const STRATEGIC_SEGMENTS = [
  { id: 'technical', label: 'Hard Skills / Técnico', desc: 'Enfoque en dominio técnico, implementación y herramientas específicas.' },
  { id: 'health', label: 'Área Salud / Bienestar', desc: 'Enfoque en autoridad científica, ética y bienestar basado en evidencia.' },
  { id: 'corporate', label: 'Sector Corporativo', desc: 'Enfoque en ROI, eficiencia de equipos y liderazgo organizacional.' },
  { id: 'entrepreneurs', label: 'Freelancers / Solopreneurs', desc: 'Enfoque en escala individual, marca personal y optimización de agenda.' },
  { id: 'career_pivot', label: 'Reconversión Laboral', desc: 'Enfoque en nuevas habilidades para el futuro y seguridad profesional.' },
  { id: 'academic', label: 'Certificaciones / Academia', desc: 'Enfoque en profundidad del conocimiento y validez institucional.' }
];

export default function CampaignOrchestratorPage() {
  const { profile, user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<'flash_sale' | 'classic_launch' | 'evergreen_warmup'>('classic_launch');
  const [duration, setDuration] = useState(7);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [coordinationPlan, setCoordinationPlan] = useState<CoordinationOutput | null>(null);

  const handlePageSelect = (pageId: string) => {
    setSelectedPageId(pageId);
    const page = salesPages?.find(p => p.id === pageId);
    if (page) {
      const content = page.aiContent || {};
      const socials = content.socials || content.social || [];
      const totalVideos = socials.length;
      
      setCampaignTitle(`Lanzamiento ${page.title}`);
      
      if (totalVideos <= 1) {
        setDuration(3);
        setStrategy('flash_sale');
      } else if (totalVideos === 2) {
        setDuration(5);
        setStrategy('flash_sale');
      } else {
        setDuration(7);
        setStrategy('classic_launch');
      }
    }
  };

  const { data: salesPagesList, isLoading: pagesLoading } = useApiSalesPages({
    type: 'campaign_pack',
    mentorId: profile?.uid,
    skip: !profile?.uid
  });

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Sin sesión');
    return user.getIdToken();
  }, [user]);

  const salesPages: any[] | null = useMemo(() => {
    if (!salesPagesList) return null;
    return [...salesPagesList]
      .filter(p => p.type !== 'landing_only')
      .sort((a, b) => {
        const valA = a.createdAt as any;
        const dateA = valA?.toDate ? valA.toDate() : (valA instanceof Date ? valA : new Date(valA || 0));
        const valB = b.createdAt as any;
        const dateB = valB?.toDate ? valB.toDate() : (valB instanceof Date ? valB : new Date(valB || 0));
        return dateB.getTime() - dateA.getTime();
      });
  }, [salesPagesList]);

  const handleGeneratePlan = async () => {
    if (!selectedPageId || !campaignTitle) return;
    setIsGenerating(true);
    try {
      const result = await requestCoordinationPlan({
        campaignTitle: campaignTitle,
        strategyType: strategy,
        durationDays: duration,
        targetAudience: targetAudience || 'Audiencia General'
      }, await getToken());
      setCoordinationPlan(result);
      setStep(3);
      toast({ title: 'Plan Estratégico Listo', description: 'Gemini ha propuesto un cronograma inicial.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error de Coordinación', description: e instanceof Error ? e.message : undefined });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateEvent = (idx: number, field: string, value: any) => {
    if (!coordinationPlan) return;
    const newTimeline = [...coordinationPlan.timeline];
    newTimeline[idx] = { ...newTimeline[idx], [field]: value };
    setCoordinationPlan({ ...coordinationPlan, timeline: newTimeline });
  };

  const handleDeleteEvent = (idx: number) => {
    if (!coordinationPlan) return;
    const newTimeline = coordinationPlan.timeline.filter((_, i) => i !== idx);
    setCoordinationPlan({ ...coordinationPlan, timeline: newTimeline });
  };

  const handleAddEvent = () => {
    if (!coordinationPlan) return;
    const lastDay = coordinationPlan.timeline.length > 0 
      ? Math.max(...coordinationPlan.timeline.map(e => e.day)) 
      : 0;
    
    const newEvent = {
      day: lastDay + 1,
      phase: 'Nueva Fase',
      variantIndex: 0,
      action: 'Nueva acción coordinada',
      channels: ['Email', 'Social']
    };
    
    setCoordinationPlan({
      ...coordinationPlan,
      timeline: [...coordinationPlan.timeline, newEvent].sort((a, b) => a.day - b.day)
    });
  };

  const renderSocialSchedule = (event: any, i: number) => {
    if (!event.channels?.includes('Social')) return null;
    const page = salesPages?.find(p => p.id === selectedPageId);
    const socials: any[] = page?.aiContent?.socials || page?.aiContent?.social || [];
    if (socials.length === 0) return null;
    const platforms = Array.from(new Set(socials.map((s: any) => s.platform).filter(Boolean))) as string[];
    const videosByPlatform: Record<string, string[]> = {};
    platforms.forEach(plat => {
      videosByPlatform[plat] = socials
        .filter((s: any) => s.platform === plat)
        .map((s: any, sIdx: number) => s.marketingName || s.name || `Video ${sIdx + 1}`);
    });
    return (
      <SocialScheduleEditor
        value={event.socialSchedule || {}}
        platforms={platforms}
        videosByPlatform={videosByPlatform}
        onChange={(socialSchedule) => {
          if (!coordinationPlan) return;
          const newTimeline = [...coordinationPlan.timeline];
          newTimeline[i] = { ...newTimeline[i], socialSchedule };
          setCoordinationPlan({ ...coordinationPlan, timeline: newTimeline });
        }}
      />
    );
  };

  const handleFinalPublish = async () => {
    if (!profile?.uid || !coordinationPlan) return;
    setLoading(true);
    try {
      const selectedPage = salesPages?.find(p => p.id === selectedPageId);
      await publishCampaign({
        mentorId: profile.uid,
        title: campaignTitle,
        salesPageId: selectedPageId!,
        courseId: selectedPage?.courseId || null,
        strategy: coordinationPlan,
        startDate: startDate,
      }, await getToken());
      toast({ title: 'Campaña Coordinada', description: 'Tu cronograma ha sido activado en Piloto Automático.' });
      router.push('/marketing');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al publicar', description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-10 pb-20">
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Coordinador de Emisión</h1>
            <p className="text-sm text-muted-foreground font-medium">Orquesta la salida de tus variantes multimedia. Paso {step} de 3.</p>
          </div>
        </header>

        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
            <Card className="flex flex-col">
              <CardHeader className="bg-primary/5 p-8">
                <CardTitle className="text-xl flex items-center gap-3"><FileBox className="h-5 w-5 text-primary" /> 1. Elegir Contenido</CardTitle>
                <CardDescription>Selecciona el pack multimedia para coordinar.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 flex-1">
                <ScrollArea className="h-[400px]">
                  <div className="grid gap-3">
                    {pagesLoading ? (
                      <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
                    ) : salesPages?.length === 0 ? (
                      <div className="py-20 text-center italic text-muted-foreground text-sm">No tienes packs generados.</div>
                    ) : salesPages?.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => handlePageSelect(p.id)}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all cursor-pointer",
                          selectedPageId === p.id ? "bg-primary/5 border-primary shadow-sm" : "bg-white border-border/50 hover:border-primary/20"
                        )}
                      >
                        <p className="font-bold text-sm text-foreground">{p.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">ID: {p.id}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="bg-accent/5 p-8">
                <CardTitle className="text-xl flex items-center gap-3"><Settings2 className="h-5 w-5 text-accent" /> Configuración</CardTitle>
                <CardDescription>Define el nombre y la fecha de inicio.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6 flex-1">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Título de Campaña</Label>
                  <Input 
                    value={campaignTitle} 
                    onChange={e => setCampaignTitle(e.target.value)} 
                    placeholder="Ej: Lanzamiento Enero 2024" 
                    className="bg-secondary/10 border-none px-4 font-bold"
                   size="lg" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Fecha de Lanzamiento (Día 1)</Label>
                  <Input 
                    type="date"
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    className="bg-secondary/10 border-none px-4 font-bold"
                   size="lg" />
                </div>

                {selectedPageId && (() => {
                  const page = salesPages?.find(p => p.id === selectedPageId);
                  if (!page) return null;
                  
                  const content = page.aiContent || {};
                  const socials = content.socials || content.social || [];
                  const emails = content.emails || content.email || [];
                  const ads = content.ads || content.ad || content.adsSet || [];
                  
                  const instagramCount = socials.filter((s: any) => s.platform?.toLowerCase() === 'instagram').length;
                  const tiktokCount = socials.filter((s: any) => s.platform?.toLowerCase() === 'tiktok').length;
                  const linkedinCount = socials.filter((s: any) => s.platform?.toLowerCase() === 'linkedin').length;
                  const twitterCount = socials.filter((s: any) => s.platform?.toLowerCase() === 'twitter' || s.platform?.toLowerCase() === 'x').length;
                  const otherCount = socials.length - (instagramCount + tiktokCount + linkedinCount + twitterCount);
                  
                  return (
                    <div className="p-5 rounded-2xl bg-muted border border-muted space-y-4 animate-in fade-in zoom-in-95">
                      <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Activos del Pack Seleccionado</h4>
                      
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-muted/50">
                          <p className="text-xl font-black text-foreground">{emails.length}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">Emails</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-muted/50">
                          <p className="text-xl font-black text-foreground">{ads.length}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">Ads (Anuncios)</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-muted/50">
                          <p className="text-xl font-black text-foreground">{socials.length}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">Videos/Posts</p>
                        </div>
                      </div>
                      
                      {socials.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-border/60">
                          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Distribución por Redes</p>
                          <div className="flex flex-wrap gap-2">
                            {instagramCount > 0 && <Badge variant="outline" className="bg-pink-50/50 border-pink-100 text-pink-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">Instagram: {instagramCount}</Badge>}
                            {tiktokCount > 0 && <Badge variant="outline" className="bg-muted/50 border-border text-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-lg">TikTok: {tiktokCount}</Badge>}
                            {linkedinCount > 0 && <Badge variant="outline" className="bg-blue-50/50 border-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">LinkedIn: {linkedinCount}</Badge>}
                            {twitterCount > 0 && <Badge variant="outline" className="bg-sky-50/50 border-sky-100 text-sky-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">Twitter/X: {twitterCount}</Badge>}
                            {otherCount > 0 && <Badge variant="outline" className="bg-muted/50 border-border text-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-lg">Otros: {otherCount}</Badge>}
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-warn/10/80 border border-warn/15/60 rounded-xl p-3 text-[11px] font-medium text-warn space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <Lightbulb className="h-3.5 w-3.5 text-warn shrink-0" /> Recomendación del Planificador:
                        </p>
                        <p className="leading-normal text-warn">
                          {socials.length === 0 ? (
                            "Este pack no tiene videos generados. Te sugerimos generar videos en el Productor antes de orquestar la emisión."
                          ) : socials.length === 1 ? (
                            "Se sugiere una campaña corta de 3 días. Hacer una campaña larga (7 días o más) con un solo video fatigará a tu audiencia."
                          ) : socials.length === 2 ? (
                            "Se sugiere una campaña de 5 días. Con 2 videos puedes alternar contenidos en tus canales sin saturar."
                          ) : (
                            `¡Excelente! Tienes ${socials.length} videos listos. Recomendamos una campaña de 7 a 14 días (Lanzamiento Clásico) para máximo impacto.`
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <Button 
                  onClick={() => setStep(2)} 
                  disabled={!selectedPageId || !campaignTitle} 
                  className="w-full h-14 rounded-2xl font-bold text-lg mt-4"
                >
                  Siguiente: Estrategia <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
            <Card>
              <CardHeader className="bg-primary/5 p-10">
                <CardTitle className="text-2xl font-bold flex items-center gap-3"><BrainCircuit className="h-6 w-6 text-accent" /> Estrategia de Emisión</CardTitle>
                <CardDescription>Gemini determinará el orden ideal para tus variantes.</CardDescription>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="grid gap-8">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Modelo de Lanzamiento</Label>
                    <Select value={strategy} onValueChange={(v: any) => setStrategy(v)}>
                      <SelectTrigger size="xl" className="bg-secondary/10 border-none px-6 font-bold text-lg">
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic_launch" className="font-bold">Lanzamiento Clásico (7-14 días)</SelectItem>
                        <SelectItem value="flash_sale" className="font-bold">Venta Relámpago (3-5 días)</SelectItem>
                        <SelectItem value="evergreen_warmup" className="font-bold">Calentamiento Evergreen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Duración (Días)</Label>
                      <div className="flex items-center gap-4">
                        <Input 
                          type="number" 
                          value={duration} 
                          onChange={e => setDuration(parseInt(e.target.value) || 1)} 
                          className="bg-secondary/10 border-none px-6 font-black text-xl w-32" 
                         size="xl" />
                        <div>
                          <p className="text-xs font-bold text-foreground">Duración sugerida</p>
                          {(() => {
                            const page = salesPages?.find(p => p.id === selectedPageId);
                            const socials = page?.aiContent?.socials || page?.aiContent?.social || [];
                            const recommended = socials.length <= 1 ? 3 : socials.length === 2 ? 5 : 7;
                            return (
                              <p className={cn(
                                "text-[10px] font-bold uppercase tracking-tighter mt-0.5",
                                duration === recommended ? "text-success animate-pulse" : "text-warn"
                              )}>
                                {duration === recommended ? "✓ Óptima para tus videos" : `Sugerida: ${recommended} días`}
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Refinar Segmentación del Público</Label>
                      <Textarea 
                        value={targetAudience} 
                        onChange={e => setTargetAudience(e.target.value)} 
                        placeholder="Ej: Programadores buscando especializarse en Hard-Skills de IA o Médicos enfocados en nuevas tecnologías..." 
                        className="h-24 rounded-xl bg-secondary/10 border-none px-4 py-3 text-sm font-medium"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] px-1 flex items-center gap-2">
                        <Lightbulb className="h-3 w-3 text-warn" /> Perfiles de Referencia:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {STRATEGIC_SEGMENTS.map(seg => (
                          <Badge 
                            key={seg.id}
                            variant="secondary"
                            className="cursor-pointer hover:bg-primary hover:text-white transition-colors h-7 px-3 rounded-lg text-[9px] font-bold"
                            onClick={() => setTargetAudience(seg.label + ': ' + seg.desc)}
                          >
                            {seg.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleGeneratePlan} 
                  disabled={isGenerating} 
                  className="w-full h-20 rounded-lg font-bold text-2xl bg-foreground"
                >
                  {isGenerating ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <Sparkles className="mr-3 h-8 w-8 text-accent" />}
                  Generar Plan Maestro
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 3 && coordinationPlan && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <Card className="rounded-lg bg-white overflow-hidden">
              <CardHeader className="bg-success p-10 text-white relative">
                <TrendingUp className="absolute right-10 top-10 h-20 w-20 opacity-10" />
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-3xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30"><Calendar className="h-8 w-8" /></div>
                  <div>
                    <CardTitle className="text-3xl font-bold">Cronograma Flexible</CardTitle>
                    <CardDescription className="text-success/15 text-base">Ajusta el orden de emisión de tus 3 variantes.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-10 space-y-10">
                <div className="bg-muted p-8 rounded-lg border border-border">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-accent" /> Lógica de la Campaña</h4>
                  <p className="text-muted-foreground leading-relaxed italic font-medium">"{coordinationPlan.logic}"</p>
                </div>

                {coordinationPlan && (
                  <TimelineEditor
                    events={coordinationPlan.timeline as any}
                    onChange={(timeline) => setCoordinationPlan({ ...coordinationPlan, timeline: timeline as any })}
                    renderEventExtra={(event, i) => renderSocialSchedule(event, i)}
                  />
                )}

                <div className="pt-10 border-t flex flex-col gap-6">
                  <Button onClick={handleFinalPublish} disabled={loading} className="w-full h-20 rounded-lg text-2xl font-bold bg-primary">
                    {loading ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <Rocket className="mr-3 h-8 w-8 text-accent" />}
                    Confirmar y Activar Lanzamiento
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
