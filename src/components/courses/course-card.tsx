
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Clock, 
  Star, 
  Users, 
  UserPlus, 
  Loader2, 
  PlayCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface CourseCardProps {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    price: number;
    duration: number;
    rating: number;
    students: number;
    thumbnail: string;
    tags: string[];
    salesPageId?: string | null;
    tutor?: {
      id: string;
      username: string;
      displayName: string;
      photo: string;
      subscription?: {
        status: string;
      };
    };
  };
  showTutor?: boolean;
  onAction?: (courseId: string) => Promise<void>;
}

export function CourseCard({ course, showTutor = true, onAction }: CourseCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!onAction) return;

    setLoading(true);
    try {
      await onAction(course.id);
    } catch (error) {
      console.error('Action error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="group border-none shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col rounded-2xl bg-white">
      <div className="relative aspect-video overflow-hidden">
        <Image 
          src={course.thumbnail} 
          alt={course.title} 
          fill 
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-110 transition-transform duration-700" 
          unoptimized 
        />
        <div className="absolute top-4 left-4 flex flex-wrap gap-1 max-w-[80%]">
          {course.tags?.slice(0, 2).map((tag, idx) => (
            <Badge key={idx} className="bg-white/90 text-primary hover:bg-white backdrop-blur-md shadow-sm border-none font-bold text-[10px] py-0.5 h-5">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="absolute top-4 right-4">
          <Badge className={course.price === 0 ? "bg-green-500 text-white" : "bg-blue-500 text-white shadow-lg"}>
            {course.price === 0 ? 'Gratis' : `$${course.price}`}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-6 flex-1 space-y-4">
        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> 
            {course.duration}h
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" /> 
            {course.rating}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> 
            {course.students}
          </span>
        </div>
        
        <h3 className="text-xl font-headline font-bold text-primary group-hover:text-accent transition-colors leading-tight line-clamp-2">
          {course.title}
        </h3>
        
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {course.description}
        </p>
        
        {showTutor && course.tutor && (
          <div className="flex items-center gap-3 pt-2">
            <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-inner">
              <Image 
                src={course.tutor.photo} 
                alt={course.tutor.displayName}
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-primary truncate">
                {course.tutor.displayName}
              </p>
              <Link 
                href={`/tutor/${course.tutor.username}`}
                className="text-[10px] font-bold text-accent uppercase tracking-wider hover:underline"
              >
                Perfil
              </Link>
            </div>
            {course.tutor.subscription?.status === 'active' && (
              <Badge className="text-[9px] bg-emerald-50 text-emerald-600 border-emerald-100 font-bold">
                Verificado
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      
    <CardFooter className="p-6 pt-0 gap-3">
        <Link href={course.salesPageId ? `/v/${course.salesPageId}` : `/courses/${course.id}`} className="flex-1">
          <Button variant="outline" className="w-full rounded-xl border-2 h-12 font-bold transition-all hover:bg-primary/5">
            {course.salesPageId ? 'Ver Landing de Venta' : 'Ver Detalles'}
          </Button>
        </Link>
        
        {onAction && (
          <Button 
            onClick={handleAction}
            disabled={loading}
            className="flex-1 rounded-xl h-12 font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Matricular
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
