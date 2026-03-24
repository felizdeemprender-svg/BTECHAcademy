'use client';

import { useState, useEffect, use } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MapPin, 
  Mail, 
  Globe, 
  Linkedin, 
  Star,
  Users,
  BookOpen,
  Clock,
  AlertCircle,
  CreditCard,
  Instagram,
  Youtube
} from 'lucide-react';
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);
import Image from 'next/image';
import Link from 'next/link';
import { CourseCard } from '@/components/courses/course-card';
import { cn } from '@/lib/utils';

interface TutorData {
  id: string;
  username: string;
  displayName: string;
  photo: string;
  bio: string;
  expertise: string[];
  location: string;
  email: string;
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    website?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
  };
  stats: {
    totalStudents: number;
    totalCourses: number;
    avgRating: number;
    totalHours: number;
  };
  subscription: {
    status: string;
    plan: string;
  };
  publicProfile: {
    enabled: boolean;
    showStats: boolean;
    showContact: boolean;
    allowPublicCourses: boolean;
  };
  branding: {
    primaryColor: string;
    secondaryColor?: string;
    layoutMode?: 'light' | 'dark';
  };
}

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  duration: number;
  level: string;
  students: number;
  rating: number;
  thumbnail: string;
  tags: string[];
  salesPageId?: string | null;
}

