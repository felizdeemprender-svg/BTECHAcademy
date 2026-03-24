'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc, getDocs, or } from 'firebase/firestore';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Clock, CheckCircle2, AlertCircle, Library, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface EnrolledCourse {
  id: string;
  courseId: string;
  status: string;
  progress: {
    completedModules: string[];
  };
  courseData?: any;
}

export default function MyCoursesPage() {
  const { profile } = useAuth();
  const db = useFirestore();
  const [coursesWithData, setCoursesWithData] = useState<EnrolledCourse[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Consulta resiliente: Busca inscripciones por UID o por el email del perfil
  const enrollmentsQuery = useMemoFirebase(() => {
    if (!profile?.uid || !profile?.email) return null;
    return query(
      collection(db, 'enrollments'), 
      or(
        where('studentId', '==', profile.uid),
        where('inviteEmail', '==', profile.email)
      )
    );
  }, [db, profile?.uid, profile?.email]);

  const { data: enrollments, isLoading: enrollmentsLoading } = useCollection(enrollmentsQuery);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      if (!enrollments) {
        if (!enrollmentsLoading) setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        const joinedData = await Promise.all(
          enrollments.map(async (enroll) => {
            const courseRef = doc(db, 'courses', enroll.courseId);
            const courseSnap = await getDoc(courseRef);
            
            if (!courseSnap.exists()) return null;
            
            const courseData = courseSnap.data();
            
            let modulesCount = courseData.modulesCount;
            if (!modulesCount) {
              const modulesSnap = await getDocs(collection(db, 'courses', enroll.courseId, 'modules'));
              modulesCount = modulesSnap.size;
            }

            return {
              ...enroll,
              courseData: { ...courseData, modulesCount }
            } as EnrolledCourse;
          })
        );
        
        setCoursesWithData(joinedData.filter((d): d is EnrolledCourse => d !== null));
      } catch (error) {
        console.error("Error al cargar detalles de cursos:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchCourseDetails();
  }, [db, enrollments, enrollmentsLoading]);

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Library className="text-primary-foreground h-6 w-6" />
            </div>
            <div>
              <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Mis Cursos</h1>
              <p className="text-muted-foreground text-lg">Tu trayectoria académica y progreso actual.</p>
            </div>
          </div>
        </header>

        {(enrollmentsLoading || loadingData) ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
            <p className="text-muted-foreground font-medium animate-pulse">Sincronizando tu progreso académico...</p>
          </div>
        ) : coursesWithData.length === 0 ? (
          <div className="text-center py-32 bg-secondary/10 rounded-[3rem] border-2 border-dashed border-muted-foreground/20 space-y-6">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto opacity-30">
              <Library className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground/60">Aún no estás inscrito en ningún curso</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">Explora nuestro catálogo y comienza tu evolución hoy mismo.</p>
            </div>
            <Link href="/courses">
              <Button className="rounded-xl font-bold h-12 px-8 shadow-lg">Explorar Catálogo</Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {coursesWithData.map((enroll) => {
              const course = enroll.courseData;
              const completedModulesCount = enroll.progress?.completedModules?.length || 0;
              const totalModules = course?.modulesCount || 1;
              const progressPercent = Math.min(100, Math.round((completedModulesCount / totalModules) * 100));
              
              const isApproved = course?.status === 'approved';
              const isActive = enroll.status === 'active' && isApproved;

              return (
                <Card key={enroll.id} className="group border-none shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col rounded-3xl bg-white">
                  <div className="relative aspect-video overflow-hidden">
                    <Image 
                      src={`https://loremflickr.com/600/400/education,course?lock=${enroll.courseId}`} 
                      alt={course?.title || 'Curso'} 
                      fill 
                      sizes="400px"
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                      data-ai-hint="course cover"
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
                  
                  <CardContent className="p-6 flex-1 space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {course?.duration || '0'}h Estimadas</span>
                      <span>{isActive ? 'En curso' : 'Restringido'}</span>
                    </div>
                    
                    <h3 className="text-xl font-headline font-bold text-primary leading-tight line-clamp-2">
                      {course?.title}
                    </h3>

                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Tu Progreso</span>
                        <span className="text-xs font-bold text-primary">{progressPercent}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2 bg-secondary" />
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 pt-0">
                    {isActive ? (
                      <Link href={`/courses/${enroll.courseId}`} className="w-full">
                        <Button className="w-full h-12 rounded-xl font-bold bg-primary shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group-hover:bg-primary/90">
                          <Play className="h-4 w-4 fill-current" /> Continuar Aprendiendo
                        </Button>
                      </Link>
                    ) : (
                      <Button disabled className="w-full h-12 rounded-xl font-bold bg-muted text-muted-foreground">
                        {!isApproved ? 'Pendiente de Autorización' : 'Acceso No Disponible'}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
