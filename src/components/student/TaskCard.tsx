
import Link from 'next/link';
import { Zap, GraduationCap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  id: string;
  title: string;
  mentorName: string;
  status: 'pending' | 'completed' | string;
  score?: number;
}

export function StudentTaskCard({
  id,
  title,
  mentorName,
  status,
  score
}: TaskCardProps) {
  const isCompleted = status === 'completed';

  return (
    <Card className="border-none shadow-lg rounded-3xl bg-white overflow-hidden group transition-all">
      <div className="p-5 md:p-6 flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4 flex-1 min-w-0 w-full lg:w-auto">
          <div className={cn(
            "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0", 
            isCompleted ? "bg-emerald-500" : "bg-accent"
          )}>
            <Zap className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base md:text-lg text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
              <GraduationCap className="h-3 w-3" /> Mentor: {mentorName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between lg:justify-end gap-4 md:gap-8 shrink-0 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0">
          <div className="flex items-center gap-6 md:gap-8">
            <div className="text-center">
              <Badge className={cn(
                "px-2 py-0.5 rounded-full text-[8px] uppercase font-black border-none", 
                isCompleted ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
              )}>
                {isCompleted ? 'Finalizado' : 'Pendiente'}
              </Badge>
              <p className="text-[8px] font-bold uppercase text-slate-400 mt-1">Estado</p>
            </div>
            
            {isCompleted && score !== undefined && (
              <div className="text-center">
                <p className="text-lg md:text-xl font-black text-emerald-600 leading-none">
                  {score}%
                </p>
                <p className="text-[8px] font-bold uppercase text-slate-400 mt-1">Nota IA</p>
              </div>
            )}
          </div>
          
          <Link href="/tasks" className="flex-1 sm:flex-none">
            <Button 
              variant={isCompleted ? "outline" : "default"} 
              className="w-full sm:w-auto rounded-xl font-bold h-10 md:h-11 px-6 shadow-md"
            >
              {isCompleted ? 'Ver Feedback' : 'Responder'}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
