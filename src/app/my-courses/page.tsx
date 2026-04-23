'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Loader2, Library } from 'lucide-react';
import Link from 'next/link';

// Shared Student Components
import { StudentPageHeader } from '@/components/student/PageHeader';
import { StudentCourseCard } from '@/components/student/CourseCard';

// Hooks
import { useStudentEnrollments } from '@/hooks/student/useStudentEnrollments';

export default function MyCoursesPage() {
  const { enrollments, isLoading, isEmpty } = useStudentEnrollments();

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 md:space-y-12">
        <StudentPageHeader 
          icon={Library}
          category="Trayectoria Académica"
          title="Mis Cursos"
          description="Tu biblioteca de programas y progreso actual."
        />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 md:py-32 gap-4">
            <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary opacity-20" />
            <p className="text-muted-foreground font-medium animate-pulse text-sm md:text-base">Sincronizando tu progreso académico...</p>
          </div>
        ) : isEmpty ? (
          <div className="text-center py-16 md:py-32 bg-secondary/10 rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-muted-foreground/20 space-y-6 mx-2 md:mx-0">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-muted rounded-full flex items-center justify-center mx-auto opacity-30">
              <Library className="h-8 w-8 md:h-10 md:h-10" />
            </div>
            <div className="space-y-2 px-4">
              <h3 className="text-xl md:text-2xl font-bold text-foreground/60">Aún no estás inscrito en ningún curso</h3>
              <p className="text-sm md:text-base text-muted-foreground max-w-sm mx-auto">Explora nuestro catálogo y comienza tu evolución hoy mismo.</p>
            </div>
            <Link href="/courses">
              <Button className="rounded-xl font-bold h-11 md:h-12 px-8 shadow-lg">Explorar Catálogo</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 px-2 md:px-0">
            {enrollments.map((enroll) => {
              const course = enroll.courseData;
              const completedModulesCount = enroll.progress?.completedModules?.length || 0;
              const totalModules = course?.modulesCount || 1;
              const progressPercent = Math.min(100, Math.round((completedModulesCount / totalModules) * 100));
              const isApproved = course?.status === 'approved' || course?.status === 'published';

              return (
                <StudentCourseCard 
                  key={enroll.id}
                  variant="grid"
                  courseId={enroll.courseId}
                  title={course?.title || 'Curso'}
                  thumbnail={course?.thumbnail}
                  status={enroll.status}
                  progressPercent={progressPercent}
                  completedModulesCount={completedModulesCount}
                  totalModules={totalModules}
                  duration={course?.duration}
                  isApproved={isApproved}
                />
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
