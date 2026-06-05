'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { SmartFilterBar } from '@/components/ui/smart-filter-bar';

export default function CoursesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedLevel, setSelectedLevel] = useState('Todos');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [requestingId, setRequestingId] = useState<string | null>(null);

  // API Data State
  const [marketplaceData, setMarketplaceData] = useState<any[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [levelsData, setLevelsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        const response = await fetch('/api/marketplace');
        const data = await response.json();
        if (data.marketplace) {
          setMarketplaceData(data.marketplace);
          setCategoriesData(data.categories || []);
          setLevelsData(data.levels || []);
        }
      } catch (error) {
        console.error("[Marketplace] Error:", error);
        toast({
          variant: 'destructive',
          title: 'Error de conexión',
          description: 'No pudimos cargar el catálogo de cursos.'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchMarketplace();
  }, [toast]);

  const categories = useMemo(() => ['Todos', ...Array.from(new Set((categoriesData || []).map(c => c.name)))], [categoriesData]);
  const levels = useMemo(() => ['Todos', ...Array.from(new Set((levelsData || []).map(l => l.name)))], [levelsData]);

  // Filtering Logic
  const filteredCourses = useMemo(() => {
    if (loading) return [];

    return marketplaceData.filter(course => {
      // 1. Category Filter
      if (selectedCategory !== 'Todos') {
        const categoryMatch = course.category === selectedCategory || 
                             (categoriesData.find(c => c.id === course.categoryId)?.name === selectedCategory);
        if (!categoryMatch) return false;
      }

      // 2. Level Filter
      if (selectedLevel !== 'Todos') {
        const level = (course.level || '').toLowerCase();
        const target = selectedLevel.toLowerCase();
        const isMatch = level === target || 
          (target === 'principiante' && level === 'beginner') ||
          (target === 'intermedio' && level === 'intermediate') ||
          (target === 'avanzado' && level === 'advanced');
        if (!isMatch) return false;
      }

      // 3. Price Filter
      const price = course.pricing?.amount || 0;
      if (priceFilter === 'free' && price > 0) return false;
      if (priceFilter === 'paid' && price === 0) return false;

      // 4. Search Term
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesTitle = (course.title || '').toLowerCase().includes(search);
        const matchesMentor = (course.tutor?.displayName || '').toLowerCase().includes(search);
        const matchesTags = (course.tags || []).some((tag: string) => tag.toLowerCase().includes(search));
        if (!matchesTitle && !matchesMentor && !matchesTags) return false;
      }

      return true;
    });
  }, [marketplaceData, loading, selectedCategory, selectedLevel, priceFilter, searchTerm, categoriesData]);

  // Sorting
  const sortedCourses = useMemo(() => {
    const list = [...filteredCourses];
    switch (sortBy) {
      case 'newest':
        list.sort((a, b) => b.id > a.id ? 1 : -1);
        break;
      case 'rating':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'students':
        list.sort((a, b) => (b.studentsCount || 0) - (a.studentsCount || 0));
        break;
      case 'price_low':
        list.sort((a, b) => (a.pricing?.amount || 0) - (b.pricing?.amount || 0));
        break;
      case 'price_high':
        list.sort((a, b) => (b.pricing?.amount || 0) - (a.pricing?.amount || 0));
        break;
    }
    return list;
  }, [filteredCourses, sortBy]);

  const handleRequestInvitation = async (courseId: string) => {
    setRequestingId(courseId);
    try {
      // Simulación - En el futuro esto podría ir a una API de inscripciones
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: 'Solicitud Enviada',
        description: 'El tutor ha sido notificado.',
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar la solicitud.' });
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingHeader />
      
      {/* Search & Filter Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-[84px] z-40 py-4">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-1 w-full">
              <SmartFilterBar 
                placeholder="Buscar cursos, tutores, especialidades..."
                value={searchTerm}
                onChange={setSearchTerm}
                className="bg-white shadow-sm border-solid"
              />
            </div>
            
            <div className="flex items-center gap-4 bg-secondary/10 px-6 h-14 rounded-[2rem] border border-dashed border-primary/20 shrink-0">
              <label htmlFor="course-sort" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ordenar:</label>
              <select 
                id="course-sort"
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent font-bold text-sm focus:outline-none text-primary cursor-pointer"
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

      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 space-y-6">
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Filter className="h-5 w-5" />
                  <h3>Filtros Avanzados</h3>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Categoría</h4>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <Badge 
                        key={cat} 
                        onClick={() => setSelectedCategory(cat)}
                        variant={selectedCategory === cat ? 'default' : 'outline'}
                        className="cursor-pointer px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-dashed">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nivel Académico</h4>
                  <div className="flex flex-wrap gap-2">
                    {levels.map(lvl => (
                      <Badge 
                        key={lvl} 
                        onClick={() => setSelectedLevel(lvl)}
                        variant={selectedLevel === lvl ? 'default' : 'outline'}
                        className="cursor-pointer px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        {lvl}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-dashed">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Presupuesto</h4>
                  <div className="space-y-2">
                    {['all', 'free', 'paid'].map((val) => (
                      <label key={val} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${priceFilter === val ? 'border-primary bg-primary shadow-lg shadow-primary/20' : 'border-slate-200 group-hover:border-primary/40'}`}>
                          {priceFilter === val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <input type="radio" className="hidden" checked={priceFilter === val} onChange={() => setPriceFilter(val as any)} />
                        <span className={`text-xs font-bold transition-colors ${priceFilter === val ? 'text-slate-900' : 'text-slate-500'}`}>
                          {val === 'all' ? 'Todos' : val === 'free' ? 'Gratuitos' : 'Inversión'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="flex-1">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array(6).fill(0).map((_, i) => (
                  <Card key={i} className="h-[400px] animate-pulse bg-slate-50 border-none rounded-3xl" />
                ))}
              </div>
            ) : sortedCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <BookOpen className="h-20 w-20 text-slate-200 mb-6" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No encontramos coincidencias</h3>
                <p className="text-sm text-slate-500 max-w-xs text-center font-medium">Intenta ajustar los filtros o los términos de tu búsqueda.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sortedCourses.map((course) => (
                  <CourseCard 
                    key={course.salesPageId} 
                    course={course} 
                    onAction={handleRequestInvitation}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <LandingFooter />
    </div>
  );
}