export default function TutorProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [tutorData, setTutorData] = useState<TutorData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionRequired, setSubscriptionRequired] = useState(false);
  const [errorReason, setErrorReason] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    checkTutorAvailability();
  }, [username]);

  const checkTutorAvailability = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/tutors/${username}/status`);
      const data = await response.json();

      if (!response.ok) {
        setSubscriptionRequired(true);
        setErrorReason(data.reason || 'server_error');
        setLoading(false);
        return;
      }
      
      if (data.tutor) {
        setTutorData(data.tutor);
        fetchTutorCourses(data.tutor.id);
      } else {
        throw new Error('No tutor data in response');
      }
      
    } catch (error: any) {
      console.error('Error checking tutor status:', error);
      setSubscriptionRequired(true);
      setErrorReason('server_error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTutorCourses = async (tutorId: string) => {
    try {
      const response = await fetch(`/api/courses/tutor/${tutorId}`);
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Cargando perfil del tutor...</p>
        </div>
      </div>
    );
  }

  if (subscriptionRequired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-2xl w-full space-y-8">
          <Card className="border-none shadow-xl">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-primary mb-3">
                  Perfil No Disponible
                </h1>
                <p className="text-muted-foreground text-lg">
                  {(errorReason === 'no_subscription' || errorReason === 'subscription_inactive') && 
                    'Este tutor no tiene una suscripción activa en nuestra plataforma.'}
                  {errorReason === 'profile_private' && 
                    'Este tutor ha configurado su perfil como privado.'}
                  {errorReason === 'server_error' && 
                    'No se pudo verificar el estado del tutor. Intenta nuevamente.'}
                  {(!errorReason || errorReason === 'not_found' || errorReason === 'profile_not_available') && 
                    'El perfil que buscas no está disponible actualmente.'}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="font-medium">Explorar otros tutores</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Descubre cientos de tutores expertos con suscripciones activas.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <span className="font-medium">Información para tutores</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Conoce nuestros planes y beneficios para profesionales de la educación.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild size="lg" className="flex-1">
                  <Link href="/courses">
                    <Users className="h-5 w-5 mr-2" />
                    Explorar Marketplace
                  </Link>
                </Button>
                <Button variant="outline" asChild size="lg" className="flex-1">
                  <Link href="/services">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Planes para Tutores
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!tutorData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold text-primary">Tutor No Encontrado</h1>
          <p className="text-muted-foreground">El tutor que buscas no existe.</p>
          <Button asChild>
            <Link href="/courses">Explorar Cursos</Link>
          </Button>
        </div>
      </div>
    );
  }

  const primaryColor = tutorData.branding?.primaryColor || '#3B2D86';
  const isDark = tutorData.branding?.layoutMode === 'dark';

  return (
    <div 
      className={cn(
        "min-h-screen transition-colors duration-500", 
        isDark ? "bg-slate-950 text-slate-50 dark" : "bg-[#FAFAFA] text-slate-900"
      )}
      style={{
        '--brand-color': primaryColor,
        '--brand-color-alpha': `${primaryColor}20` // Aproximación 20% hex alpha
      } as React.CSSProperties}
    >
      <style>{`
        ::selection { background: var(--brand-color-alpha); }
        .text-brand { color: var(--brand-color); }
        .bg-brand { background-color: var(--brand-color); }
        .border-brand { border-color: var(--brand-color); }
        .hover\\:bg-brand\\/10:hover { background-color: var(--brand-color-alpha); }
      `}</style>
      
      {/* Top Contact Bar */}
      <div className={cn("border-b sticky top-0 z-50 transition-colors duration-500 backdrop-blur-md", isDark ? "bg-slate-950/80 border-slate-800" : "bg-white/80 border-slate-200")}>
        <div className="container mx-auto px-6 h-12 flex items-center justify-between text-xs md:text-sm">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {tutorData.email && (
              <a href={`mailto:${tutorData.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-brand transition-colors whitespace-nowrap">
                <Mail className="h-4 w-4" />
                {tutorData.email}
              </a>
            )}
            {tutorData.socialLinks.website && (
              <a href={tutorData.socialLinks.website} target="_blank" className="flex items-center gap-2 text-muted-foreground hover:text-brand transition-colors whitespace-nowrap">
                <Globe className="h-4 w-4" />
                Sitio Web
              </a>
            )}
          </div>
          <div className="hidden md:flex items-center gap-4">
            {tutorData.socialLinks.linkedin && (
              <Link href={tutorData.socialLinks.linkedin} target="_blank" className="text-muted-foreground hover:text-brand transition-colors">
                <Linkedin className="h-4 w-4" />
              </Link>
            )}
            {tutorData.socialLinks.instagram && (
              <Link href={tutorData.socialLinks.instagram} target="_blank" className="text-muted-foreground hover:text-brand transition-colors">
                <Instagram className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div 
          className="h-80 lg:h-96 w-full relative" 
          style={{ backgroundColor: primaryColor }}
        >
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          <div className={cn("absolute inset-0", isDark ? "bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" : "bg-gradient-to-t from-black/80 via-black/20 to-transparent")} />
          
          <div className="container mx-auto px-6 h-full flex flex-col justify-end pb-12 relative z-10">
            <div className="flex flex-col md:row items-center md:items-end gap-6 text-center md:text-left">
              <div className="relative group">
                <div className="absolute -inset-1 bg-white/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                <div className={cn("relative w-32 h-32 lg:w-44 lg:h-44 rounded-2xl overflow-hidden border-4 shadow-2xl", isDark ? "border-slate-800" : "border-white")}>
                  <Image 
                    src={tutorData.photo} 
                    alt={tutorData.displayName}
                    fill
                    sizes="176px"
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <h1 className="font-headline text-4xl lg:text-5xl font-bold text-white tracking-tight">
                    {tutorData.displayName}
                  </h1>
                  <Badge className={cn("bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm", isDark && "border-slate-700/50")}>
                    Tutor Verificado
                  </Badge>
                </div>
                <p className="text-lg lg:text-xl text-white/80 font-medium">
                  Transformando vidas a través de la educación experta y personalizada
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-white/70 text-sm">
                    <MapPin className="h-4 w-4" />
                    {tutorData.location || 'Educación Global'}
                  </div>
                  <div className="flex items-center gap-1.5 text-white/70 text-sm">
                    <BookOpen className="h-4 w-4" />
                    {courses.length} Disponibles para la venta
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-8">
            {/* Stats Card */}
            <Card className={cn("border-none shadow-lg transition-colors", isDark ? "bg-slate-900 border-none" : "bg-white")}>
              <CardContent className="p-6">
                <h2 className="font-headline text-xl font-bold text-brand mb-6">Estadísticas</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="font-headline text-2xl font-bold text-brand">
                      {tutorData.stats.totalStudents}
                    </div>
                    <div className="text-sm text-muted-foreground">Estudiantes</div>
                  </div>
                  <div className="text-center">
                    <div className="font-headline text-2xl font-bold text-brand">
                      {tutorData.stats.totalCourses}
                    </div>
                    <div className="text-sm text-muted-foreground">Cursos</div>
                  </div>
                  <div className="text-center">
                    <div className="font-headline text-2xl font-bold text-brand">
                      {tutorData.stats.avgRating}
                    </div>
                    <div className="text-sm text-muted-foreground">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="font-headline text-2xl font-bold text-brand">
                      {tutorData.stats.totalHours}
                    </div>
                    <div className="text-sm text-muted-foreground">Horas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Bio and Courses */}
          <div className="lg:col-span-2 space-y-12">
            {/* Bio Section */}
            <div>
              <h2 className="font-headline text-3xl font-bold text-brand mb-6">Acerca de mí</h2>
              <p className={cn("text-lg leading-relaxed", isDark ? "text-slate-300" : "text-muted-foreground")}>
                {tutorData.bio}
              </p>
            </div>

            {/* Courses Section */}
            {courses.length > 0 && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <h2 className="font-headline text-3xl font-bold text-brand">Mis Landings de Venta</h2>
                  <div className="relative w-full md:w-72">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar cursos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={cn(
                        "w-full pl-10 pr-4 py-2 border rounded-xl outline-none transition-all text-sm focus:border-brand",
                        isDark ? "bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500" : "bg-white border-slate-200 focus:ring-2 focus:ring-[var(--brand-color-alpha)]"
                      )}
                    />
                  </div>
                </div>

                {filteredCourses.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-8">
                    {filteredCourses.map((course) => (
                      <div key={course.id} className={cn("transition-all", isDark && "[&>div]:bg-slate-900 [&>div]:border-slate-800 [&_h3]:text-slate-100 [&_p]:text-slate-400 [&_.text-primary]:!text-brand")}>
                        <CourseCard 
                          course={course} 
                          showTutor={false}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={cn("text-center py-12 rounded-3xl border border-dashed", isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white")}>
                    <p className="text-muted-foreground text-sm">No se encontraron landings que coincidan con tu búsqueda.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Footer / Contact Persistence */}
      <footer className={cn("border-t mt-20 pt-16 pb-8 transition-colors duration-500", isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200")}>
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl bg-brand">
                  {tutorData.displayName.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-headline text-2xl font-bold text-brand">{tutorData.displayName}</h3>
              </div>
              <p className={cn("max-w-sm", isDark ? "text-slate-400" : "text-muted-foreground")}>
                Empoderando a estudiantes de todo el mundo con conocimientos de vanguardia y mentoría personalizada.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-bold text-brand">Contacto</h4>
              <div className="space-y-2">
                {tutorData.email && (
                  <a href={`mailto:${tutorData.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand transition-colors">
                    <Mail className="h-4 w-4" />
                    {tutorData.email}
                  </a>
                )}
                {tutorData.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {tutorData.location}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-brand">Siguenos</h4>
              <div className="flex gap-4">
                {tutorData.socialLinks.linkedin && (
                  <Link href={tutorData.socialLinks.linkedin} target="_blank" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-slate-800" : "bg-slate-100")}>
                    <Linkedin className="h-5 w-5 text-brand" />
                  </Link>
                )}
                {tutorData.socialLinks.instagram && (
                  <Link href={tutorData.socialLinks.instagram} target="_blank" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-slate-800" : "bg-slate-100")}>
                    <Instagram className="h-5 w-5 text-brand" />
                  </Link>
                )}
                {tutorData.socialLinks.website && (
                  <Link href={tutorData.socialLinks.website} target="_blank" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-slate-800" : "bg-slate-100")}>
                    <Globe className="h-5 w-5 text-brand" />
                  </Link>
                )}
              </div>
            </div>
          </div>
          
          <div className={cn("border-t pt-8 text-center text-sm", isDark ? "border-slate-800 text-slate-500" : "border-slate-200 text-muted-foreground")}>
            <p>© {new Date().getFullYear()} {tutorData.displayName}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
