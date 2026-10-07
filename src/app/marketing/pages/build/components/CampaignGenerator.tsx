'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BookOpen, ArrowRight, Megaphone, Loader2, Sparkles, Zap, Shield, TrendingUp as TrendingUpIcon, Instagram, Linkedin, Twitter, Youtube, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CAMPAIGN_PRESETS = [
  { id: 'lanzamiento_flash', label: 'Lanzamiento Flash', icon: Zap, mission: 'lanzamiento', platforms: { instagram: 3, tiktok: 2, linkedin: 0, youtube: 1 }, desc: '6 videos de alta conversión' },
  { id: 'autoridad_semanal', label: 'Autoridad Semanal', icon: Shield, mission: 'autoridad', platforms: { instagram: 1, tiktok: 1, linkedin: 2, youtube: 1 }, desc: '5 videos educativos' },
  { id: 'venta_directa', label: 'Venta Directa', icon: TrendingUpIcon, mission: 'venta', platforms: { instagram: 2, tiktok: 0, linkedin: 0, youtube: 1 }, desc: '3 videos directos al grano' }
];

export const CAMPAIGN_MISSIONS = [
  { id: 'venta', label: 'Venta' },
  { id: 'autoridad', label: 'Autoridad' },
  { id: 'lanzamiento', label: 'Lanzamiento' },
  { id: 'leads', label: 'Leads' }
] as const;

export type CampaignMission = typeof CAMPAIGN_MISSIONS[number]['id'];

export const CAMPAIGN_PLATFORMS = ['instagram', 'tiktok', 'linkedin', 'youtube', 'twitter'] as const;

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const PLATFORM_DEFS: { id: string; label: string; Icon: React.FC<{ className?: string }>; color: string }[] = [
  { id: 'instagram', label: 'Instagram',    Icon: Instagram, color: 'from-pink-500 to-purple-600' },
  { id: 'tiktok',   label: 'TikTok',       Icon: TikTokIcon, color: 'from-slate-700 to-slate-900' },
  { id: 'linkedin', label: 'LinkedIn',     Icon: Linkedin,  color: 'from-blue-600 to-blue-800' },
  { id: 'youtube',  label: 'YouTube',      Icon: Youtube,   color: 'from-red-500 to-red-700' },
  { id: 'twitter',  label: 'X / Twitter', Icon: Twitter,   color: 'from-slate-600 to-slate-900' },
];

export interface CampaignConfig {
  selectedCourseId: string | null;
  pageTitle: string;
  targetAudience: string;
  campaignMission: CampaignMission;
  videosPerPlatform: Record<string, number>;
}

interface CampaignGeneratorProps {
  step: number;
  config: CampaignConfig;
  updateConfig: (updates: Partial<CampaignConfig>) => void;
  mode?: string;
  courses: any[] | null;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function CampaignGenerator({
  step,
  config,
  updateConfig,
  mode,
  courses,
  isGenerating,
  onGenerate
}: CampaignGeneratorProps) {
  const [filterType, setFilterType] = useState<'all' | 'course' | 'followup'>('all');
  const [coordinationResult, setCoordinationResult] = useState<any>(null);

  const handleGenerate = async () => {
    const payload = {
      campaignTitle: config.pageTitle,
      strategyType: config.campaignMission,
      durationDays: 7,
      targetAudience: config.targetAudience,
      availableVideos: [], // TODO: fill with actual video IDs
      productData: {}
    };
    try {
      const res = await fetch('/api/ai/coordination-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setCoordinationResult(data);
    } catch (e) {
      console.error('Error generating coordination plan', e);
    }
  };

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    if (filterType === 'all') return courses;
    return courses.filter(c => c.productType === filterType || (!c.productType && filterType === 'course'));
  }, [courses, filterType]);

