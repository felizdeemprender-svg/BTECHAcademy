'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Plus,
  Edit,
  Trash2,
  Eye,
  Clock,
  DollarSign,
  Target
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import Link from 'next/link';

export default function AdminCursosPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { firestore } = useFirebase();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    draft: 0,
    totalStudents: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    if (!user || !profile) {
      router.replace('/auth');
      return;
    }

    // Verificar permisos
    const hasPermission = profile.roles.includes('admin') || 
                         (profile.roles.includes('mentor') && 
                          profile.mentorPermissions?.includes('academic_management'));

    if (!hasPermission) {
      router.replace('/dashboard');
      return;
    }

    loadCourses();
  }, [user, profile, router]);

  const loadCourses = async () => {
    try {
      const coursesQuery = query(
        collection(firestore, 'courses'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(coursesQuery);
      const coursesData: any[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setCourses(coursesData);

      // Calcular estadísticas
      const statsData = {
        total: coursesData.length,
        active: coursesData.filter(c => c.status === 'published').length,
        draft: coursesData.filter(c => c.status === 'draft').length,
        totalStudents: coursesData.reduce((sum, c) => sum + (c.enrolledCount || 0), 0),
        totalRevenue: coursesData.reduce((sum, c) => sum + (c.revenue || 0), 0)
      };

      setStats(statsData);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este curso? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await deleteDoc(doc(firestore, 'courses', courseId));
      await loadCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const handleToggleStatus = async (courseId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    
    try {
      await updateDoc(doc(firestore, 'courses', courseId), {
        status: newStatus,
        updatedAt: new Date()
      });
      await loadCourses();
    } catch (error) {
      console.error('Error updating course status:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <div className="h-20 bg-border rounded-t-lg"></div>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-border rounded"></div>
                  <div className="h-3 bg-border rounded w-3/4"></div>
                </div>
              </Card>
            ))}
          </div>
          <Card className="animate-pulse">
            <div className="h-96 bg-border rounded-lg"></div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Admin de Cursos</h1>
            <p className="text-muted-foreground">
              Gestiona todos los cursos de la plataforma
            </p>
          </div>
          <Link href="/courses/create">
            <Button className="h-12 px-6">
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Curso
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cursos</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} publicados, {stats.draft} borradores
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estudiantes Totales</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                En todos los cursos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Acumulado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Actividad</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Cursos activos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Courses List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Todos los Cursos
            </CardTitle>
            <CardDescription>
              Lista completa de cursos con opciones de gestión
            </CardDescription>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay cursos</h3>
                <p className="text-muted-foreground mb-4">
                  Comienza creando tu primer curso
                </p>
                <Link href="/courses/create">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primer Curso
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{course.title}</h3>
                          <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                            {course.status === 'published' ? 'Publicado' : 'Borrador'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {course.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {course.enrolledCount || 0} estudiantes
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {course.duration || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${course.price || 0}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link href={`/courses/${course.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/courses/edit/${course.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(course.id, course.status)}
                        >
                          {course.status === 'published' ? 'Archivar' : 'Publicar'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCourse(course.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
