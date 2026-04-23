
import Link from 'next/link';
import { UserCircle, Target, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FollowUpCardProps {
  id: string;
  title: string;
  goal: string;
  consumedSessions: number;
  totalSessions: number;
  status: 'active' | string;
}

export function StudentFollowUpCard({
  id,
  title,
  goal,
  consumedSessions,
  totalSessions,
  status
}: FollowUpCardProps) {
  const isActive = status === 'active';

  return (
    <Card className="border-none shadow-lg rounded-3xl bg-white overflow-hidden group hover:shadow-xl transition-all">
      <div className="p-5 md:p-6 flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4 flex-1 min-w-0 w-full lg:w-auto">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center font-bold border shrink-0">
            <UserCircle className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base md:text-lg text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Target className="h-3 w-3" /> Objetivo: {goal}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between lg:justify-end gap-6 md:gap-8 shrink-0 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0">
          <div className="flex items-center gap-6 md:gap-8">
            <div className="text-center">
              <p className="text-xl md:text-2xl font-black text-primary leading-none">
                {consumedSessions} / {totalSessions}
              </p>
              <p className="text-[8px] font-bold uppercase text-slate-400 mt-1">Sesiones</p>
            </div>
            
            <div className="text-center">
              <Badge className={cn(
                "px-2 py-0.5 rounded-full text-[8px] uppercase font-black border-none", 
                isActive ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
              )}>
                {isActive ? 'En Curso' : 'Pausado'}
              </Badge>
              <p className="text-[8px] font-bold uppercase text-slate-400 mt-1">Estado</p>
            </div>
          </div>
          
          <Link href={`/seguimientos/${id}`}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl h-10 w-10 md:h-11 md:w-11 text-primary hover:bg-primary/5 border lg:border-none"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
