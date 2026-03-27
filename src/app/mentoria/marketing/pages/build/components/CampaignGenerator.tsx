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
  DollarSign
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
  price: number;
  setPrice: (price: number) => void;
  courses: any[] | null;
  collections: any[] | null;
  allTags: any[] | null;
  selectedCourse: any;
  dynamicProfiles: any[];
  isGenerating: boolean;
  generationProgress: { current: number, total: number, label: string } | null;
  onGenerate: () => void;
  onStepChange: (step: number) => void;
}

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
  price,
  setPrice,
  courses,
  collections,
  allTags,
  selectedCourse,
  dynamicProfiles,
  isGenerating,
  generationProgress,
  onGenerate,
  onStepChange
}: CampaignGeneratorProps) {
  return (
    <>
      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col">
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

          <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden flex flex-col">
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
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden max-w-3xl mx-auto">
          <CardHeader className="bg-primary/5 p-10">
            <CardTitle className="text-2xl font-bold">Parámetros de la Campaña</CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-10">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">
                  Título del Pack (Interno)
                </Label>
                <Input 
                  value={pageTitle} 
                  onChange={e => setPageTitle(e.target.value)} 
                  placeholder="Ej: Lanzamiento Masterclass IA" 
                  className="h-14 rounded-2xl bg-secondary/10 border-none px-6 font-bold" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-accent">
                  Precio del Programa
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-accent" />
                  <Input 
                    type="number" 
                    value={price} 
                    onChange={e => setPrice(parseFloat(e.target.value) || 0)} 
                    className="h-14 rounded-2xl bg-accent/5 border-none pl-12 font-black text-xl text-accent" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black uppercase text-slate-400">
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
                  className="min-h-[120px] rounded-[2rem] bg-secondary/10 border-none p-6 text-base font-medium leading-relaxed" 
                />
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                  <Lightbulb className="h-3 w-3 text-amber-500" /> 
                  Perfiles Relacionados al Curso:
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dynamicProfiles.map((seg: any) => (
                    <button 
                      key={seg.id}
                      type="button"
                      onClick={() => setTargetAudience(seg.label + ': ' + seg.desc)}
                      className="p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-primary/20 hover:bg-slate-50 transition-all text-left group"
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
              {generationProgress && (
                <div className="space-y-2 bg-secondary/10 p-5 rounded-[1.5rem] border border-secondary/20 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>{generationProgress.label}</span>
                    <span className="text-primary">
                      {Math.round((generationProgress.current / (generationProgress.total || 1)) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(generationProgress.current / (generationProgress.total || 1)) * 100} 
                    className="h-2 bg-slate-200" 
                  />
                </div>
              )}
              <Button 
                onClick={onGenerate} 
                disabled={isGenerating || !targetAudience} 
                className="w-full h-20 rounded-[2rem] font-bold text-2xl shadow-3xl bg-slate-900 group transition-all"
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