  return (
    <>
      {step === 1 && (
        <div className="flex flex-col space-y-6 animate-in fade-in">
          
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> 1. Nombre de la Campaña
            </Label>
            <Input 
              value={config.pageTitle} 
              onChange={e => updateConfig({ pageTitle: e.target.value })} 
              placeholder="Ej: Lanzamiento Masterclass IA" 
              className="bg-secondary/10 border-border/50 px-4 font-bold w-full h-12" 
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> 3. Programa Asociado
              </Label>
              <RadioGroup 
                defaultValue="all" 
                onValueChange={(v: any) => setFilterType(v)} 
                className="flex gap-4"
              >
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="cursor-pointer text-xs font-medium">Todos</Label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="course" id="course" />
                  <Label htmlFor="course" className="cursor-pointer text-xs font-medium">Cursos</Label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="followup" id="followup" />
                  <Label htmlFor="followup" className="cursor-pointer text-xs font-medium">Mentorías</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="border border-border/50 rounded-xl p-2 bg-secondary/5">
              <div className="max-h-[140px] overflow-y-auto pr-2 space-y-1.5">
                {filteredCourses.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center p-4">No hay programas en esta categoría.</p>
                )}
                {filteredCourses.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => updateConfig({ selectedCourseId: c.id })}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between",
                      config.selectedCourseId === c.id 
                        ? "bg-primary/10 border-primary" 
                        : "bg-white border-border/50 hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={cn("w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 transition-all", config.selectedCourseId === c.id ? "border-primary bg-primary" : "border-muted-foreground/30 bg-transparent")}></div>
                      <span className="font-bold text-sm truncate">{c.title}</span>
                    </div>
                    {c.productType === 'followup' ? (
                      <Badge className="text-[10px] h-5 bg-primary/20 text-primary py-0 border-none flex-shrink-0">Mentoría</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 py-0 text-muted-foreground flex-shrink-0">Curso</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-border/50">
            <Label className="text-xs font-black uppercase text-primary flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Plantillas Inteligentes (Presets)
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CAMPAIGN_PRESETS.map(preset => {
                const Icon = preset.icon;
                return (
                  <div 
                    key={preset.id}
                    onClick={() => {
                      updateConfig({
                        campaignMission: preset.mission as CampaignMission,
                        videosPerPlatform: preset.platforms
                      });
                    }}
                    className="p-3 rounded-xl border border-border/50 bg-secondary/5 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                      <Icon className="h-4 w-4 text-primary" /> {preset.label}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium">{preset.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">4. Target Audience</Label>
              <Input 
                value={config.targetAudience} 
                onChange={e => updateConfig({ targetAudience: e.target.value })} 
                placeholder="Ej: Emprendedores digitales principiantes..." 
                className="bg-secondary/10 border-border/50 font-medium" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">5. Estrategia</Label>
              <RadioGroup 
                value={config.campaignMission} 
                onValueChange={(v: any) => updateConfig({ campaignMission: v })} 
                className="grid grid-cols-2 gap-2"
              >
                {CAMPAIGN_MISSIONS.map(m => (
                  <div key={m.id} className="flex items-center space-x-1.5">
                    <RadioGroupItem value={m.id} id={`mission-${m.id}`} />
                    <Label htmlFor={`mission-${m.id}`} className="cursor-pointer text-[11px] font-medium whitespace-nowrap">{m.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>


          {/* SELECTOR DE REDES SOCIALES — siempre visible, posición 2 */}
          <div className="space-y-3 border border-primary/20 bg-primary/5 rounded-2xl p-4">
            <Label className="text-xs font-black uppercase text-primary flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> 2. Redes Sociales Objetivo
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {PLATFORM_DEFS.map(({ id, label, Icon, color }) => {
                const qty = config.videosPerPlatform?.[id] ?? 0;
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
                      updateConfig({ videosPerPlatform: { ...config.videosPerPlatform, [id]: active ? 0 : defaultQty } });
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
                    {active && (
                      <div className="flex items-center justify-center mt-1">
                        <span className="text-xs font-black text-primary">{qty} piezas</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-primary/70 font-medium">Clic para activar o desactivar la red en tu campaña.</p>
          </div>

            {/* IMPACT PREVIEW SUMMARY */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Resumen de Impacto</h4>
                  <p className="text-xs text-muted-foreground font-medium">Se generarán {Object.values(config.videosPerPlatform || {}).reduce((a, b) => a + b, 0)} videos en total.</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1">Costo Estimado</span>
                <Badge variant="default" className="bg-primary text-white hover:bg-primary text-sm px-3 py-1">
                  {Object.values(config.videosPerPlatform || {}).reduce((a, b) => a + b, 0) * 2} Créditos
                </Badge>
              </div>
            </div>

          <Button 
            onClick={handleGenerate} 
            disabled={!config.selectedCourseId || !config.pageTitle || isGenerating} 
            className="w-full h-14 rounded-xl font-bold mt-4"
          >
            {isGenerating ? (
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
            ) : (
              <ArrowRight className="mr-2 h-5 w-5" />
            )}
            {isGenerating ? 'Creando campaña...' : 'Crear Campaña y Editar'}
          </Button>
        </div>
        )}
        {coordinationResult && (
          <div className="mt-6 p-4 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 animate-in fade-in">
            <h3 className="text-lg font-semibold mb-2 text-foreground">Plan de Coordinación</h3>
            <pre className="text-sm whitespace-pre-wrap text-foreground">
              {JSON.stringify(coordinationResult, null, 2)}
            </pre>
          </div>
        )}
    </>
  );
}
