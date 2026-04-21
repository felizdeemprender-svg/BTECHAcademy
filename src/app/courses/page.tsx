'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

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
    publicProfile?: {
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

// Se eliminan constantes estáticas para usar colecciones dinámicas de Firestore

export default function CoursesPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedLevel, setSelectedLevel] = useState('Todos');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [requestingId, setRequestingId] = useState<string | null>(null);

  // 1. Fetch Basic Collections
  const coursesQuery = useMemoFirebase(() => {
    return query(
      collection(db, 'courses'),
      where('isActive', '==', true)
      // Se elimina el filtro de publicListing para mostrar "Todos" los publicados con landing
    );
  }, [db]);
  const { data: rawCourses = [], isLoading: coursesLoading } = useCollection(coursesQuery);

  const finalCourses = useMemo(() => {
    return (rawCourses || []).filter(c => c.status === 'published' || c.status === 'approved');
  }, [rawCourses]);

  const salesPagesQuery = useMemoFirebase(() => {
    return query(collection(db, 'salesPages'), where('isActive', '==', true));
  }, [db]);
  const { data: salesPages = [], isLoading: salesLoading } = useCollection(salesPagesQuery);

  const mentorsQuery = useMemoFirebase(() => {
    // Usamos isMentor para una consulta más directa que suele requerir menos índices complejos
    return query(collection(db, 'users'), where('isMentor', '==', true), limit(100));
  }, [db]);
  const { data: mentors = [], isLoading: mentorsLoading } = useCollection(mentorsQuery);

  const plansQuery = useMemoFirebase(() => {
    return query(collection(db, 'subscriptionPlans'));
  }, [db]);
  const { data: subscriptionPlans = [], isLoading: plansLoading } = useCollection(plansQuery);

  const categoriesCollectionQuery = useMemoFirebase(() => {
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db]);
  const { data: categoriesData = [] } = useCollection(categoriesCollectionQuery);

  const levelsCollectionQuery = useMemoFirebase(() => {
    return query(collection(db, 'levels'), orderBy('order', 'asc'));
  }, [db]);
  const { data: levelsData = [] } = useCollection(levelsCollectionQuery);

  const categories = useMemo(() => ['Todos', ...Array.from(new Set((categoriesData || []).map(c => c.name)))], [categoriesData]);
  const levels = useMemo(() => ['Todos', ...Array.from(new Set((levelsData || []).map(l => l.name)))], [levelsData]);

  // 2. Compute Filtered & Enriched Marketplace Items
  const enrichedCourses = useMemo(() => {
    if (coursesLoading || salesLoading || mentorsLoading || plansLoading) return [];

    // Create maps for efficient lookup
    const courseMap = new Map();
    (rawCourses || []).forEach(c => courseMap.set(c.id, c));

    const mentorMap = new Map();
    (mentors || []).forEach(m => mentorMap.set(m.id, m));

    const planMap = new Map();
    (subscriptionPlans || []).forEach(p => planMap.set(p.name, p));

    // Debug logs
    if ((salesPages || []).length > 0) {
      console.log(`📦 Marketplace Debug: SalesPages=${(salesPages || []).length}, Courses=${(rawCourses || []).length}, Mentors=${(mentors || []).length}`);
    }

    // PIVOT: The source of truth is now salesPages
    return (salesPages || [])
      .map(salesPage => {
        const course = courseMap.get(salesPage.courseId);
        if (!course) return null; // No hay curso asociado, no mostramos

        let mentor = mentorMap.get(salesPage.mentorId || course.mentorId);
        
        // Fallback for missing mentor metadata
        if (!mentor) {
          mentor = {
            id: salesPage.mentorId || course.mentorId,
            displayName: 'Tutor BTECH',
            roles: ['mentor'],
            subscription: { status: 'active' }
          };
        }

        // FILTER: Check if mentor is Enterprise
        const plan = mentor?.subscription?.name ? planMap.get(mentor.subscription.name) : null;
        const isEnterprise = mentor?.isEnterprise === true || mentor?.subscription?.isEnterprise === true || plan?.isEnterprise === true;
        if (isEnterprise) return null;

        // FILTER: Only active tutors (or fallback to active)
        const subStatus = mentor?.subscription?.status || 'active';
        if (subStatus !== 'active' && !mentor?.roles?.includes('admin')) return null;

        const courseTags = course.tags || [];

        // FILTER: Economic - Price (Source: SalesPage)
        const finalPrice = salesPage.price !== undefined ? salesPage.price : course.price;
        if (priceFilter === 'free' && finalPrice > 0) return null;
        if (priceFilter === 'paid' && (finalPrice === 0 || finalPrice === undefined)) return null;

        // FILTER: Academic - Level (Robust check for Spanish/English)
        if (selectedLevel !== 'Todos') {
          const level = (course.level || '').toLowerCase();
          const target = selectedLevel.toLowerCase();
          
          const isMatch = level === target || 
            (target === 'principiante' && level === 'beginner') ||
            (target === 'intermedio' && level === 'intermediate') ||
            (target === 'avanzado' && level === 'advanced');
            
          if (!isMatch) return null;
        }

        // FILTER: Academic - Category (Using the new categoryId field)
        if (selectedCategory !== 'Todos') {
          const category = categoriesData.find(c => c.name === selectedCategory);
          if (category) {
            if (course.categoryId !== category.id) return null;
          } else {
            // Fallback for search-based filtering if category not found by name
            const target = selectedCategory.toLowerCase();
            const hasTagMatch = courseTags.some((tag: string) => tag.toLowerCase().includes(target));
            const hasTitleMatch = (course.title || '').toLowerCase().includes(target);
            if (!hasTagMatch && !hasTitleMatch) return null;
          }
        }

        // SEARCH: General keyword search
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          const matchesTitle = (course.title || '').toLowerCase().includes(search);
          const matchesMentor = (mentor.displayName || '').toLowerCase().includes(search);
          const matchesTags = courseTags.some((tag: string) => tag.toLowerCase().includes(search));
          if (!matchesTitle && !matchesMentor && !matchesTags) return null;
        }

        return {
          id: course.id,
          salesPageId: salesPage.id,
          slug: salesPage.slug || course.slug || course.title?.toLowerCase().replace(/\s+/g, '-'),
          title: course.title || 'Publicación sin título',
          description: course.description || 'Explora esta mentoría en BTECHAcademy',
          price: finalPrice,
          currency: salesPage.currency || course.currency || 'USD',
          duration: course.duration || 0,
          level: course.level || 'principiante',
          tags: course.tags || courseTags, // Prefer direct tags if available
          thumbnail: salesPage.thumbnail || course.thumbnail || `https://loremflickr.com/600/400/education?lock=${course.id}`,
          rating: course.rating || 4.8,
          students: course.studentsCount || 0,
          tutor: {
            id: mentor.id,
            username: mentor.username || mentor.displayName?.toLowerCase().replace(/\s+/g, '-'),
            displayName: mentor.displayName || 'Tutor BTECH',
            photo: mentor.photoURL || `https://loremflickr.com/60/60/person?lock=${mentor.id}`,
            subscription: {
              status: subStatus,
              plan: mentor.subscription?.plan || 'free'
            }
          },
          pricing: {
            type: finalPrice === undefined ? 'on_request' : finalPrice === 0 ? 'free' : 'paid',
            amount: finalPrice || 0,
            currency: salesPage.currency || 'USD'
          }
        };
      })
      .filter(Boolean) as Course[];
  }, [rawCourses, salesPages, mentors, subscriptionPlans, coursesLoading, salesLoading, mentorsLoading, plansLoading, searchTerm, selectedCategory, selectedLevel, priceFilter]);

  // Sorting
  const sortedCourses = useMemo(() => {
    const list = [...enrichedCourses];
    switch (sortBy) {
      case 'newest':
        list.sort((a, b) => (b.id > a.id ? 1 : -1)); // Approximate by ID if no createdAt as date
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'students':
        list.sort((a, b) => b.students - a.students);
        break;
      case 'price_low':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        list.sort((a, b) => b.price - a.price);
        break;
    }
    return list;
  }, [enrichedCourses, sortBy]);

  const loading = coursesLoading || salesLoading || mentorsLoading;
  const courses = sortedCourses;

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
