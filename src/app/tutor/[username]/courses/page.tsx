'use client';

import { useState, use } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Clock, 
  Star, 
  PlayCircle, 
  Users,
  DollarSign,
  BookOpen,
  Filter,
  UserPlus,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

// Mock data - esto vendrá de la API
const mockTutor = {
  id: 'tutor1',
  username: 'maria-gonzalez',
  displayName: 'María González',
  photo: 'https://loremflickr.com/60/60/person,professional?lock=maria',
  bio: 'Consultora de marketing digital con más de 10 años de experiencia.',
  stats: {
    totalStudents: 156,
    totalCourses: 5,
    avgRating: 4.8,
    totalHours: 120
  }
};

const mockCourses = [
  {
    id: '1',
    slug: 'marketing-digital-avanzado',
    title: 'Marketing Digital Avanzado con IA',
    description: 'Domina las estrategias de marketing digital utilizando inteligencia artificial para maximizar resultados y automatizar procesos. Aprenderás a usar herramientas de IA para análisis de datos, segmentación de audiencia y optimización de campañas.',
    price: 99,
    currency: 'USD',
    duration: 12,
    level: 'intermediate',
    tags: ['marketing', 'ia', 'digital', 'automatizacion'],
    students: 89,
    rating: 4.8,
    thumbnail: 'https://loremflickr.com/600/400/marketing,business?lock=marketing-avanzado',
    status: 'published',
    modules: [
      { title: 'Introducción al Marketing con IA', duration: 2 },
      { title: 'Herramientas de IA para Análisis', duration: 3 },
      { title: 'Automatización de Campañas', duration: 4 },
      { title: 'Medición y Optimización', duration: 3 }
    ]
  },
  {
    id: '2',
    slug: 'growth-hacking-practico',
    title: 'Growth Hacking Práctico',
    description: 'Aprende técnicas probadas para acelerar el crecimiento de cualquier negocio. Desde estrategias de adquisición hasta retención de clientes, con casos reales y ejercicios prácticos.',
    price: 79,
    currency: 'USD',
    duration: 8,
    level: 'intermediate',
    tags: ['growth', 'marketing', 'estrategia', 'conversion'],
    students: 67,
    rating: 4.9,
    thumbnail: 'https://loremflickr.com/600/400/growth,business?lock=growth-hacking',
    status: 'published',
    modules: [
      { title: 'Fundamentos del Growth Hacking', duration: 2 },
      { title: 'Técnicas de Adquisición', duration: 2 },
      { title: 'Optimización de Conversión', duration: 2 },
      { title: 'Métricas y KPIs', duration: 2 }
    ]
  },
  {
    id: '3',
    slug: 'email-marketing-automatizado',
    title: 'Email Marketing Automatizado',
    description: 'Crea campañas de email marketing efectivas y automatizadas. Aprende a segmentar audiencias, crear secuencias de nutrición y medir el ROI de tus campañas.',
    price: 0,
    currency: 'USD',
    duration: 6,
    level: 'beginner',
    tags: ['email', 'marketing', 'automatizacion', 'crm'],
    students: 124,
    rating: 4.7,
    thumbnail: 'https://loremflickr.com/600/400/email,newsletter?lock=email-marketing',
    status: 'published',
    modules: [
      { title: 'Introducción al Email Marketing', duration: 1 },
      { title: 'Segmentación de Audiencias', duration: 2 },
      { title: 'Creación de Secuencias', duration: 2 },
      { title: 'Análisis de Resultados', duration: 1 }
    ]
  },
  {
    id: '4',
    slug: 'seo-local-para-negocios',
    title: 'SEO Local para Negocios',
    description: 'Posiciona tu negocio en búsquedas locales y atrae clientes de tu área. Optimiza tu perfil de Google Business y estrategias de contenido local.',
    price: 59,
    currency: 'USD',
    duration: 10,
    level: 'beginner',
    tags: ['seo', 'local', 'google', 'negocios'],
    students: 45,
    rating: 4.6,
    thumbnail: 'https://loremflickr.com/600/400/seo,business?lock=seo-local',
    status: 'published',
    modules: [
      { title: 'Fundamentos del SEO Local', duration: 2 },
      { title: 'Optimización de Google Business', duration: 3 },
      { title: 'Contenido Local', duration: 3 },
      { title: 'Métricas y Seguimiento', duration: 2 }
    ]
  },
  {
    id: '5',
    slug: 'analisis-de-datos-marketing',
    title: 'Análisis de Datos para Marketing',
    description: 'Transforma datos en decisiones estratégicas. Aprende a usar Google Analytics, herramientas de visualización y técnicas de análisis para optimizar tus campañas.',
    price: 89,
    currency: 'USD',
    duration: 14,
    level: 'advanced',
    tags: ['analisis', 'datos', 'analytics', 'metricas'],
    students: 38,
    rating: 4.8,
    thumbnail: 'https://loremflickr.com/600/400/analytics,data?lock=analisis-datos',
    status: 'published',
    modules: [
      { title: 'Introducción al Análisis de Datos', duration: 3 },
      { title: 'Herramientas de Analytics', duration: 4 },
      { title: 'Visualización de Datos', duration: 4 },
      { title: 'Toma de Decisiones Basada en Datos', duration: 3 }
    ]
  }
];

