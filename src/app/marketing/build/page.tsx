
'use client';

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useApiSalesPages } from '@/hooks/use-api-sales-pages';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Rocket,
  Zap,
  Target,
  Calendar,
  CheckCircle2,
  Circle,
  TrendingUp,
  BrainCircuit,
  Settings2,
  Megaphone,
  Plus,
  Lightbulb,
  BookOpen,
  Shield,
  Video,
  Play,
  Check,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { CoordinationOutput } from '@/ai/flows/generate-coordination-plan';
import {
  publishCampaign,
  requestCoordinationPlan,
} from '@/lib/api/mentoring-client';
import { generateBuyerPersonas } from '@/ai/flows/generate-buyer-personas';
import { TimelineEditor } from '@/presentation/campaigns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';

/* ─────────────────── Constants ─────────────────── */

const STRATEGIC_SEGMENTS = [
  { id: 'technical', label: 'Hard Skills / Técnico', desc: 'Enfoque en dominio técnico, implementación y herramientas específicas.' },
  { id: 'health', label: 'Área Salud / Bienestar', desc: 'Enfoque en autoridad científica, ética y bienestar basado en evidencia.' },
  { id: 'corporate', label: 'Sector Corporativo', desc: 'Enfoque en ROI, eficiencia de equipos y liderazgo organizacional.' },
  { id: 'entrepreneurs', label: 'Freelancers / Solopreneurs', desc: 'Enfoque en escala individual, marca personal y optimización de agenda.' },
  { id: 'career_pivot', label: 'Reconversión Laboral', desc: 'Enfoque en nuevas habilidades para el futuro y seguridad profesional.' },
  { id: 'academic', label: 'Certificaciones / Academia', desc: 'Enfoque en profundidad del conocimiento y validez institucional.' }
];

const CAMPAIGN_MISSIONS = [
  { id: 'venta', label: 'Venta', icon: Target, desc: 'Conversión directa' },
  { id: 'autoridad', label: 'Autoridad', icon: Shield, desc: 'Posicionamiento experto' },
  { id: 'lanzamiento', label: 'Lanzamiento', icon: Rocket, desc: 'Nuevo producto' },
  { id: 'leads', label: 'Leads', icon: Megaphone, desc: 'Captación de prospectos' }
] as const;

const STRATEGY_PRESETS = [
  { id: 'flash_sale' as const, label: 'Venta Relámpago', duration: 3, desc: '3-5 días, alta urgencia', icon: Zap },
  { id: 'classic_launch' as const, label: 'Lanzamiento Clásico', duration: 7, desc: '7-14 días, embudo completo', icon: Rocket },
  { id: 'evergreen_warmup' as const, label: 'Calentamiento Evergreen', duration: 14, desc: 'Contenido perenne, ritmo suave', icon: TrendingUp },
];

const PLATFORMS = ['instagram', 'tiktok', 'linkedin', 'youtube', 'twitter'] as const;

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const PLATFORM_DEFS = [
  { id: 'instagram', label: 'Instagram',    Icon: Instagram,   color: 'from-pink-500 to-purple-600' },
  { id: 'tiktok',   label: 'TikTok',       Icon: TikTokIcon,  color: 'from-slate-700 to-slate-900' },
  { id: 'linkedin', label: 'LinkedIn',     Icon: Linkedin,    color: 'from-blue-600 to-blue-800' },
  { id: 'youtube',  label: 'YouTube',      Icon: Youtube,     color: 'from-red-500 to-red-700' },
  { id: 'twitter',  label: 'X / Twitter', Icon: Twitter,     color: 'from-slate-600 to-slate-900' },
] as const;

/* ─────────────────── Page wrapper ─────────────────── */

export default function CampaignOrchestratorPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-muted">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    }>
      <OrchestratorContent />
    </Suspense>
  );
}

/* ─────────────────── Main content ─────────────────── */

