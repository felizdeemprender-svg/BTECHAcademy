
'use client';

import { 
  Play, 
  CheckCircle2, 
  Lock, 
  ChevronRight, 
  Clock,
  BookOpen,
  Layout
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface CourseNavigationProps {
  modules: any[];
  activeModuleIndex: number;
  onSelectModule: (idx: number) => void;
  completedModuleIds: string[];
  courseTitle: string;
  progressPercent: number;
  primaryColor?: string;
}

export function CourseNavigation({
  modules,
  activeModuleIndex,
  onSelectModule,
  completedModuleIds,
  courseTitle,
  progressPercent,
  primaryColor = '#3B2D86'
}: CourseNavigationProps) {
  return (
    <div className="bg-white rounded-lg border flex flex-col h-full overflow-hidden">
      {/* Header with Progress */}
      <div className="p-6 border-b space-y-4 bg-secondary/10">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-primary">
                <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-primary truncate leading-tight">{courseTitle}</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Contenido del Curso</p>
            </div>
        </div>
        
        <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
                <span>Tu Progreso</span>
                <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5 rounded-full bg-white" style={{'--progress-foreground': primaryColor} as any} />
        </div>
      </div>

      {/* Module List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {modules.map((module, idx) => {
          const isActive = idx === activeModuleIndex;
          const isCompleted = completedModuleIds.includes(module.id);
          
          return (
            <button
              key={module.id}
              onClick={() => onSelectModule(idx)}
              className={cn(
                "w-full text-left p-4 rounded-2xl transition-all group relative",
                isActive 
                  ? "bg-primary text-white shadow-lg ring-4 ring-primary/10" 
                  : "hover:bg-secondary/20 text-muted-foreground"
              )}
              style={isActive ? { backgroundColor: primaryColor } : {}}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  isActive ? "bg-white/20 text-white" : "bg-secondary/50 text-muted-foreground group-hover:text-primary"
                )}>
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Play className={cn("h-4 w-4", isActive && "fill-white")} />}
                </div>
                
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Módulo {idx + 1}</p>
                  <p className={cn(
                    "text-xs font-bold truncate leading-snug",
                    isActive ? "text-white" : "text-foreground"
                  )}>
                    {module.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 opacity-50">
                    <Clock className="h-3 w-3" />
                    <span className="text-[9px] font-bold uppercase">{module.duration || '15 min'}</span>
                  </div>
                </div>

                <ChevronRight className={cn(
                    "h-4 w-4 mt-4 transition-transform",
                    isActive ? "text-white/50 translate-x-1" : "text-border group-hover:text-primary group-hover:translate-x-1"
                )} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-secondary/5 border-t">
        <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-dashed">
            <Layout className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Actualizado 2024</span>
        </div>
      </div>
    </div>
  );
}