export default function TutorCoursesPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { toast } = useToast();
  const tutor = mockTutor; // TODO: Fetch from API based on username
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const filteredCourses = mockCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesPrice = priceFilter === 'all' || 
                        (priceFilter === 'free' && course.price === 0) ||
                        (priceFilter === 'paid' && course.price > 0);

    const matchesLevel = levelFilter === 'all' || course.level === levelFilter;

    return matchesSearch && matchesPrice && matchesLevel;
  });

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return a.price - b.price;
      case 'price_high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'students':
        return b.students - a.students;
      case 'duration':
        return b.duration - a.duration;
      default:
        return 0;
    }
  });

  const handleRequestInvitation = async (courseId: string) => {
    setRequestingId(courseId);
    
    // Simulación de API call
    setTimeout(() => {
      setRequestingId(null);
      toast({
        title: 'Solicitud Enviada',
        description: `${tutor.displayName} ha sido notificada. Recibirás una respuesta pronto.`,
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/tutor/${username}`}>
              <Button variant="ghost" size="sm" className="rounded-xl">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Perfil
              </Button>
            </Link>
            
            <div className="flex items-center gap-3 flex-1">
              <div className="relative w-12 h-12 rounded-full overflow-hidden">
                <Image 
                  src={tutor.photo || `https://api.dicebear.com/7.x/adventurer/svg?seed=${tutor.displayName || 'tutor'}`} 
                  alt={tutor.displayName}
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div>
                <h1 className="font-headline text-xl font-bold text-primary">
                  Cursos de {tutor.displayName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {tutor.stats.totalCourses} cursos • {tutor.stats.totalStudents} estudiantes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Buscar cursos..." 
                className="pl-12 border-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
               size="lg" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Precio:</span>
              <select 
                value={priceFilter} 
                onChange={(e) => setPriceFilter(e.target.value as any)}
                className="px-3 py-2 rounded-lg border text-sm"
              >
                <option value="all">Todos</option>
                <option value="free">Gratis</option>
                <option value="paid">De pago</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Nivel:</span>
              <select 
                value={levelFilter} 
                onChange={(e) => setLevelFilter(e.target.value as any)}
                className="px-3 py-2 rounded-lg border text-sm"
              >
                <option value="all">Todos</option>
                <option value="beginner">Principiante</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzado</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Ordenar:</span>
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
                <option value="duration">Duración</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-primary">
            {sortedCourses.length} {sortedCourses.length === 1 ? 'curso encontrado' : 'cursos encontrados'}
          </h2>
        </div>

        {/* Courses Grid */}
        {sortedCourses.length === 0 ? (
          <div className="text-center py-20 bg-secondary/10 rounded-lg border-2 border-dashed">
            <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              No se encontraron cursos
            </h3>
            <p className="text-muted-foreground">
              Intenta ajustar los filtros o términos de búsqueda
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {sortedCourses.map((course) => (
              <Card key={course.id} className="group border-none shadow-lg transition-all duration-500 overflow-hidden">
                <div className="flex flex-col lg:flex-row">
                  {/* Image */}
                  <div className="relative lg:w-2/5 aspect-video lg:aspect-square overflow-hidden">
                    <Image 
                      src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'} 
                      alt={course.title} 
                      fill
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-700" 
                      unoptimized={!!course.thumbnail} 
                    />
                    <div className="absolute top-4 right-4">
                      <Badge className={course.price === 0 ? "bg-success text-white" : "bg-blue-500 text-white"}>
                        {course.price === 0 ? 'Gratis' : `$${course.price}`}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-headline font-bold text-primary group-hover:text-accent transition-colors leading-tight mb-2">
                          {course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                          {course.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> 
                        {course.duration}h
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-warn fill-warn" /> 
                        {course.rating}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> 
                        {course.students}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {course.level}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {course.tags.slice(0, 4).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Modules Preview */}
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-2">Contenido del curso:</h4>
                      <div className="space-y-1">
                        {course.modules.slice(0, 3).map((module, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span>{module.title} ({module.duration}h)</span>
                          </div>
                        ))}
                        {course.modules.length > 3 && (
                          <div className="text-xs text-muted-foreground italic">
                            +{course.modules.length - 3} módulos más
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <Link href={`/courses/${course.slug}`} className="flex-1">
                        <Button variant="outline" className="w-full rounded-xl h-12">
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </Button>
                      </Link>
                      
                      <Button 
                        onClick={() => handleRequestInvitation(course.id)}
                        disabled={requestingId === course.id}
                        className="flex-1 rounded-xl h-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                      >
                        {requestingId === course.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        Solicitar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
