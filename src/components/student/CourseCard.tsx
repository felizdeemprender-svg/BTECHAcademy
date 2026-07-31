
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, PlayCircle, Clock, AlertCircle, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  variant: 'list' | 'grid';
  courseId: string;
  title: string;
  thumbnail?: string;
  status: string;
  progressPercent: number;
  completedModulesCount: number;
  totalModules: number;
  duration?: string;
  isApproved?: boolean;
}

export function StudentCourseCard({
  variant,
  courseId,
  title,
  thumbnail,
  status,
  progressPercent,
  completedModulesCount,
  totalModules,
  duration,
  isApproved = true
}: CourseCardProps) {
  const isFinished = progressPercent >= 100;
  const isActive = status === 'active' && isApproved;
  const defaultImage = `https://loremflickr.com/600/400/education,course?lock=${courseId}`;

  if (variant === 'list') {
    return (
      <Card className="border-none shadow-lg rounded-3xl bg-white overflow-hidden group transition-all">
        <div className="p-4 md:p-6 flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6">
          <div className="flex items-center gap-4 flex-1 min-w-0 w-full lg:w-auto">
            <div className="w-12 h-12 md:w-14 md:h-14 relative rounded-2xl overflow-hidden shrink-0 border-2 border-white shadow-md">
              <Image 
                src={thumbnail || defaultImage} 
                alt={title} 
                fill 
                className="object-cover" 
                unoptimized={!!thumbnail} 
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base md:text-lg text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="text-[10px] md:text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className={cn("h-3 w-3", isFinished ? "text-emerald-500" : "text-accent")} /> 
                {isFinished ? 'Programa Completado' : `Acceso: ${status === 'active' ? 'Autorizado' : 'Pendiente'}`}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-8 shrink-0 w-full lg:w-auto">
            <div className="w-full sm:w-48 space-y-1.5 md:space-y-2">
              <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold uppercase text-slate-400">
                <span>Progreso</span>
                <span className="text-primary">{completedModulesCount} / {totalModules} módulos</span>
              </div>
              <Progress value={progressPercent} className="h-1.5 bg-secondary" />
            </div>
            
            <Link href={`/courses/${courseId}`} className="w-full sm:w-auto">
              <Button className={cn(
                "w-full sm:w-auto rounded-xl font-bold h-10 md:h-11 px-6 shadow-md gap-2", 
                isFinished ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary"
              )}>
                {isFinished ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                {isFinished ? 'Ver Finalizado' : 'Continuar'}
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="group border-none shadow-lg transition-all duration-500 overflow-hidden flex flex-col rounded-3xl bg-white">
      <div className="relative aspect-video overflow-hidden">
        <Image 
          src={thumbnail || defaultImage} 
          alt={title} 
          fill 
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-110 transition-transform duration-700"
          unoptimized={!!thumbnail}
        />
        <div className="absolute top-4 left-4">
          <Badge className={cn(
            "font-bold border-none shadow-md",
            isActive ? "bg-green-500 text-white" : "bg-orange-500 text-white"
          )}>
            {isActive ? <CheckCircle2 className="h-3 w-3 mr-1" /> : isApproved ? <AlertCircle className="h-3 w-3 mr-1" /> : <ShieldAlert className="h-3 w-3 mr-1" />}
            {isActive ? 'Acceso Activo' : !isApproved ? 'En Auditoría' : 'Acceso Suspendido'}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-5 md:p-6 flex-1 space-y-4">
        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {duration || '0'}h Estimadas</span>
          <span>{isActive ? 'En curso' : 'Restringido'}</span>
        </div>
        
        <h3 className="text-lg md:text-xl font-headline font-bold text-primary leading-tight line-clamp-2 min-h-[3.5rem]">
          {title}
        </h3>

        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-end mb-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Tu Progreso</span>
            <span className="text-xs font-bold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-secondary" />
        </div>
      </CardContent>

      <CardFooter className="p-5 md:p-6 pt-0">
        {isActive ? (
          <Link href={`/courses/${courseId}`} className="w-full">
            <Button className="w-full h-11 md:h-12 rounded-xl font-bold bg-primary shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group-hover:bg-primary/90">
              <PlayCircle className="h-4 w-4" /> Continuar Aprendiendo
            </Button>
          </Link>
        ) : (
          <Button disabled className="w-full h-11 md:h-12 rounded-xl font-bold bg-muted text-muted-foreground">
            {!isApproved ? 'Pendiente de Autorización' : 'Acceso No Disponible'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
