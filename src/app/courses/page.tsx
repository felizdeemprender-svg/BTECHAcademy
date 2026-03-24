'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter,
  DollarSign,
  BookOpen,
  Award
} from 'lucide-react';
import { CourseCard } from '@/components/courses/course-card';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  duration: number;
  level: string;
  tags: string[];
  thumbnail: string;
  rating: number;
  students: number;
  tutor: {
    id: string;
    username: string;
    displayName: string;
    photo: string;
    subscription: {
      status: string;
      plan: string;
    };
    publicProfile: {
      enabled: boolean;
      showStats: boolean;
    };
  };
  pricing: {
    type: string;
    amount: number;
    currency: string;
  };
}

const categories = [
  'Todos',
  'Marketing',
  'Desarrollo',
  'Diseño',
  'Negocios',
  'Finanzas',
  'Tecnología',
  'Educación'
];

const levels = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'];

export default function CoursesPage() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedLevel, setSelectedLevel] = useState('Todos');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
        level: selectedLevel,
        price: priceFilter,
        sortBy: sortBy,
        search: searchTerm,
        limit: '12'
      });

      const response = await fetch(`/api/courses/marketplace?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los cursos. Intenta nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [searchTerm, selectedCategory, selectedLevel, priceFilter, sortBy]);

  const handleRequestInvitation = async (courseId: string) => {
    setRequestingId(courseId);
    
    try {
      // Simulación de API call
      setTimeout(() => {
        setRequestingId(null);
        toast({
          title: 'Solicitud Enviada',
          description: 'El tutor ha sido notificado. Recibirás una respuesta pronto.',
        });
      }, 2000);
    } catch (error) {
      setRequestingId(null);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo enviar la solicitud. Intenta nuevamente.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingHeader />
      
      {/* Search & Filter Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-[84px] z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-2xl w-full">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Buscar cursos, tutores..." 
                  className="pl-12 h-12 rounded-xl border-2"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Ordenar por:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded-lg border text-sm"
                >
                  <option value="newest">Más nuevos</option>
                  <option value="rating">Mejor calificados</option>
                  <option value="students">Más populares</option>
                  <option value="price_low">Precio: Menor a mayor</option>
                  <option value="price_high">Precio: Mayor a menor</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-64 space-y-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros
                  </h3>
                </div>

                {/* Price Filter */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Precio
                  </h4>
                  <div className="space-y-2">
                    {[
                      { value: 'all', label: 'Todos los precios' },
                      { value: 'free', label: 'Gratis' },
                      { value: 'paid', label: 'De pago' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="price"
                          value={option.value}
                          checked={priceFilter === option.value}
                          onChange={(e) => setPriceFilter(e.target.value as any)}
                          className="text-primary"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Categoría
                  </h4>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <label key={category} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          value={category}
                          checked={selectedCategory === category}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="text-primary"
                        />
                        <span className="text-sm">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Level Filter */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Nivel
                  </h4>
                  <div className="space-y-2">
                    {levels.map((level) => (
                      <label key={level} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="level"
                          value={level}
                          checked={selectedLevel === level}
                          onChange={(e) => setSelectedLevel(e.target.value)}
                          className="text-primary"
                        />
                        <span className="text-sm">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Courses Grid */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-primary">Catálogo de Cursos</h1>
                <p className="text-muted-foreground">
                  {courses.length} {courses.length === 1 ? 'curso encontrado' : 'cursos encontrados'}
                </p>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-80 bg-muted animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : (
              /* Courses Grid */
              courses.length === 0 ? (
                <div className="text-center py-20 bg-secondary/10 rounded-[3rem] border-2 border-dashed">
                  <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                    No se encontraron cursos
                  </h3>
                  <p className="text-muted-foreground">
                    Intenta ajustar los filtros o términos de búsqueda
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {courses.map((course) => (
                    <CourseCard 
                      key={course.id} 
                      course={course} 
                      onAction={async (id) => {
                        handleRequestInvitation(id);
                      }}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </main>
      
      <LandingFooter />
    </div>
  );
}
