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
  Youtube,
  Twitter,
  Phone,
  MessageCircle,
  Calendar,
  CheckCircle2,
  Info,
  ShieldCheck,
  Trophy,
  LayoutGrid,
  TrendingUp
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    whatsapp?: string;
    phone?: string;
    calendly?: string;
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
    layoutMode?: 'light' | 'dark';
    primaryColor?: string;
  };
  websiteConfig?: {
    headline: string;
    subheadline: string;
    mission: string;
    pilares: { titulo: string; descripcion: string }[];
    badges: { label: string; description: string }[];
    showStats: boolean;
    theme: string;
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

const ensureAbsoluteUrl = (url?: string) => {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '59, 45, 134';
};

export default function TutorProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [tutorData, setTutorData] = useState<TutorData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionRequired, setSubscriptionRequired] = useState(false);
  const [errorReason, setErrorReason] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('academia');

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
        '--brand-color-alpha': `${primaryColor}20`
      } as React.CSSProperties}
    >
      <style>{`
        ::selection { background: var(--brand-color-alpha); }
        .text-brand { color: var(--brand-color); }
        .bg-brand { background-color: var(--brand-color); }
        .border-brand { border-color: var(--brand-color); }
        .hover\\:bg-brand\\/10:hover { background-color: var(--brand-color-alpha); }
        :root {
          --brand-color-rgb: ${hexToRgb(primaryColor)};
        }
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
            {tutorData.socialLinks.phone && (
              <a href={`tel:${tutorData.socialLinks.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-brand transition-colors whitespace-nowrap">
                <Phone className="h-4 w-4" />
                {tutorData.socialLinks.phone}
              </a>
            )}
            {tutorData.socialLinks.whatsapp && (
              <a href={`https://wa.me/${tutorData.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-brand transition-colors whitespace-nowrap">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            )}
            {tutorData.socialLinks.website && (
              <a href={ensureAbsoluteUrl(tutorData.socialLinks.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-brand transition-colors whitespace-nowrap">
                <Globe className="h-4 w-4" />
                Sitio Web
              </a>
            )}
          </div>
          <div className="hidden md:flex items-center gap-4">
            {tutorData.socialLinks.linkedin && (
              <a href={ensureAbsoluteUrl(tutorData.socialLinks.linkedin)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            )}
            {tutorData.socialLinks.instagram && (
              <a href={ensureAbsoluteUrl(tutorData.socialLinks.instagram)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {tutorData.socialLinks.youtube && (
              <a href={ensureAbsoluteUrl(tutorData.socialLinks.youtube)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand transition-colors">
                <Youtube className="h-4 w-4" />
              </a>
            )}
            {tutorData.socialLinks.twitter && (
              <a href={ensureAbsoluteUrl(tutorData.socialLinks.twitter)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
            )}
            {tutorData.socialLinks.tiktok && (
              <a href={ensureAbsoluteUrl(tutorData.socialLinks.tiktok)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand transition-colors">
                <TikTokIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section Premium */}
      <div className="relative overflow-hidden">
        <div 
          className="min-h-[400px] lg:min-h-[500px] w-full relative flex items-center" 
          style={{ backgroundColor: primaryColor }}
        >
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          <div className={cn("absolute inset-0", isDark ? "bg-gradient-to-br from-slate-950 via-slate-950/60 to-transparent" : "bg-gradient-to-br from-black/70 via-black/30 to-transparent")} />
          
          <div className="container mx-auto px-6 relative z-10 py-16">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="relative group shrink-0">
                <div 
                  className="absolute -inset-4 rounded-[2.5rem] blur-2xl opacity-40 animate-pulse" 
                  style={{ backgroundColor: primaryColor }}
                />
                <div className={cn("relative w-48 h-48 lg:w-64 lg:h-64 rounded-[2.5rem] overflow-hidden border-8 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]", isDark ? "border-slate-800" : "border-white")}>
                  <Image 
                    src={tutorData.photo || `https://api.dicebear.com/7.x/adventurer/svg?seed=${tutorData.displayName || 'tutor'}`} 
                    alt={tutorData.displayName}
                    fill
                    sizes="256px"
                    className="object-cover"
                    priority
                    unoptimized
                  />
                </div>
              </div>
              
              <div className="flex-1 space-y-6 text-center lg:text-left">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                    <Badge className="bg-white/20 text-white border-none backdrop-blur-md px-4 py-1 uppercase text-[10px] font-black tracking-widest">
                      Mentor Certificado BTECH
                    </Badge>
                  </div>
                  <h1 className="font-headline text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none">
                    {tutorData.websiteConfig?.headline || tutorData.displayName}
                  </h1>
                </div>
                
                <p className="text-xl lg:text-2xl text-white/90 font-medium max-w-2xl leading-relaxed">
                  {tutorData.websiteConfig?.subheadline || tutorData.bio.substring(0, 150) + '...'}
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                  <Button 
                    size="lg" 
                    className="h-14 px-10 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black text-lg shadow-2xl"
                    onClick={() => {
                      const el = document.getElementById('programas');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Ver Programas
                  </Button>
                  {tutorData.socialLinks.whatsapp && (
                    <Button 
                      variant="outline" 
                      size="lg" 
                      asChild
                      className="h-14 px-10 rounded-2xl border-2 border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 font-bold"
                    >
                      <a href={`https://wa.me/${tutorData.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                        Hablar con {tutorData.displayName.split(' ')[0]}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs - Premium Sticky */}
      <div className={cn("sticky top-12 z-40 border-b transition-all duration-500", isDark ? "bg-slate-950/90 border-slate-800" : "bg-white/90 border-slate-200")}>
        <div className="container mx-auto px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-20 w-full justify-center lg:justify-start gap-8">
              <TabsTrigger 
                value="academia" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-brand rounded-none h-full px-4 gap-2 font-black uppercase tracking-widest text-[10px] md:text-xs transition-all"
              >
                <LayoutGrid className="h-4 w-4" /> Academia
              </TabsTrigger>
              <TabsTrigger 
                value="mentor" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-brand rounded-none h-full px-4 gap-2 font-black uppercase tracking-widest text-[10px] md:text-xs transition-all"
              >
                <Users className="h-4 w-4" /> El Mentor
              </TabsTrigger>
              <TabsTrigger 
                value="resultados" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-brand rounded-none h-full px-4 gap-2 font-black uppercase tracking-widest text-[10px] md:text-xs transition-all"
              >
                <TrendingUp className="h-4 w-4" /> Resultados
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-6 py-12">
        <Tabs value={activeTab} className="w-full">
          
          {/* TAB 1: ACADEMIA - Programs */}
          <TabsContent value="academia" className="m-0 space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Courses Section */}
            {courses.length > 0 && (
              <div id="programas" className="space-y-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-12 border-slate-200 dark:border-slate-800">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand/60">Catálogo Premium</p>
                    <h2 className="font-headline text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                      Programas de <span className="text-brand">Formación</span>
                    </h2>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Star className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand" />
                    <input
                      type="text"
                      placeholder="Buscar en la academia..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={cn(
                        "w-full pl-12 pr-4 py-4 border rounded-[1.5rem] outline-none transition-all text-sm font-medium focus:border-brand",
                        isDark 
                          ? "bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:bg-slate-900" 
                          : "bg-white border-slate-200 focus:ring-4 focus:ring-brand/10"
                      )}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredCourses.map((course) => (
                    <div key={course.salesPageId || course.id} className={cn("transition-all", isDark && "[&>div]:bg-slate-900 [&>div]:border-slate-800 [&_h3]:text-slate-100 [&_p]:text-slate-400 [&_.text-primary]:!text-brand")}>
                      <CourseCard course={course} showTutor={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: MENTOR - Bio and Methodology */}
          <TabsContent value="mentor" className="m-0 space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-20">
                {/* Bio Section */}
                <div className={cn("p-10 lg:p-16 rounded-[3.5rem] border relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-brand/5", isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/50")}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                  <div className="space-y-2 mb-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand/80">Historia & Visión</p>
                    <h2 className="font-headline text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                      Acerca del <span className="text-brand drop-shadow-[0_0_15px_rgba(var(--brand-color-rgb),0.3)]">Mentor</span>
                    </h2>
                  </div>
                  <div className={cn("text-lg md:text-xl leading-relaxed whitespace-pre-wrap font-medium", isDark ? "text-slate-200" : "text-slate-600")}>
                    {tutorData.bio}
                  </div>
                </div>

                {/* Metodología (Pilares) */}
                {tutorData.websiteConfig?.pilares && (
                  <div className="space-y-12">
                    <div className="space-y-2 text-center lg:text-left px-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand/80">El camino al éxito</p>
                      <h2 className="font-headline text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                        Mi Metodología de <span className="text-brand drop-shadow-[0_0_15px_rgba(var(--brand-color-rgb),0.3)]">Transformación</span>
                      </h2>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                      {tutorData.websiteConfig.pilares.map((pilar, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "group p-8 lg:p-10 rounded-[3rem] border transition-all duration-700 hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden",
                            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm shadow-slate-200/40"
                          )}
                        >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                          <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center font-black text-2xl mb-8 group-hover:bg-brand group-hover:text-white transition-all duration-500">
                            {i + 1}
                          </div>
                          <h3 className="font-headline text-xl md:text-2xl font-bold mb-4 text-slate-900 dark:text-white leading-tight">
                            {pilar.titulo}
                          </h3>
                          <p className="text-sm text-slate-400 dark:text-slate-300 leading-relaxed">
                            {pilar.descripcion}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="lg:col-span-1 space-y-8">
                <Card className={cn("border-none shadow-lg", isDark ? "bg-slate-900" : "bg-white")}>
                  <CardContent className="p-8 space-y-6">
                    <h3 className="font-headline text-xl font-bold text-brand">Contacto Directo</h3>
                    <div className="space-y-4">
                      {tutorData.email && (
                        <a href={`mailto:${tutorData.email}`} className="flex items-center gap-3 p-4 rounded-2xl hover:bg-brand/5 transition-colors group">
                          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-all">
                            <Mail className="h-5 w-5" />
                          </div>
                          <span className="text-sm font-medium truncate">{tutorData.email}</span>
                        </a>
                      )}
                      {tutorData.socialLinks.whatsapp && (
                        <a href={`https://wa.me/${tutorData.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl hover:bg-emerald-50 transition-colors group">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                            <MessageCircle className="h-5 w-5" />
                          </div>
                          <span className="text-sm font-medium">WhatsApp Directo</span>
                        </a>
                      )}
                      {tutorData.socialLinks.calendly && (
                        <a href={ensureAbsoluteUrl(tutorData.socialLinks.calendly)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl hover:bg-brand/5 transition-colors group">
                          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-all">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <span className="text-sm font-medium">Agendar Llamada</span>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: RESULTADOS - Stats and Authority */}
          <TabsContent value="resultados" className="m-0 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 space-y-8">
                {tutorData.websiteConfig?.showStats !== false && (
                  <Card className={cn("border-none shadow-lg", isDark ? "bg-slate-900" : "bg-white")}>
                    <CardContent className="p-8">
                      <div className="space-y-8">
                        <div>
                          <div className="font-headline text-4xl font-bold text-brand">{tutorData.stats.totalStudents}</div>
                          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estudiantes</div>
                        </div>
                        <div>
                          <div className="font-headline text-4xl font-bold text-brand">{tutorData.stats.avgRating}</div>
                          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Rating Promedio</div>
                        </div>
                        <div>
                          <div className="font-headline text-4xl font-bold text-brand">{tutorData.stats.totalHours}</div>
                          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Horas Dictadas</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="lg:col-span-3">
                <div className="grid md:grid-cols-2 gap-6">
                  {tutorData.websiteConfig?.badges?.map((badge, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "p-10 rounded-[3rem] border flex flex-col gap-6 transition-all duration-500 hover:border-brand/30 hover:bg-brand/[0.02]",
                        isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm"
                      )}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ShieldCheck className="h-8 w-8 drop-shadow-[0_0_10px_rgba(var(--brand-color-rgb),0.5)]" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-headline text-2xl font-bold text-slate-900 dark:text-white leading-tight">{badge.label}</h3>
                        <p className="text-slate-500 dark:text-slate-300 leading-relaxed font-medium">{badge.description}</p>
                      </div>
                    </div>
                  ))}
                  <div className={cn("p-10 rounded-[3rem] border border-dashed border-brand/20 flex items-center justify-center text-center", isDark ? "bg-slate-900/30" : "bg-brand/5")}>
                    <div className="space-y-2">
                      <Trophy className="h-10 w-10 text-brand/30 mx-auto" />
                      <p className="text-xs font-bold text-brand/50 uppercase tracking-widest">Testimonios y Casos de Éxito en Auditoría</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

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
                {tutorData.socialLinks.phone && (
                  <a href={`tel:${tutorData.socialLinks.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand transition-colors">
                    <Phone className="h-4 w-4" />
                    {tutorData.socialLinks.phone}
                  </a>
                )}
                {tutorData.socialLinks.whatsapp && (
                  <a href={`https://wa.me/${tutorData.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                )}
                {tutorData.socialLinks.calendly && (
                  <a href={ensureAbsoluteUrl(tutorData.socialLinks.calendly)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand transition-colors font-medium">
                    <Calendar className="h-4 w-4 text-brand" />
                    Agendar Mentoría
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-brand">Siguenos</h4>
              <div className="flex gap-4 flex-wrap">
                {tutorData.socialLinks.linkedin && (
                  <a href={ensureAbsoluteUrl(tutorData.socialLinks.linkedin)} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-slate-800" : "bg-slate-100")}>
                    <Linkedin className="h-5 w-5 text-brand" />
                  </a>
                )}
                {tutorData.socialLinks.instagram && (
                  <a href={ensureAbsoluteUrl(tutorData.socialLinks.instagram)} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-slate-800" : "bg-slate-100")}>
                    <Instagram className="h-5 w-5 text-brand" />
                  </a>
                )}
                {tutorData.socialLinks.youtube && (
                  <a href={ensureAbsoluteUrl(tutorData.socialLinks.youtube)} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-slate-800" : "bg-slate-100")}>
                    <Youtube className="h-5 w-5 text-brand" />
                  </a>
                )}
                {tutorData.socialLinks.twitter && (
                  <a href={ensureAbsoluteUrl(tutorData.socialLinks.twitter)} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-slate-800" : "bg-slate-100")}>
                    <Twitter className="h-5 w-5 text-brand" />
                  </a>
                )}
                {tutorData.socialLinks.tiktok && (
                  <a href={ensureAbsoluteUrl(tutorData.socialLinks.tiktok)} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-slate-800" : "bg-slate-100")}>
                    <TikTokIcon className="h-5 w-5 text-brand" />
                  </a>
                )}
                {tutorData.socialLinks.website && (
                  <a href={ensureAbsoluteUrl(tutorData.socialLinks.website)} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-slate-800" : "bg-slate-100")}>
                    <Globe className="h-5 w-5 text-brand" />
                  </a>
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
