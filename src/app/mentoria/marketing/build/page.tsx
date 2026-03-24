
'use client';

import { useState, useMemo } from 'react';
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
  const { profile } = useAuth();
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

  // Pack Multimedia Query
  const salesPagesQuery = useMemoFirebase(() => {
    if (!db || !profile?.uid) return null;
    return query(
      collection(db, 'salesPages'),
      where('mentorId', '==', profile.uid)
    );
  }, [db, profile?.uid]);

  const { data: rawSalesPages, isLoading: pagesLoading } = useCollection(salesPagesQuery);

  const salesPages = useMemo(() => {
    if (!rawSalesPages) return null;
    return [...rawSalesPages].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [rawSalesPages]);

  const handleGeneratePlan = async () => {
    if (!selectedPageId || !campaignTitle) return;
    setIsGenerating(true);
    try {
      const result = await generateCoordinationPlan({
        campaignTitle: campaignTitle,
        strategyType: strategy,
        durationDays: duration,
        targetAudience: targetAudience || 'Audiencia General'
      });

      setCoordinationPlan(result);
      setStep(3);
      toast({ title: 'Plan Estratégico Listo', description: 'Gemini ha propuesto un cronograma inicial.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error de Coordinación' });
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

  const handleFinalPublish = async () => {
    if (!profile?.uid || !coordinationPlan) return;
    setLoading(true);
    try {
      const campId = Math.random().toString(36).substring(2, 15);
      const campRef = doc(db, 'campaigns', campId);
      const selectedPage = salesPages?.find(p => p.id === selectedPageId);
      
      const campaignData = {
        id: campId,
        mentorId: profile.uid,
        title: campaignTitle,
        salesPageId: selectedPageId,
        courseId: selectedPage?.courseId || null,
        strategy: coordinationPlan,
        startDate: startDate,
        autoPilot: true,
        status: 'active',
        isActive: true,
        createdAt: serverTimestamp()
      };

      await setDoc(campRef, campaignData);
      toast({ title: 'Campaña Coordinada', description: 'Tu cronograma ha sido activado en Piloto Automático.' });
      router.push('/mentoria/marketing');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al publicar' });
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
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col">
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
                        onClick={() => setSelectedPageId(p.id)}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all cursor-pointer",
                          selectedPageId === p.id ? "bg-primary/5 border-primary shadow-sm" : "bg-white border-border/50 hover:border-primary/20"
                        )}
                      >
                        <p className="font-bold text-sm text-slate-700">{p.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">ID: {p.id}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col">
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
                    className="h-12 rounded-xl bg-secondary/10 border-none px-4 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Fecha de Lanzamiento (Día 1)</Label>
                  <Input 
                    type="date"
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    className="h-12 rounded-xl bg-secondary/10 border-none px-4 font-bold"
                  />
                </div>
                <Button 
                  onClick={() => setStep(2)} 
                  disabled={!selectedPageId || !campaignTitle} 
                  className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl mt-4"
                >
                  Siguiente: Estrategia <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 max-w-2xl mx-auto">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="bg-primary/5 p-10">
                <CardTitle className="text-2xl font-bold flex items-center gap-3"><BrainCircuit className="h-6 w-6 text-accent" /> Estrategia de Emisión</CardTitle>
                <CardDescription>Gemini determinará el orden ideal para tus variantes.</CardDescription>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="grid gap-8">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Modelo de Lanzamiento</Label>
                    <Select value={strategy} onValueChange={(v: any) => setStrategy(v)}>
                      <SelectTrigger className="h-14 rounded-2xl bg-secondary/10 border-none px-6 font-bold text-lg">
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
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Duración (Días)</Label>
                      <div className="flex items-center gap-4">
                        <Input 
                          type="number" 
                          value={duration} 
                          onChange={e => setDuration(parseInt(e.target.value) || 1)} 
                          className="h-14 rounded-2xl bg-secondary/10 border-none px-6 font-black text-xl w-32" 
                        />
                        <p className="text-xs font-medium text-muted-foreground">Ciclo total.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Refinar Segmentación del Público</Label>
                      <Textarea 
                        value={targetAudience} 
                        onChange={e => setTargetAudience(e.target.value)} 
                        placeholder="Ej: Programadores buscando especializarse en Hard-Skills de IA o Médicos enfocados en nuevas tecnologías..." 
                        className="h-24 rounded-xl bg-secondary/10 border-none px-4 py-3 text-sm font-medium"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-1 flex items-center gap-2">
                        <Lightbulb className="h-3 w-3 text-amber-500" /> Perfiles de Referencia:
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
                  className="w-full h-20 rounded-[2rem] font-bold text-2xl shadow-3xl bg-slate-900"
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
            <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
              <CardHeader className="bg-emerald-500 p-10 text-white relative">
                <TrendingUp className="absolute right-10 top-10 h-20 w-20 opacity-10" />
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-3xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30"><Calendar className="h-8 w-8" /></div>
                  <div>
                    <CardTitle className="text-3xl font-bold">Cronograma Flexible</CardTitle>
                    <CardDescription className="text-emerald-100 text-base">Ajusta el orden de emisión de tus 3 variantes.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-10 space-y-10">
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-accent" /> Lógica de la Campaña</h4>
                  <p className="text-slate-600 leading-relaxed italic font-medium">"{coordinationPlan.logic}"</p>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center px-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Línea de Tiempo Editable</h4>
                    <Button variant="outline" size="sm" onClick={handleAddEvent} className="rounded-xl font-bold gap-2 h-9">
                      <Plus className="h-4 w-4" /> Añadir Hito
                    </Button>
                  </div>
                  
                  <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-1/2 before:bg-slate-200">
                    {coordinationPlan.timeline.map((event, i) => (
                      <div key={i} className="relative flex items-start gap-10 group">
                        <div className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-white border-4 border-emerald-500 shadow-xl z-10 shrink-0">
                          <input 
                            type="number" 
                            value={event.day} 
                            onChange={e => handleUpdateEvent(i, 'day', parseInt(e.target.value) || 0)}
                            className="w-full text-center text-xs font-black text-emerald-600 border-none bg-transparent outline-none"
                          />
                        </div>
                        <Card className="ml-14 flex-1 p-6 rounded-[2rem] border-2 border-slate-100 bg-white hover:border-emerald-200 transition-all group/card relative">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteEvent(i)}
                            className="absolute top-4 right-4 h-8 w-8 text-rose-400 opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          
                          <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-4">
                              <div className="flex gap-3">
                                <Badge className="bg-primary/5 text-primary border-none text-[8px] font-black uppercase h-6">FASE</Badge>
                                <input 
                                  value={event.phase} 
                                  onChange={e => handleUpdateEvent(i, 'phase', e.target.value)}
                                  className="text-xs font-bold text-slate-400 border-none bg-transparent outline-none w-full"
                                />
                              </div>
                              <Textarea 
                                value={event.action} 
                                onChange={e => handleUpdateEvent(i, 'action', e.target.value)}
                                className="font-bold text-lg text-slate-900 border-none bg-slate-50 rounded-xl p-4 min-h-[80px]"
                              />
                            </div>
                            <div className="space-y-4 flex flex-col justify-end">
                              <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Variante Multimedia</Label>
                                <Select 
                                  value={event.variantIndex.toString()} 
                                  onValueChange={v => handleUpdateEvent(i, 'variantIndex', parseInt(v))}
                                >
                                  <SelectTrigger className="h-10 rounded-xl bg-emerald-50 border-none font-bold text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">Variante 1 (Mínima)</SelectItem>
                                    <SelectItem value="1">Variante 2 (Equilibrada)</SelectItem>
                                    <SelectItem value="2">Variante 3 (Detallada)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex gap-1 flex-wrap">
                                {['Email', 'Social', 'Ads'].map(ch => (
                                  <Badge 
                                    key={ch} 
                                    variant={event.channels.includes(ch) ? 'default' : 'outline'}
                                    className="cursor-pointer text-[7px] uppercase font-bold"
                                    onClick={() => {
                                      const newChans = event.channels.includes(ch) 
                                        ? event.channels.filter(c => c !== ch) 
                                        : [...event.channels, ch];
                                      handleUpdateEvent(i, 'channels', newChans);
                                    }}
                                  >
                                    {ch}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-10 border-t flex flex-col gap-6">
                  <Button onClick={handleFinalPublish} disabled={loading} className="w-full h-20 rounded-[2rem] text-2xl font-bold bg-primary shadow-3xl">
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