function OrchestratorContent() {
  const { profile, user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  /* ── State: steps ── */
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  /* ── State: Step 1 — Briefing ── */
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [campaignMission, setCampaignMission] = useState<'venta' | 'autoridad' | 'lanzamiento' | 'leads'>('lanzamiento');
  const [strategicSegments, setStrategicSegments] = useState(STRATEGIC_SEGMENTS);
  const [isGeneratingSegments, setIsGeneratingSegments] = useState(false);

  /* ── State: Step 2 — Strategy ── */
  const [strategy, setStrategy] = useState<'flash_sale' | 'classic_launch' | 'evergreen_warmup'>('classic_launch');
  const [duration, setDuration] = useState(7);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isGenerating, setIsGenerating] = useState(false);
  const [coordinationPlan, setCoordinationPlan] = useState<CoordinationOutput | null>(null);

  /* ── State: Step 3 — Production ── */
  const [videosPerPlatform, setVideosPerPlatform] = useState<Record<string, number>>({ instagram: 3, tiktok: 2, linkedin: 0, youtube: 1, twitter: 0 });
  const [isProducing, setIsProducing] = useState(false);

  /* ── State: Step 4 — Launch ── */
  const [isPublishing, setIsPublishing] = useState(false);

  /* ── Data: Landings ── */
  const { data: rawPages, isLoading: coursesLoading } = useApiSalesPages({
    type: 'all',
    mentorId: profile?.uid,
    skip: !profile?.uid
  });

  const courses = useMemo(() => {
    if (!rawPages) return [];
    // Mostrar SOLAMENTE las Landings V2 puras ('landing_page' y 'funnel')
    // Excluir 'campaign_pack' (V1 legacy) y 'campaign_videos' (videos generados)
    return [...rawPages]
      .filter((p: any) => p.type === 'landing_page' || p.type === 'funnel')
      .sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));
  }, [rawPages]);

  const selectedCourse = useMemo(() => {
    return courses?.find((c: any) => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  /* ── Auto-fill when course is selected ── */
  useEffect(() => {
    if (selectedCourse) {
      if (!campaignTitle) setCampaignTitle(`Lanzamiento ${selectedCourse.title}`);
      if (!targetAudience) setTargetAudience(`Público interesado en ${selectedCourse.title}. ${selectedCourse.description || ''}`);
      
      // Auto-generar segmentos estratégicos con IA
      setIsGeneratingSegments(true);
      generateBuyerPersonas({
        courseTitle: selectedCourse.title || '',
        courseDescription: selectedCourse.description || ''
      })
      .then(res => {
        if (res && res.personas && res.personas.length > 0) {
          setStrategicSegments(res.personas);
        }
      })
      .catch(err => {
        console.warn("No se pudieron generar los perfiles con IA, usando fallback.", err);
      })
      .finally(() => {
        setIsGeneratingSegments(false);
      });
    }
  }, [selectedCourse]);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Sin sesión');
    return user.getIdToken();
  }, [user]);

  /* ── Recommended duration based on mission ── */
  const recommendedDuration = useMemo(() => {
    switch (campaignMission) {
      case 'venta': return 5;
      case 'autoridad': return 14;
      case 'lanzamiento': return 7;
      case 'leads': return 10;
      default: return 7;
    }
  }, [campaignMission]);

  /* ── Auto-clear old plan on input change ── */
  useEffect(() => {
    if (coordinationPlan) {
      setCoordinationPlan(null);
    }
  }, [videosPerPlatform, campaignTitle, strategy, duration, targetAudience]);

  /* ── Step 2: Generate coordination plan ── */
  const handleGeneratePlan = async () => {
    if (!campaignTitle) return;
    setIsGenerating(true);
    try {
      const activePlatforms = Object.keys(videosPerPlatform).filter(k => videosPerPlatform[k] > 0);
      const availableVideos = Array.from({ length: duration }).map((_, i) => `Video ${i + 1}`);
      const result = await requestCoordinationPlan({
        campaignTitle,
        strategyType: strategy,
        durationDays: duration,
        targetAudience: targetAudience || 'Audiencia General',
        activePlatforms,
        availableVideos
      }, await getToken());
      setCoordinationPlan(result);
      toast({ title: '✨ Plan Estratégico Listo', description: 'La IA ha diseñado el embudo y cronograma de tu campaña.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error de Coordinación', description: e instanceof Error ? e.message : 'No se pudo generar el plan.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const [createdSalesPageId, setCreatedSalesPageId] = useState<string | null>(null);

  /* ── Step 3: Final Publish and Draft ── */
  const handleFinalPublish = async () => {
    if (!coordinationPlan || !profile?.uid || !selectedCourseId) return;
    setIsProducing(true);
    try {
      const token = await getToken();

      const videoSkeletons = coordinationPlan.timeline.flatMap((event, idx) => {
        if (!event.socialSchedule) return [];
        return Object.entries(event.socialSchedule).flatMap(([platform, scheduleData]) => {
          const posts = Array.isArray(scheduleData) ? scheduleData : [scheduleData];
          return posts.map((post, postIndex) => {
            const formatLow = (post.format || '').toLowerCase();
            let assetType = 'story';
            if (platform === 'youtube') assetType = 'landscape';
            else if (platform === 'linkedin') assetType = (formatLow === 'document' || formatLow === 'carousel') ? 'carousel' : 'square';
            else if (formatLow === 'carousel') assetType = 'carousel';
            else if (formatLow === 'feed' || formatLow === 'post') assetType = 'portrait_post';
            
            let aspectFraming = '9:16';
            if (assetType === 'landscape') aspectFraming = '16:9';
            else if (assetType === 'square') aspectFraming = '1:1';
            else if (assetType === 'carousel' || assetType === 'portrait_post') aspectFraming = '4:5';

            const nameSuffix = posts.length > 1 ? ` #${postIndex + 1}` : '';
            return {
              platform: platform,
              type: assetType,
              marketingName: `Día ${event.day}: ${event.phase} (${platform} - ${post.format || 'feed'})${nameSuffix}`,
              caption: '',
              hook: '',
              slides: [],
              funnelPhase: event.phase,
              funnelDay: event.day,
              funnelAction: event.action,
              format: post.format,
              videoName: post.videoName,
              time: post.time,
              designTokens: {
                accent: '#760464',
                primary: '#760464',
                surface: '#eedaea',
                text: '#0a0a0a'
              },
              production_notes: {
                adnId: '01_CINEMA',
                isLocked: false,
                enable_tts: true,
                voice_id: 'mateo',
                framing: aspectFraming
              }
            };
          });
        });
      });

      const pageId = Math.random().toString(36).substring(2, 15);
      setCreatedSalesPageId(pageId);
      
      const pageData = {
        title: campaignTitle + " (Videos)",
        mentorId: profile.uid,
        courseId: selectedCourseId,
        productId: selectedCourseId,
        campaignStatus: 'processing',
        targetAudience,
        type: 'campaign_videos',
        aiContent: {
          socials: videoSkeletons,
        },
        engineMeta: {
          generationEngine: 'StrategyFirst-Orchestrator',
          mission: campaignMission,
          strategyType: strategy,
        },
        isActive: true,
      };

      const createRes = await fetch('/api/sales-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pageId, data: pageData })
      });

      if (!createRes.ok) throw new Error('Error al crear el pack de videos');

      // Guardar también la estrategia en la colección de campañas (publishCampaign)
      await publishCampaign({
        mentorId: profile.uid,
        title: campaignTitle,
        salesPageId: pageId,
        courseId: selectedCourseId,
        strategy: coordinationPlan,
        startDate: startDate,
      }, await getToken());

      // Lanzar generación de borradores inmediatamente
      const autoRes = await fetch('/api/campaign/draft-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaignId: pageId,
          assets: { socials: videoSkeletons },
          videosPerPlatform,
          targetAudience,
          campaignMission,
          coordinationPlan: coordinationPlan,
        })
      });

      if (!autoRes.ok) {
        console.warn('Draft-videos trigger warning:', await autoRes.text());
      }

      toast({ title: '🚀 Producción Iniciada', description: 'Los guiones están en producción y podrás revisar los borradores en breve.' });
      router.push('/marketing/execution');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al iniciar producción', description: e instanceof Error ? e.message : undefined });
    } finally {
      setIsProducing(false);
    }
  };

  /* ── Stepper indicator ── */
  const stepLabels = ['Briefing', 'Estrategia IA', 'Producción', 'Activar'];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        {/* ── Header ── */}
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-headline font-bold text-primary">Estrategia Primero</h1>
            <p className="text-sm text-muted-foreground font-medium">Diseña tu embudo → Genera videos contextualizados → Activa tu campaña.</p>
          </div>
        </header>

        {/* ── Stepper ── */}
        <div className="flex items-center gap-2">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all shrink-0",
                  isDone ? "bg-primary text-white" :
                    isActive ? "bg-primary text-white ring-4 ring-primary/20" :
                      "bg-muted text-muted-foreground"
                )}>
                  {isDone ? <Check className="h-4 w-4" /> : stepNum}
                </div>
                <span className={cn(
                  "text-xs font-bold hidden sm:inline whitespace-nowrap",
                  isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                )}>
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 rounded-full",
                    isDone ? "bg-primary" : "bg-border"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* ═══════════════════ STEP 1: BRIEFING ═══════════════════ */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <Card>
              <CardHeader className="bg-primary/5 p-8">
                <CardTitle className="text-xl flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary" /> 1. ¿Qué vas a promocionar?
                </CardTitle>
                <CardDescription>Selecciona tu Landing V2 y define el contexto de la campaña.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {/* Campaign Title */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nombre de la Campaña</Label>
                  <Input
                    value={campaignTitle}
                    onChange={e => setCampaignTitle(e.target.value)}
                    placeholder="Ej: Lanzamiento Masterclass IA"
                    className="bg-secondary/10 border-border/50 px-4 font-bold h-12"
                  />
                </div>

                {/* Course Selection */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-2">
                    <BookOpen className="h-3 w-3" /> Landing Asociada
                  </Label>
                  <div className="border border-border/50 rounded-xl p-2 bg-secondary/5">
                    <ScrollArea className="h-[180px]">
                      <div className="space-y-1.5 pr-2">
                        {coursesLoading ? (
                          <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
                        ) : courses.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center p-4">No tienes landings creadas aún.</p>
                        ) : courses.map(c => (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCourseId(c.id)}
                            className={cn(
                              "p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between",
                              selectedCourseId === c.id
                                ? "bg-primary/10 border-primary"
                                : "bg-white border-border/50 hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={cn("w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 transition-all", selectedCourseId === c.id ? "border-primary bg-primary" : "border-muted-foreground/30 bg-transparent")} />
                              <span className="font-bold text-sm truncate">{c.title}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] h-5 py-0 flex-shrink-0">
                              {c.type === 'funnel' ? 'Funnel' : 'Landing Page'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                {/* Target Audience */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Público Objetivo</Label>
                  <Textarea
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value)}
                    placeholder="Ej: Emprendedores digitales principiantes que quieren escalar su negocio..."
                    className="h-20 rounded-xl bg-secondary/10 border-border/50 px-4 py-3 text-sm font-medium"
                  />
                  {/* Quick audience chips */}
                  <div className="flex flex-wrap gap-2 mt-2 min-h-[28px] items-center">
                    {isGeneratingSegments ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Analizando perfiles ideales...
                      </span>
                    ) : (
                      strategicSegments.slice(0, 6).map(seg => (
                        <Badge
                          key={seg.id}
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary hover:text-white transition-colors h-7 px-3 rounded-lg text-[9px] font-bold"
                          onClick={() => setTargetAudience(seg.label + ': ' + seg.desc)}
                        >
                          {seg.label}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Campaign Mission */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Misión de la Campaña</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {CAMPAIGN_MISSIONS.map(m => {
                      const Icon = m.icon;
                      const isSelected = campaignMission === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setCampaignMission(m.id as any)}
                          className={cn(
                            "p-4 rounded-xl border-2 transition-all cursor-pointer text-center",
                            isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-primary/30"
                          )}
                        >
                          <Icon className={cn("h-5 w-5 mx-auto mb-1.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                          <p className="text-xs font-bold">{m.label}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{m.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Redes Sociales Objetivo */}
                <div className="space-y-3 border-2 border-primary/20 bg-primary/5 rounded-2xl p-5">
                  <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                    <Megaphone className="h-4 w-4" /> Redes Sociales Objetivo
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {PLATFORM_DEFS.map(({ id, label, Icon, color }) => {
                      const qty = videosPerPlatform[id] ?? 0;
                      const active = qty > 0;
                      return (
                        <div
                          key={id}
                          className={cn(
                            'relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all select-none',
                            active
                              ? 'border-primary bg-white shadow-sm'
                              : 'border-border/40 bg-white/60 opacity-60 hover:opacity-90 hover:border-primary/30'
                          )}
                          onClick={() => {
                            const defaultQty = id === 'instagram' ? 3 : id === 'tiktok' ? 2 : 1;
                            setVideosPerPlatform(prev => ({ ...prev, [id]: active ? 0 : defaultQty }));
                          }}
                        >
                          {active ? (
                            <CheckCircle2 className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Circle className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-border" />
                          )}
                          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white bg-gradient-to-br', color)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="text-[11px] font-bold text-center leading-tight">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-primary/70 font-medium">Clic para activar o desactivar la red en tu campaña.</p>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedCourseId || !campaignTitle}
                  className="w-full h-14 rounded-xl font-bold text-lg"
                >
                  Siguiente: Diseñar Estrategia <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════ STEP 2: STRATEGY AI ═══════════════════ */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <Card>
              <CardHeader className="bg-primary/5 p-8">
                <CardTitle className="text-xl flex items-center gap-3">
                  <BrainCircuit className="h-5 w-5 text-accent" /> 2. Diseño del Embudo con IA
                </CardTitle>
                <CardDescription>
                  La IA diseñará un cronograma con fases psicológicas (Awareness → Autoridad → Prueba Social → Venta → Urgencia).
                  Después, cada video se generará con el contexto de su fase.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {/* Strategy Preset */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Modelo de Lanzamiento</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {STRATEGY_PRESETS.map(preset => {
                      const Icon = preset.icon;
                      const isSelected = strategy === preset.id;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => {
                            setStrategy(preset.id);
                            setDuration(preset.duration);
                          }}
                          className={cn(
                            "p-4 rounded-xl border-2 transition-all cursor-pointer",
                            isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-primary/30"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                            <span className="font-bold text-sm">{preset.label}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-medium">{preset.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Duration */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Duración (Días)</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        value={duration}
                        onChange={e => setDuration(parseInt(e.target.value) || 1)}
                        className="bg-secondary/10 border-border/50 px-4 font-black text-xl w-28"
                        min={1}
                        max={30}
                      />
                      <p className={cn(
                        "text-[10px] font-bold uppercase",
                        duration === recommendedDuration ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {duration === recommendedDuration ? "✓ Óptima para esta misión" : `Sugerida: ${recommendedDuration} días`}
                      </p>
                    </div>
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Fecha de Lanzamiento (Día 1)</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="bg-secondary/10 border-border/50 px-4 font-bold"
                    />
                  </div>
                </div>

                {/* Briefing Summary */}
                <div className="p-5 rounded-xl bg-muted border border-border space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Resumen del Briefing</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-white rounded-lg border border-border/50">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Producto</p>
                      <p className="text-xs font-bold text-foreground truncate mt-0.5">{selectedCourse?.title || '—'}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-border/50">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Misión</p>
                      <p className="text-xs font-bold text-foreground capitalize mt-0.5">{campaignMission}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-border/50">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Estrategia</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">{STRATEGY_PRESETS.find(p => p.id === strategy)?.label}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-border/50">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Duración</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">{duration} días</p>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGeneratePlan}
                  disabled={isGenerating}
                  className="w-full h-16 rounded-xl font-bold text-xl bg-foreground"
                >
                  {isGenerating ? <Loader2 className="animate-spin mr-3 h-7 w-7" /> : <Sparkles className="mr-3 h-7 w-7 text-accent" />}
                  {isGenerating ? 'Diseñando embudo...' : 'Generar Plan Estratégico con IA'}
                </Button>

                {/* Show coordination plan if generated */}
                {coordinationPlan && (
                  <div className="space-y-6 pt-6 border-t border-border animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">Plan Estratégico Generado</h3>
                        <p className="text-xs text-muted-foreground font-medium">Revisa y ajusta el cronograma antes de producir los videos.</p>
                      </div>
                    </div>

                    {/* Strategy Logic */}
                    <div className="bg-muted p-6 rounded-xl border border-border">
                      <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-accent" /> Lógica del Embudo
                      </h4>
                      <p className="text-muted-foreground leading-relaxed italic font-medium text-sm">"{coordinationPlan.logic}"</p>
                    </div>

                    {/* Timeline Editor */}
                    <TimelineEditor
                      events={coordinationPlan.timeline as any}
                      onChange={(timeline) => setCoordinationPlan({ ...coordinationPlan, timeline: timeline as any })}
                      allowAdd={false}
                      allowDelete={false}
                    />

                    {/* Phase Summary */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-amber-800">Flujo "Estrategia Primero"</p>
                          <p className="text-[11px] text-amber-700 mt-1">
                            Al avanzar, se crearán <strong>{coordinationPlan.timeline.length} videos</strong> — cada uno contextualizado con la fase del embudo
                            (ej: un video del Día 1 tendrá tono de "Concientización", uno del Día {Math.max(...coordinationPlan.timeline.map(e => e.day))} será de "Urgencia/Cierre").
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => setStep(3)}
                      className="w-full h-14 rounded-xl font-bold text-lg"
                    >
                      Siguiente: Producir Videos Contextualizados <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════ STEP 3: DIRECTED PRODUCTION & TIMELINE ═══════════════════ */}
        {step === 3 && coordinationPlan && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <Card className="rounded-lg bg-white overflow-hidden">
              <CardHeader className="bg-success p-10 text-white relative">
                <TrendingUp className="absolute right-10 top-10 h-20 w-20 opacity-10" />
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-3xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30"><Calendar className="h-8 w-8" /></div>
                  <div>
                    <CardTitle className="text-3xl font-bold">Cronograma Flexible</CardTitle>
                    <CardDescription className="text-success/15 text-base">Ajusta el orden de emisión de tus piezas.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-10 space-y-10">
                <div className="bg-muted p-8 rounded-lg border border-border">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-accent" /> Lógica de la Campaña</h4>
                  <p className="text-muted-foreground leading-relaxed italic font-medium">"{coordinationPlan.logic}"</p>
                </div>

                <TimelineEditor
                  events={coordinationPlan.timeline as any}
                  onChange={(timeline) => setCoordinationPlan({ ...coordinationPlan, timeline: timeline as any })}
                  allowAdd={false}
                  allowDelete={false}
                />

                <div className="pt-10 border-t flex flex-col gap-6">
                  <Button onClick={handleFinalPublish} disabled={isProducing} className="w-full h-20 rounded-lg text-2xl font-bold bg-primary">
                    {isProducing ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <Rocket className="mr-3 h-8 w-8 text-accent" />}
                    Confirmar y Activar Lanzamiento (Generar Guiones)
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
