'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ArrowRight, Megaphone, Loader2 } from 'lucide-react';
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

export function CampaignGenerator({
  step,
  selectedCourseId,
  setSelectedCourseId,
  pageTitle,
  setPageTitle,
  courses,
  allTags,
  isGenerating,
  onGenerate
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
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{c.title}</span>
                        {c.productType === 'followup' && (
                          <Badge className="text-[9px] h-4 bg-primary/20 text-primary hover:bg-primary/30 py-0 border-none">Mentoría Grupal</Badge>
                        )}
                      </div>
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
                <Megaphone className="h-5 w-5 text-accent" /> 
                Datos de la Campaña
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 flex-1 space-y-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Nombre de la Campaña
                </Label>
                <Input 
                  value={pageTitle} 
                  onChange={e => setPageTitle(e.target.value)} 
                  placeholder="Ej: Lanzamiento Masterclass IA" 
                  className="bg-secondary/10 border-none px-6 font-bold w-full" 
                  size="xl" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                  Curso Asociado
                </Label>
                <p className="text-sm font-bold text-foreground">
                  {courses?.find(c => c.id === selectedCourseId)?.title || 'Seleccioná el programa al que se asocia la campaña.'}
                </p>
              </div>
            </CardContent>
            <CardFooter className="p-8 pt-0">
              <Button 
                onClick={onGenerate} 
                disabled={!selectedCourseId || !pageTitle || isGenerating} 
                className="w-full h-14 rounded-2xl font-bold"
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ArrowRight className="ml-2 h-5 w-5" />
                )}
                {isGenerating ? 'Creando campaña...' : 'Crear Campaña y Editar'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
