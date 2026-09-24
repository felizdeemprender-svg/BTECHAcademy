'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  isGenerating,
  onGenerate
}: CampaignGeneratorProps) {
  const [filterType, setFilterType] = useState<'all' | 'course' | 'followup'>('all');

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
              value={pageTitle} 
              onChange={e => setPageTitle(e.target.value)} 
              placeholder="Ej: Lanzamiento Masterclass IA" 
              className="bg-secondary/10 border-border/50 px-4 font-bold w-full h-12" 
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> 2. Programa Asociado
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
              <div className="max-h-[240px] overflow-y-auto pr-2 space-y-1.5">
                {filteredCourses.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center p-4">No hay programas en esta categoría.</p>
                )}
                {filteredCourses.map(c => (
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
                      <div className={cn("w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 transition-all", selectedCourseId === c.id ? "border-primary bg-primary" : "border-muted-foreground/30 bg-transparent")}></div>
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

          <Button 
            onClick={onGenerate} 
            disabled={!selectedCourseId || !pageTitle || isGenerating} 
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
    </>
  );
}
