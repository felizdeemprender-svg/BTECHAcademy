'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  Layout, 
  Loader2, 
  Lightbulb,
  Zap,
  UserCheck,
  Rocket,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CampaignGeneratorProps {
  step: number;
  selectedCourseId: string | null;
  setSelectedCourseId: (id: string | null) => void;
  selectedCollectionId: string | null;
  setSelectedCollectionId: (id: string | null) => void;
  pageTitle: string;
  setPageTitle: (title: string) => void;
  targetAudience: string;
  setTargetAudience: (audience: string) => void;
  campaignMission: 'venta' | 'autoridad' | 'lanzamiento' | 'leads';
  setCampaignMission: (mission: 'venta' | 'autoridad' | 'lanzamiento' | 'leads') => void;
  courses: any[] | null;
  collections: any[] | null;
  allTags: any[] | null;
  selectedCourse: any;
  dynamicProfiles: any[];
  templateDirectives: string;
  setTemplateDirectives: (directives: string) => void;
  isGenerating: boolean;
  generationProgress: { current: number, total: number, label: string } | null;
  onGenerate: () => void;
  onStepChange: (step: number) => void;
}

const MISSIONS = [
  { id: 'venta', label: 'Venta Directa', icon: Zap, color: 'text-warn', bg: 'bg-warn/10', border: 'border-warn/20', desc: 'Urgencia, ROI y escasez.' },
  { id: 'autoridad', label: 'Autoridad / Branding', icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', desc: 'Confianza y liderazgo.' },
  { id: 'lanzamiento', label: 'Lanzamiento', icon: Rocket, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', desc: 'Hype y bonos exclusivos.' },
  { id: 'leads', label: 'Captación Leads', icon: Target, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', desc: 'Valor y transformación.' },
] as const;

export function CampaignGenerator({
  step,
  selectedCourseId,
  setSelectedCourseId,
  selectedCollectionId,
  setSelectedCollectionId,
  pageTitle,
  setPageTitle,
  targetAudience,
  setTargetAudience,
  campaignMission,
  setCampaignMission,
  courses,
  collections,
  allTags,
  selectedCourse,
  dynamicProfiles,
  templateDirectives,
  setTemplateDirectives,
  isGenerating,
  generationProgress,
  onGenerate,
  onStepChange
}: CampaignGeneratorProps) {
  return (
    <>
      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
          <Card className="flex flex-col">
            <CardHeader className="bg-primary/5 p-8">
              <CardTitle className="text-xl flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" /> 
                Programa Académico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 flex-1">
              <div className="grid gap-3">
                {courses?.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => setSelectedCourseId(c.id)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all cursor-pointer",
                      selectedCourseId === c.id 
                        ? "bg-primary/5 border-primary shadow-sm" 
                        : "bg-white border-border/50 hover:border-primary/20"
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-sm">{c.title}</span>
                      <div className="flex flex-wrap gap-1">
                        {c.tagIds?.map((tid: string) => {
                          const tag = allTags?.find(t => t.id === tid);
                          return tag ? (
                            <Badge key={tid} variant="outline" className="text-[8px] h-4 py-0 border-primary/20 text-primary/60">
                              {tag.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="bg-accent/5 p-8">
              <CardTitle className="text-xl flex items-center gap-3">
                <Layout className="h-5 w-5 text-accent" /> 
                Blueprint de Identidad
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 flex-1">
              <div className="grid gap-3">
                {collections?.map(coll => (
                  <div 
                    key={coll.id} 
                    onClick={() => setSelectedCollectionId(coll.id)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all cursor-pointer",
                      selectedCollectionId === coll.id 
                        ? "bg-accent/5 border-accent shadow-sm" 
                        : "bg-white border-border/50 hover:border-accent/20"
                    )}
                  >
                    <p className="font-bold text-sm">{coll.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                      "{coll.directives}"
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="p-8 pt-0">
              <Button 
                onClick={() => onStepChange(2)} 
                disabled={!selectedCourseId || !selectedCollectionId} 
                className="w-full h-14 rounded-2xl font-bold"
              >
                Configurar Enfoque <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {step === 2 && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="bg-primary/5 p-10">
            <CardTitle className="text-2xl font-bold">Configuración Estratégica de Campaign Brain</CardTitle>
            <p className="text-sm text-muted-foreground">Define el objetivo y el tono que la IA usará para persuadir a tu audiencia.</p>
          </CardHeader>
          <CardContent className="p-10 space-y-12">
            
            {/* SELECTOR DE MISIÓN */}
            <div className="space-y-6">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">
                Selecciona la Misión de esta Campaña
              </Label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {MISSIONS.map((m) => {
                  const Icon = m.icon;
                  const isActive = campaignMission === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setCampaignMission(m.id as any)}
                      className={cn(
                        "flex flex-col items-center text-center p-6 rounded-lg border-2 transition-all duration-300 gap-3 group",
                        isActive 
                          ? `${m.bg} ${m.border} shadow-lg scale-[1.02]` 
                          : "bg-white border-muted hover:border-border"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                        isActive ? "bg-white" : "bg-muted group-hover:bg-muted"
                      )}>
                        <Icon className={cn("h-6 w-6", m.color)} />
                      </div>
                      <div className="space-y-1">
                        <p className={cn("font-black text-xs uppercase transition-colors", isActive ? "text-foreground" : "text-muted-foreground")}>
                          {m.label}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-medium leading-tight">
                          {m.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 pt-6 border-t border-muted">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Título del Pack (Interno)
                </Label>
                <Input 
                  value={pageTitle} 
                  onChange={e => setPageTitle(e.target.value)} 
                  placeholder="Ej: Lanzamiento Masterclass IA" 
                  className="bg-secondary/10 border-none px-6 font-bold w-full" 
                 size="xl" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">
                    Segmentación Estratégica (Buyer Persona)
                  </Label>
                  <Badge variant="outline" className="text-[8px] font-bold text-accent border-accent/20 h-5 px-2">
                    Guía para la IA
                  </Badge>
                </div>
                <Textarea 
                  value={targetAudience} 
                  onChange={e => setTargetAudience(e.target.value)} 
                  placeholder="Ej: Médicos interesados en optimizar su consulta con IA o Programadores buscando especialización hard-skill..." 
                  className="min-h-[120px] rounded-lg bg-secondary/10 border-none p-6 text-base font-medium leading-relaxed" 
                />
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                  <Lightbulb className="h-3 w-3 text-warn" /> 
                  Perfiles Relacionados al Curso:
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dynamicProfiles.map((seg: any) => (
                    <button 
                      key={seg.id}
                      type="button"
                      onClick={() => setTargetAudience(seg.label + ': ' + seg.desc)}
                      className="p-4 rounded-2xl border-2 border-muted bg-white hover:border-primary/20 hover:bg-muted transition-all text-left group"
                    >
                      <p className="font-bold text-xs text-primary group-hover:text-accent">
                        {seg.label}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2">
                        {seg.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">
                    Directivas Estratégicas (Enfoque de Ventas)
                  </Label>
                  <Badge variant="outline" className="text-[8px] font-bold text-primary border-primary/20 h-5 px-2">
                    Cerebro de Marketing
                  </Badge>
                </div>
                <Textarea 
                  value={templateDirectives} 
                  onChange={e => setTemplateDirectives(e.target.value)} 
                  placeholder="Ej: Enfócate en la autoridad técnica del mentor, resalta el ROI del 300% en la primera campaña..." 
                  className="min-h-[120px] rounded-lg bg-secondary/10 border-none p-6 text-sm font-medium leading-relaxed" 
                />
                <p className="text-[9px] text-muted-foreground px-2">
                  * Este texto define el estilo de persuasión. Edítalo para corregir o mejorar el enfoque de la IA.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {generationProgress && (
                <div className="space-y-2 bg-secondary/10 p-5 rounded-[1.5rem] border border-secondary/20 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>{generationProgress.label}</span>
                    <span className="text-primary">
                      {Math.round((generationProgress.current / (generationProgress.total || 1)) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(generationProgress.current / (generationProgress.total || 1)) * 100} 
                    className="h-2 bg-border" 
                  />
                </div>
              )}
              <Button 
                onClick={onGenerate} 
                disabled={isGenerating || !targetAudience} 
                className="w-full h-20 rounded-lg font-bold text-2xl bg-foreground group transition-all"
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin mr-3 h-8 w-8" />
                ) : (
                  <Sparkles className="mr-3 h-8 w-8 text-accent group-hover:scale-110 transition-transform" />
                )}
                {isGenerating 
                  ? `Procesando Flujo ${Math.min((generationProgress?.current || 0) + 1, generationProgress?.total || 1)}...` 
                  : 'Lanzar Generación Triple IA'
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
