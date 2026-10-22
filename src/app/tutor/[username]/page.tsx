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
  TrendingUp,
  Building2,
  GraduationCap,
  Award,
  ArrowRight,
  Sparkles
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface CompanyTutor {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  photo?: string;
  bio?: string;
  expertise?: string[];
  assignedStudentsCount?: number;
  status: string;
  permissions?: Record<string, boolean>;
}

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  slogan?: string;
  logoUrl?: string;
  website?: string;
  primaryColor?: string;
}

interface TutorData {
  id: string;
  username: string;
  displayName: string;
  photo: string;
  bio: string;
  expertise: string[];
  location: string;
  email: string;
  isEnterprise?: boolean;
  isCompanyTutor?: boolean;
  company?: CompanyInfo | null;
  companyTutors?: CompanyTutor[];
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
  brand?: {
    name: string;
    palette: {
      primary: string;
      secondary: string;
      accent: string;
    };
    typography?: {
      headingFont?: string;
      bodyFont?: string;
    };
    tokens?: {
      themeMode?: 'light' | 'dark' | 'glass';
    };
  };
  styleId?: string;
  websiteConfig?: {
    headline: string;
    subheadline: string;
    mission: string;
    aboutUs?: string;
    pilares: { titulo: string; descripcion: string; imageUrl?: string }[];
    badges: { label: string; description: string }[];
    showStats: boolean;
    theme: string;
    styleId?: string;
    brandName?: string;
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

const hexToHsl = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '262 80% 50%';
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const DEFAULT_PILLAR_IMAGES = [
  '/assets/presets/01-academy-auth.png',
  '/assets/presets/02-glass-premium.png',
  '/assets/presets/03-kinetic-flow.png'
];

const getCleanInstitutionalBio = (bio?: string, aboutUs?: string, companyName?: string) => {
  if (aboutUs && aboutUs.trim()) return aboutUs.trim();
  if (!bio) {
    return `${companyName || 'Nuestra institución'} es una organización especializada en el desarrollo integral de competencias profesionales y de emprendimiento, respaldada por un equipo interdisciplinario de alto rendimiento.`;
  }
  
  if (bio.includes('Definición Corporativa')) {
    const after = bio.split('Definición Corporativa')[1] || '';
    const cleanSection = after.split(/(Misión|Visión|Propuesta de Valor|Valores Corporativos|Áreas de Especialización|💡)/i)[0];
    if (cleanSection && cleanSection.trim().length > 30) {
      return cleanSection.trim().replace(/^[:\s-]+/, '');
    }
  }

  if (bio.includes('💡')) {
    return bio.split('💡')[0].trim();
  }

  return bio;
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
  const [selectedTutorPresentation, setSelectedTutorPresentation] = useState<CompanyTutor | null>(null);

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
        if (data.tutor.isEnterprise) {
          setActiveTab('institucion');
          fetchTutorCourses(data.tutor.id);
        } else if (data.tutor.isCompanyTutor) {
          setActiveTab('presentacion');
        } else {
          setActiveTab('academia');
          fetchTutorCourses(data.tutor.id);
        }
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
          <Card className="border-none">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-warn/15 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-warn" />
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
                  <Link href="/#pricing">
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

  const brand = tutorData.brand;
  const primaryColor = brand?.palette?.primary || tutorData.company?.primaryColor || tutorData.branding?.primaryColor || '#1E40AF';
  const secondaryColor = brand?.palette?.secondary || '#F1F5F9';
  const accentColor = brand?.palette?.accent || '#F59E0B';
  const headingFont = brand?.typography?.headingFont && brand.typography.headingFont !== 'inherit' ? brand.typography.headingFont : 'Inter';
  const bodyFont = brand?.typography?.bodyFont && brand.typography.bodyFont !== 'inherit' ? brand.typography.bodyFont : 'Inter';
  const brandThemeMode = brand?.tokens?.themeMode || 'light';
  const isDark = brandThemeMode === 'dark' || brandThemeMode === 'glass' || tutorData.branding?.layoutMode === 'dark';

  if (tutorData.isEnterprise) {
    const companyColor = primaryColor;
    const companyName = tutorData.company?.name || tutorData.displayName;
    const companySlogan = tutorData.company?.slogan || 'Organización Educativa Multi-Tenant & Centro de Formación Especializada';
    const tutorsList = tutorData.companyTutors || [];

    return (
      <div 
        className={cn(
          "min-h-screen transition-colors duration-500", 
          isDark ? "bg-foreground text-muted dark" : "bg-[#F8FAFC] text-foreground"
        )}
        style={{
          fontFamily: bodyFont,
          '--brand-color': companyColor,
          '--brand-color-alpha': `${companyColor}20`,
          '--brand-secondary': secondaryColor,
          '--brand-accent': accentColor,
          '--primary': hexToHsl(companyColor)
        } as React.CSSProperties}
      >
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=${headingFont.replace(/\s+/g, '+')}&family=${bodyFont.replace(/\s+/g, '+')}&display=swap');
          :root {
            --primary: ${hexToHsl(companyColor)};
            --brand-color: ${companyColor};
            --brand-color-rgb: ${hexToRgb(companyColor)};
            --brand-secondary: ${secondaryColor};
            --brand-accent: ${accentColor};
          }
          ::selection { background: var(--brand-color-alpha); }
          .text-brand { color: var(--brand-color); }
          .bg-brand { background-color: var(--brand-color); }
          .border-brand { border-color: var(--brand-color); }
          .hover\\:bg-brand\\/10:hover { background-color: var(--brand-color-alpha); }
          .font-headline { font-family: "${headingFont}", sans-serif !important; }
          .font-body { font-family: "${bodyFont}", sans-serif !important; }
        `}</style>

        {/* Institutional Contact Bar */}
        <div className={cn("border-b sticky top-0 z-50 transition-colors duration-500 backdrop-blur-md", isDark ? "bg-foreground/90 border-foreground" : "bg-white/90 border-border")}>
          <div className="container mx-auto px-6 h-12 flex items-center justify-between text-xs md:text-sm">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider py-0.5 px-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 whitespace-nowrap">
                Institución Educativa Verificada
              </Badge>
              {tutorData.email && (
                <a href={`mailto:${tutorData.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-brand transition-colors whitespace-nowrap">
                  <Mail className="h-3.5 w-3.5" />
                  {tutorData.email}
                </a>
              )}
              {tutorData.socialLinks.phone && (
                <a href={`tel:${tutorData.socialLinks.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-brand transition-colors whitespace-nowrap">
                  <Phone className="h-3.5 w-3.5" />
                  {tutorData.socialLinks.phone}
                </a>
              )}
              {(tutorData.company?.website || tutorData.socialLinks.website) && (
                <a href={ensureAbsoluteUrl(tutorData.company?.website || tutorData.socialLinks.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-muted-foreground hover:text-brand transition-colors whitespace-nowrap">
                  <Globe className="h-3.5 w-3.5" />
                  Sitio Web Oficial
                </a>
              )}
            </div>
            <div className="hidden md:flex items-center gap-4">
              {tutorData.socialLinks.linkedin && (
                <a href={ensureAbsoluteUrl(tutorData.socialLinks.linkedin)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand transition-colors" title="LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {tutorData.socialLinks.instagram && (
                <a href={ensureAbsoluteUrl(tutorData.socialLinks.instagram)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand transition-colors" title="Instagram">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {tutorData.socialLinks.youtube && (
                <a href={ensureAbsoluteUrl(tutorData.socialLinks.youtube)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand transition-colors" title="YouTube">
                  <Youtube className="h-4 w-4" />
                </a>
              )}
              {tutorData.socialLinks.twitter && (
                <a href={ensureAbsoluteUrl(tutorData.socialLinks.twitter)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand transition-colors" title="Twitter">
                  <Twitter className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Institutional Hero Banner */}
        <div 
          className="relative overflow-hidden text-white border-b border-border transition-colors duration-500"
          style={{
            background: isDark
              ? `linear-gradient(135deg, ${companyColor} 0%, #090d16 100%)`
              : `linear-gradient(135deg, ${companyColor} 0%, #0f172a 100%)`
          }}
        >
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
          <div 
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-35 pointer-events-none" 
            style={{ backgroundColor: accentColor || companyColor }} 
          />
          
          <div className="container mx-auto px-6 relative z-10 py-16 lg:py-20">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10">
              {/* Institutional Logo / Shield */}
              <div className="relative shrink-0">
                <div className="w-40 h-40 lg:w-48 lg:h-48 rounded-xl overflow-hidden border-2 border-white/20 bg-slate-900 shadow-2xl flex items-center justify-center p-3 relative">
                  {tutorData.company?.logoUrl || tutorData.photo ? (
                    <Image 
                      src={tutorData.company?.logoUrl || tutorData.photo} 
                      alt={companyName}
                      fill
                      sizes="192px"
                      className="object-contain p-3"
                      priority
                      unoptimized
                    />
                  ) : (
                    <Building2 className="w-20 h-20 text-white/70" />
                  )}
                </div>
              </div>
              
              {/* Institutional Summary */}
              <div className="flex-1 space-y-5 text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                  <Badge className="bg-primary/20 text-white border border-primary/40 px-3 py-1 uppercase text-[10px] font-black tracking-widest backdrop-blur-md">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-primary" /> Organización Acreditada
                  </Badge>
                  <Badge className="bg-white/10 text-white/90 border border-white/20 px-3 py-1 uppercase text-[10px] font-black tracking-widest backdrop-blur-md">
                    <Users className="h-3.5 w-3.5 mr-1.5 text-white/80" /> Claustro Docente ({tutorsList.length})
                  </Badge>
                  <Badge className="bg-white/10 text-white/90 border border-white/20 px-3 py-1 uppercase text-[10px] font-black tracking-widest backdrop-blur-md">
                    <Award className="h-3.5 w-3.5 mr-1.5 text-amber-400" /> Multi-Tenant Academic Core
                  </Badge>
                </div>
                
                <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                  {companyName}
                </h1>
                
                {tutorData.websiteConfig?.headline && (
                  <h2 className="text-xl sm:text-2xl font-bold text-white/95 max-w-3xl leading-snug">
                    {tutorData.websiteConfig.headline}
                  </h2>
                )}

                <p className="text-base sm:text-lg text-white/80 font-medium max-w-3xl leading-relaxed">
                  {tutorData.websiteConfig?.subheadline || companySlogan}
                </p>

                {tutorData.websiteConfig?.mission && (
                  <div className="p-4 sm:p-5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md max-w-3xl flex items-start gap-3 text-left">
                    <Sparkles className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Misión Corporativa</p>
                      <p className="text-sm font-medium text-white italic">
                        &ldquo;{tutorData.websiteConfig.mission}&rdquo;
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                  <Button 
                    size="lg" 
                    className="h-12 px-7 rounded-xl font-bold bg-white text-slate-950 hover:bg-slate-100 shadow-sm"
                    onClick={() => setActiveTab('institucion')}
                  >
                    <Building2 className="h-4 w-4 mr-2" /> Presentación Institucional
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="h-12 px-7 rounded-xl font-bold border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md"
                    onClick={() => setActiveTab('programas')}
                  >
                    <BookOpen className="h-4 w-4 mr-2" /> Catálogo Académico ({courses.length})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="h-12 px-7 rounded-xl font-bold border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md"
                    onClick={() => setActiveTab('staff')}
                  >
                    <Users className="h-4 w-4 mr-2" /> Staff Docente ({tutorsList.length})
                  </Button>
                  {tutorData.socialLinks.whatsapp && (
                    <Button 
                      variant="outline" 
                      size="lg" 
                      asChild
                      className="h-12 px-6 rounded-xl font-bold border-emerald-500/40 bg-emerald-500/10 text-white hover:bg-emerald-500/20 backdrop-blur-md"
                    >
                      <a href={`https://wa.me/${tutorData.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4 mr-2 text-emerald-400" /> Contacto Institucional
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Institutional Metrics Banner */}
        <div className="container mx-auto px-6 -mt-8 relative z-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-xl border border-border bg-card shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-foreground font-headline">
                    {tutorsList.length || 1}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cuerpo Docente
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-card shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-foreground font-headline">
                    {courses.length || tutorData.stats.totalCourses}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Programas Activos
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-card shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-foreground font-headline">
                    {tutorData.stats.totalStudents || 0}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Alumnos Formados
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-card shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Star className="h-6 w-6 fill-amber-500" />
                </div>
                <div>
                  <div className="text-2xl font-black text-foreground font-headline">
                    {tutorData.stats.avgRating || 4.9} <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Calidad Promedio
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Institutional Navigation Tabs */}
        <div className={cn("sticky top-12 z-40 border-b mt-10 transition-all duration-500", isDark ? "bg-foreground/95 border-foreground" : "bg-white/95 border-border")}>
          <div className="container mx-auto px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-transparent h-16 w-full justify-start gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
                <TabsTrigger 
                  value="institucion" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full px-4 gap-2 font-bold uppercase tracking-wider text-xs transition-all"
                >
                  <Building2 className="h-4 w-4" /> Presentación Institucional
                </TabsTrigger>
                <TabsTrigger 
                  value="programas" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full px-4 gap-2 font-bold uppercase tracking-wider text-xs transition-all"
                >
                  <BookOpen className="h-4 w-4" /> Catálogo Académico ({courses.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="staff" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full px-4 gap-2 font-bold uppercase tracking-wider text-xs transition-all"
                >
                  <Users className="h-4 w-4" /> Staff Docente ({tutorsList.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="calidad" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full px-4 gap-2 font-bold uppercase tracking-wider text-xs transition-all"
                >
                  <ShieldCheck className="h-4 w-4" /> Calidad & Acreditaciones
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Main Content Area for Enterprise */}
        <div className="container mx-auto px-6 py-12">
          <Tabs value={activeTab} className="w-full">
            
            {/* TAB 1: Catálogo Académico */}
            <TabsContent value="programas" className="m-0 space-y-10 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8 border-border">
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-primary">Catálogo Oficial</p>
                  <h2 className="font-headline text-3xl md:text-4xl font-black text-foreground tracking-tight">
                    Programas de Formación y Certificación
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Cursos y especializaciones diseñados para potenciar habilidades clave con certificación institucional.
                  </p>
                </div>
                <div className="relative w-full md:w-80">
                  <Star className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar curso o programa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none text-sm font-medium bg-background border-border focus:border-primary transition-all"
                  />
                </div>
              </div>

              {filteredCourses.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredCourses.map((course) => (
                    <div key={course.salesPageId || course.id} className="transition-all">
                      <CourseCard course={course} showTutor={true} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card space-y-4">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="font-headline text-lg font-bold text-foreground">No se encontraron cursos activos</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {searchTerm ? 'Intenta modificar el término de búsqueda.' : 'La institución está preparando nuevos programas académicos para el próximo ciclo.'}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Staff Docente (CRITICAL REQ) */}
            <TabsContent value="staff" className="m-0 space-y-10 animate-in fade-in duration-500">
              <div className="p-8 rounded-xl border border-border bg-card">
                <div className="max-w-3xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
                      Claustro de Especialistas
                    </Badge>
                  </div>
                  <h2 className="font-headline text-3xl font-black text-foreground tracking-tight">
                    Staff Docente y Mentores de la Organización
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Nuestros programas son dictados por profesionales líderes con amplia experiencia práctica en sus disciplinas. Haz clic en el perfil de cada tutor para conocer su trayectoria, especialidades y programas individuales.
                  </p>
                </div>
              </div>

              {tutorsList.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tutorsList.map((tutor) => (
                    <Card key={tutor.id} className="rounded-xl border border-border bg-card hover:border-primary/40 transition-all duration-300 shadow-none flex flex-col justify-between">
                      <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                        <div>
                          <div className="flex items-start gap-4">
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border shrink-0 bg-muted">
                              <Image 
                                src={tutor.photo || `https://api.dicebear.com/7.x/adventurer/svg?seed=${tutor.username || tutor.id}`} 
                                alt={tutor.displayName} 
                                fill 
                                className="object-cover" 
                                sizes="64px" 
                                unoptimized 
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                Docente Acreditado
                              </Badge>
                              <h3 className="font-headline font-bold text-lg text-foreground mt-1 truncate">
                                {tutor.displayName}
                              </h3>
                              <p className="text-xs text-muted-foreground truncate">
                                {tutor.email || `@${tutor.username}`}
                              </p>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-3 mt-4 leading-relaxed">
                            {tutor.bio || 'Docente especializado y miembro activo del equipo académico de la organización.'}
                          </p>

                          {tutor.expertise && tutor.expertise.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-4">
                              {tutor.expertise.map((exp: string) => (
                                <Badge key={exp} variant="secondary" className="text-[11px] font-normal">
                                  {exp}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-border space-y-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Users className="h-3.5 w-3.5 text-primary" /> {tutor.assignedStudentsCount || 0} alumnos asesorados
                            </span>
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Verificado
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              className="w-full font-bold text-xs hover:bg-muted"
                              onClick={() => setSelectedTutorPresentation(tutor)}
                            >
                              Presentación
                            </Button>
                            <Button 
                              asChild 
                              size="sm" 
                              className="w-full font-bold text-xs group bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <Link href={`/tutor/${tutor.username}`}>
                                <span>Ver Página</span>
                                <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card space-y-4">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="font-headline text-lg font-bold text-foreground">Convocatoria docente en curso</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    La institución se encuentra incorporando y acreditando nuevos tutores docentes para sus próximas cohortes.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* TAB: Presentación Institucional */}
            <TabsContent value="institucion" className="m-0 space-y-10 animate-in fade-in duration-500">
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Perfil & Misión Institucional Card */}
                  <div className="p-8 lg:p-10 rounded-xl border border-border bg-card space-y-6">
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">Perfil & Misión Institucional</p>
                      <h2 className="font-headline text-2xl lg:text-3xl font-black text-foreground">
                        {tutorData.websiteConfig?.headline || 'Compromiso con la Excelencia Académica'}
                      </h2>
                      {tutorData.websiteConfig?.subheadline && (
                        <p className="text-base font-semibold text-foreground/90 leading-relaxed">
                          {tutorData.websiteConfig.subheadline}
                        </p>
                      )}
                    </div>

                    {tutorData.websiteConfig?.mission && (
                      <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          Misión Corporativa
                        </div>
                        <p className="text-base font-medium text-foreground italic leading-relaxed">
                          &ldquo;{tutorData.websiteConfig.mission}&rdquo;
                        </p>
                      </div>
                    )}

                    <div className="space-y-2 pt-2 border-t border-border">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quiénes Somos</p>
                      <p className="text-sm sm:text-base leading-relaxed text-muted-foreground whitespace-pre-line">
                        {getCleanInstitutionalBio(tutorData.bio, tutorData.websiteConfig?.aboutUs, companyName)}
                      </p>
                    </div>
                  </div>

                  {/* Pilares Institucionales con 3 Imágenes Profesionales */}
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">Nuestros Fundamentos</p>
                      <h3 className="font-headline text-2xl font-black text-foreground">
                        Pilares Estratégicos & Formativos
                      </h3>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      {((tutorData.websiteConfig?.pilares && tutorData.websiteConfig.pilares.length > 0 && tutorData.websiteConfig.pilares.some(p => p.titulo))
                        ? tutorData.websiteConfig.pilares.filter(p => p.titulo).map((p, idx) => ({
                            ...p,
                            imageUrl: p.imageUrl || DEFAULT_PILLAR_IMAGES[idx] || DEFAULT_PILLAR_IMAGES[0]
                          }))
                        : [
                            {
                              titulo: 'Mentoría Activa',
                              descripcion: 'Acompañamiento personalizado y seguimiento individual por parte de tutores designados.',
                              imageUrl: DEFAULT_PILLAR_IMAGES[0]
                            },
                            {
                              titulo: 'Proyectos Reales',
                              descripcion: 'Evaluación basada en entregables prácticos y resolución de desafíos de la industria.',
                              imageUrl: DEFAULT_PILLAR_IMAGES[1]
                            },
                            {
                              titulo: 'Certificación de Alto Nivel',
                              descripcion: 'Emisión de credenciales oficiales verificables respaldadas por la organización.',
                              imageUrl: DEFAULT_PILLAR_IMAGES[2]
                            }
                          ]
                      ).map((pilar, idx) => (
                        <Card key={idx} className="rounded-xl border border-border bg-card overflow-hidden shadow-none flex flex-col justify-between hover:border-primary/40 transition-all duration-300">
                          <div>
                            <div className="relative w-full h-44 bg-muted overflow-hidden">
                              <Image 
                                src={pilar.imageUrl || DEFAULT_PILLAR_IMAGES[idx] || DEFAULT_PILLAR_IMAGES[0]} 
                                alt={pilar.titulo}
                                fill
                                className="object-cover transition-transform duration-500 hover:scale-105"
                                sizes="(max-width: 768px) 100vw, 33vw"
                                unoptimized
                              />
                              <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-slate-950/80 backdrop-blur-md text-white flex items-center justify-center font-black text-xs border border-white/20">
                                0{idx + 1}
                              </div>
                            </div>
                            <CardContent className="p-5 space-y-2">
                              <h4 className="font-headline font-bold text-base text-foreground leading-snug">
                                {pilar.titulo}
                              </h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {pilar.descripcion}
                              </p>
                            </CardContent>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                  <Card className="rounded-xl border border-border bg-card shadow-sm">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="font-headline text-lg font-bold text-foreground">Canales de Contacto Oficial</h3>
                      <div className="space-y-3">
                        {tutorData.email && (
                          <a href={`mailto:${tutorData.email}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-sm">
                            <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Mail className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">Email Institucional</div>
                              <div className="font-medium truncate text-foreground">{tutorData.email}</div>
                            </div>
                          </a>
                        )}
                        {tutorData.socialLinks.whatsapp && (
                          <a href={`https://wa.me/${tutorData.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-emerald-500/10 transition-colors text-sm">
                            <div className="w-9 h-9 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                              <MessageCircle className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">WhatsApp Empresa</div>
                              <div className="font-medium text-foreground">Atención y Consultas</div>
                            </div>
                          </a>
                        )}
                        {(tutorData.company?.website || tutorData.socialLinks.website) && (
                          <a href={ensureAbsoluteUrl(tutorData.company?.website || tutorData.socialLinks.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-sm">
                            <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Globe className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">Portal Web</div>
                              <div className="font-medium truncate text-foreground">Acceso Corporativo</div>
                            </div>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Calidad y Acreditaciones */}
            <TabsContent value="calidad" className="m-0 space-y-10 animate-in fade-in duration-500">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tutorData.websiteConfig?.badges && tutorData.websiteConfig.badges.length > 0 && tutorData.websiteConfig.badges.some(b => b.label) ? (
                  tutorData.websiteConfig.badges.filter(b => b.label).map((badge, idx) => (
                    <Card key={idx} className="rounded-xl border border-border bg-card shadow-sm">
                      <CardContent className="p-8 space-y-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                          <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h3 className="font-headline text-xl font-bold text-foreground">{badge.label}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {badge.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <>
                    <Card className="rounded-xl border border-border bg-card shadow-sm">
                      <CardContent className="p-8 space-y-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                          <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h3 className="font-headline text-xl font-bold text-foreground">Acreditación Académica Continua</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Nuestra institución cumple con los estándares pedagógicos y de gobernanza académica de la red BTECH Academy, garantizando contenidos actualizados y planes de estudio transparentes.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border border-border bg-card shadow-sm">
                      <CardContent className="p-8 space-y-3">
                        <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h3 className="font-headline text-xl font-bold text-foreground">Gobernanza y Rol Docente Certificado</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Cada tutor asociado es verificado en identidad y competencias específicas antes de asumir la titularidad de cátedra o la asignación de mentorías estudiantiles.
                        </p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>

          </Tabs>
        </div>

        {/* Modal de Presentación Invocada del Mentor */}
        <Dialog open={Boolean(selectedTutorPresentation)} onOpenChange={(open) => !open && setSelectedTutorPresentation(null)}>
          <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border border-border bg-card">
            {selectedTutorPresentation && (
              <div>
                <div className="p-6 bg-primary text-white relative">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-white/30 bg-muted shrink-0">
                      <Image 
                        src={selectedTutorPresentation.photo || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedTutorPresentation.username || selectedTutorPresentation.id}`}
                        alt={selectedTutorPresentation.displayName}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-bold uppercase tracking-wider">
                        Docente Acreditado
                      </Badge>
                      <DialogTitle className="font-headline font-bold text-xl text-white truncate">
                        {selectedTutorPresentation.displayName}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-white/80 truncate">
                        {companyName} • {selectedTutorPresentation.email || `@${selectedTutorPresentation.username}`}
                      </DialogDescription>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Trayectoria y Presentación
                    </p>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                      {selectedTutorPresentation.bio || 'Docente especializado y miembro activo del equipo académico de la organización.'}
                    </p>
                  </div>

                  {selectedTutorPresentation.expertise && selectedTutorPresentation.expertise.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Áreas de Especialidad
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTutorPresentation.expertise.map((exp: string) => (
                          <Badge key={exp} variant="secondary" className="text-xs font-normal">
                            {exp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Respaldo Institucional
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Docente oficial adscrito al claustro de <strong>{companyName}</strong>. Sus intervenciones y tutorías son avaladas por la organización.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setSelectedTutorPresentation(null)}
                      className="rounded-xl font-bold"
                    >
                      Cerrar
                    </Button>
                    <Button 
                      asChild 
                      className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Link href={`/tutor/${selectedTutorPresentation.username}`}>
                        <span>Ver Página Completa</span>
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Institutional Footer */}
        <footer className={cn("border-t mt-20 pt-16 pb-8 transition-colors duration-500", isDark ? "bg-foreground border-foreground" : "bg-white border-border")}>
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-10 mb-12">
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold bg-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-headline text-xl font-black text-foreground">{companyName}</h3>
                </div>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  {companySlogan}
                </p>
                <div className="text-xs text-muted-foreground">
                  Organización Multi-Tenant verificada • Plataforma BTECH Academy
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-sm uppercase tracking-wider text-foreground">Navegación</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="cursor-pointer hover:text-primary transition-colors" onClick={() => setActiveTab('programas')}>Catálogo de Programas</div>
                  <div className="cursor-pointer hover:text-primary transition-colors" onClick={() => setActiveTab('staff')}>Staff de Tutores ({tutorsList.length})</div>
                  <div className="cursor-pointer hover:text-primary transition-colors" onClick={() => setActiveTab('institucion')}>Sobre la Institución</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-sm uppercase tracking-wider text-foreground">Canales Oficiales</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {tutorData.email && <div>{tutorData.email}</div>}
                  {tutorData.socialLinks.phone && <div>{tutorData.socialLinks.phone}</div>}
                  {tutorData.socialLinks.whatsapp && <div>WhatsApp Disponible</div>}
                </div>
              </div>
            </div>

            <div className="border-t pt-8 text-center text-xs text-muted-foreground">
              <p>© {new Date().getFullYear()} {companyName}. Todos los derechos reservados. Powered by BTECH Academy.</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "min-h-screen transition-colors duration-500", 
        isDark ? "bg-foreground text-muted dark" : "bg-[#FAFAFA] text-foreground"
      )}
      style={{
        fontFamily: bodyFont,
        '--brand-color': primaryColor,
        '--brand-color-alpha': `${primaryColor}20`,
        '--brand-secondary': secondaryColor,
        '--brand-accent': accentColor,
        '--primary': hexToHsl(primaryColor)
      } as React.CSSProperties}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=${headingFont.replace(/\s+/g, '+')}&family=${bodyFont.replace(/\s+/g, '+')}&display=swap');
        :root {
          --primary: ${hexToHsl(primaryColor)};
          --brand-color: ${primaryColor};
          --brand-color-rgb: ${hexToRgb(primaryColor)};
          --brand-secondary: ${secondaryColor};
          --brand-accent: ${accentColor};
        }
        ::selection { background: var(--brand-color-alpha); }
        .text-brand { color: var(--brand-color); }
        .bg-brand { background-color: var(--brand-color); }
        .border-brand { border-color: var(--brand-color); }
        .hover\\:bg-brand\\/10:hover { background-color: var(--brand-color-alpha); }
        .font-headline { font-family: "${headingFont}", sans-serif !important; }
        .font-body { font-family: "${bodyFont}", sans-serif !important; }
      `}</style>
      
      {/* Top Contact Bar */}
      <div className={cn("border-b sticky top-0 z-50 transition-colors duration-500 backdrop-blur-md", isDark ? "bg-foreground/80 border-foreground" : "bg-white/80 border-border")}>
        <div className="container mx-auto px-6 h-12 flex items-center justify-between text-xs md:text-sm">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {tutorData.isCompanyTutor && tutorData.company && (
              <Link 
                href={`/tutor/${tutorData.company.slug || tutorData.company.id}`}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-white/10 text-brand border border-brand/20 hover:bg-brand/10 transition-colors whitespace-nowrap"
              >
                <Building2 className="h-3.5 w-3.5" />
                {tutorData.company.name}
              </Link>
            )}
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
          <div className={cn("absolute inset-0", isDark ? "bg-gradient-to-br from-foreground via-foreground/60 to-transparent" : "bg-gradient-to-br from-black/70 via-black/30 to-transparent")} />
          
          <div className="container mx-auto px-6 relative z-10 py-16">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="relative group shrink-0">
                <div 
                  className="absolute -inset-4 rounded-lg blur-2xl opacity-40 animate-pulse" 
                  style={{ backgroundColor: primaryColor }}
                />
                <div className={cn("relative w-48 h-48 lg:w-64 lg:h-64 rounded-lg overflow-hidden border-8 transition-transform duration-500 group-hover:scale-[1.02]", isDark ? "border-foreground" : "border-white")}>
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
                    {tutorData.isCompanyTutor && tutorData.company ? (
                      <Link href={`/tutor/${tutorData.company.slug || tutorData.company.id}`}>
                        <Badge className="bg-white/20 text-white border border-white/30 backdrop-blur-md px-4 py-1 uppercase text-[10px] font-black tracking-widest hover:bg-white/30 transition-all cursor-pointer flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-amber-300" />
                          Docente Oficial • {tutorData.company.name}
                        </Badge>
                      </Link>
                    ) : (
                      <Badge className="bg-white/20 text-white border-none backdrop-blur-md px-4 py-1 uppercase text-[10px] font-black tracking-widest">
                        Mentor Certificado BTECH
                      </Badge>
                    )}
                  </div>
                  <h1 className="font-headline text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none">
                    {tutorData.websiteConfig?.headline || tutorData.displayName}
                  </h1>
                </div>
                
                <p className="text-xl lg:text-2xl text-white/90 font-medium max-w-2xl leading-relaxed">
                  {tutorData.websiteConfig?.subheadline || tutorData.bio.substring(0, 150) + '...'}
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                  {tutorData.isCompanyTutor ? (
                    <>
                      <Button 
                        size="lg" 
                        className="h-14 px-8 rounded-2xl bg-white text-foreground hover:bg-muted font-black text-base shadow-sm"
                        onClick={() => {
                          setActiveTab('presentacion');
                          setTimeout(() => {
                            const el = document.getElementById('presentacion-section');
                            el?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                      >
                        <Users className="h-5 w-5 mr-2" /> Conocer Trayectoria
                      </Button>
                      {tutorData.company && (
                        <Button 
                          variant="outline" 
                          size="lg" 
                          asChild
                          className="h-14 px-8 rounded-2xl border-2 border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 font-bold"
                        >
                          <Link href={`/tutor/${tutorData.company.slug || tutorData.company.id}`}>
                            <Building2 className="h-5 w-5 mr-2 text-amber-300" /> Portal de la Empresa
                          </Link>
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button 
                      size="lg" 
                      className="h-14 px-10 rounded-2xl bg-white text-foreground hover:bg-muted font-black text-lg"
                      onClick={() => {
                        setActiveTab('academia');
                        setTimeout(() => {
                          const el = document.getElementById('programas');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                    >
                      Ver Programas
                    </Button>
                  )}
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
      <div className={cn("sticky top-12 z-40 border-b transition-all duration-500", isDark ? "bg-foreground/90 border-foreground" : "bg-white/90 border-border")}>
        <div className="container mx-auto px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-20 w-full justify-center lg:justify-start gap-8">
              {tutorData.isCompanyTutor ? (
                <>
                  <TabsTrigger 
                    value="presentacion" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-brand rounded-none h-full px-4 gap-2 font-black uppercase tracking-widest text-[10px] md:text-xs transition-all"
                  >
                    <Users className="h-4 w-4" /> Presentación y Trayectoria
                  </TabsTrigger>
                  <TabsTrigger 
                    value="metodologia" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-brand rounded-none h-full px-4 gap-2 font-black uppercase tracking-widest text-[10px] md:text-xs transition-all"
                  >
                    <Sparkles className="h-4 w-4" /> Metodología de Formación
                  </TabsTrigger>
                  <TabsTrigger 
                    value="acreditacion" 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-brand rounded-none h-full px-4 gap-2 font-black uppercase tracking-widest text-[10px] md:text-xs transition-all"
                  >
                    <ShieldCheck className="h-4 w-4" /> Acreditación y Autoridad
                  </TabsTrigger>
                </>
              ) : (
                <>
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
                </>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-6 py-12">
        <Tabs value={activeTab} className="w-full">
          {tutorData.isCompanyTutor ? (
            <>
              {/* TAB 1: PRESENTACIÓN Y TRAYECTORIA */}
              <TabsContent value="presentacion" id="presentacion-section" className="m-0 space-y-12 animate-in fade-in duration-500">
                {/* Banner de Afiliación Institucional */}
                {tutorData.company && (
                  <div className="p-6 md:p-8 rounded-xl border border-primary/20 bg-primary/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      {tutorData.company.logoUrl ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white border border-border shrink-0 p-1.5 shadow-sm">
                          <Image src={tutorData.company.logoUrl} alt={tutorData.company.name} fill className="object-contain" unoptimized />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Building2 className="h-8 w-8" />
                        </div>
                      )}
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
                          Claustro Académico Corporativo
                        </Badge>
                        <h3 className="font-headline font-bold text-xl text-foreground">
                          Docente Oficial en {tutorData.company.name}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {tutorData.company.slogan || 'Organización Educativa Multi-Tenant & Centro de Formación Especializada'}
                        </p>
                      </div>
                    </div>
                    <Button asChild variant="outline" className="shrink-0 font-bold border-primary/40 hover:bg-primary hover:text-primary-foreground">
                      <Link href={`/tutor/${tutorData.company.slug || tutorData.company.id}`}>
                        <Building2 className="h-4 w-4 mr-2" /> Visitar Portal Institucional
                      </Link>
                    </Button>
                  </div>
                )}

                <div className="grid lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-10">
                    {/* Bio Section */}
                    <div className={cn("p-8 lg:p-12 rounded-xl border relative overflow-hidden transition-all duration-500", isDark ? "bg-foreground/40 border-foreground" : "bg-white border-border shadow-sm")}>
                      <div className="space-y-2 mb-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand/80">Trayectoria & Visión</p>
                        <h2 className="font-headline text-3xl font-black text-foreground dark:text-white tracking-tight">
                          Acerca del <span className="text-brand">Docente</span>
                        </h2>
                      </div>
                      <div className={cn("text-base md:text-lg leading-relaxed whitespace-pre-wrap font-medium", isDark ? "text-border" : "text-muted-foreground")}>
                        {tutorData.bio || 'Docente especializado y miembro activo del equipo de formación académica.'}
                      </div>

                      {tutorData.expertise && tutorData.expertise.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-border space-y-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Especialidades & Disciplinas</p>
                          <div className="flex flex-wrap gap-2">
                            {tutorData.expertise.map((exp: string) => (
                              <Badge key={exp} variant="secondary" className="text-xs font-semibold px-3 py-1">
                                {exp}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-1 space-y-6">
                    <Card className={cn("border border-border shadow-sm rounded-xl", isDark ? "bg-foreground" : "bg-white")}>
                      <CardContent className="p-8 space-y-6">
                        <h3 className="font-headline text-xl font-bold text-brand">Contacto Directo</h3>
                        <div className="space-y-4">
                          {tutorData.email && (
                            <a href={`mailto:${tutorData.email}`} className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-brand/5 transition-colors group">
                              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-all">
                                <Mail className="h-5 w-5" />
                              </div>
                              <span className="text-sm font-medium truncate">{tutorData.email}</span>
                            </a>
                          )}
                          {tutorData.socialLinks.whatsapp && (
                            <a href={`https://wa.me/${tutorData.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-emerald-500/10 transition-colors group">
                              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                <MessageCircle className="h-5 w-5" />
                              </div>
                              <span className="text-sm font-medium">WhatsApp Directo</span>
                            </a>
                          )}
                          {tutorData.socialLinks.calendly && (
                            <a href={ensureAbsoluteUrl(tutorData.socialLinks.calendly)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-brand/5 transition-colors group">
                              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-all">
                                <Calendar className="h-5 w-5" />
                              </div>
                              <span className="text-sm font-medium">Agendar Llamada</span>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Respaldo Institucional Callout */}
                    <div className="p-6 rounded-xl border border-border bg-card space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        Gobernanza Institucional
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Este perfil docente está adscrito oficialmente a <strong>{tutorData.company?.name || 'la empresa'}</strong>. La facturación, certificaciones y programas formativos son gestionados centralmente por la institución.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: METODOLOGÍA Y PILARES */}
              <TabsContent value="metodologia" className="m-0 space-y-12 animate-in fade-in duration-500">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand/80">Pilares Pedagógicos</p>
                    <h2 className="font-headline text-3xl font-black text-foreground dark:text-white tracking-tight">
                      Metodología de <span className="text-brand">Enseñanza & Acompañamiento</span>
                    </h2>
                  </div>
                  {tutorData.websiteConfig?.mission && (
                    <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 max-w-3xl">
                      <p className="text-xs font-bold uppercase text-primary tracking-wider mb-1">Misión Docente</p>
                      <p className="text-base font-semibold text-foreground italic">
                        &ldquo;{tutorData.websiteConfig.mission}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {(tutorData.websiteConfig?.pilares && tutorData.websiteConfig.pilares.length > 0 ? tutorData.websiteConfig.pilares : [
                    { titulo: 'Fundamentos Rigurosos', descripcion: 'Transferencia directa de marcos teóricos y prácticos orientados a resultados medibles.' },
                    { titulo: 'Acompañamiento Práctico', descripcion: 'Resolución de dudas en tiempo real y orientación continua a los alumnos.' },
                    { titulo: 'Excelencia y Ética', descripcion: 'Garantía de calidad académica y apego a los estándares del programa corporativo.' }
                  ]).map((pilar, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "p-8 rounded-xl border transition-all duration-300 relative overflow-hidden",
                        isDark ? "bg-foreground/60 border-foreground" : "bg-white border-border shadow-sm"
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-black text-xl mb-6">
                        0{i + 1}
                      </div>
                      <h3 className="font-headline text-xl font-bold mb-3 text-foreground dark:text-white">
                        {pilar.titulo}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {pilar.descripcion}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* TAB 3: ACREDITACIÓN Y EXPERIENCIA */}
              <TabsContent value="acreditacion" className="m-0 space-y-12 animate-in fade-in duration-500">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tutorData.websiteConfig?.badges && tutorData.websiteConfig.badges.length > 0 && tutorData.websiteConfig.badges.some(b => b.label) ? (
                    tutorData.websiteConfig.badges.filter(b => b.label).map((badge, idx) => (
                      <Card key={idx} className="rounded-xl border border-border bg-card shadow-sm">
                        <CardContent className="p-8 space-y-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                            <ShieldCheck className="h-6 w-6" />
                          </div>
                          <h3 className="font-headline text-xl font-bold text-foreground">{badge.label}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {badge.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <>
                      <Card className="rounded-xl border border-border bg-card shadow-sm">
                        <CardContent className="p-8 space-y-3">
                          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                            <CheckCircle2 className="h-6 w-6" />
                          </div>
                          <h3 className="font-headline text-xl font-bold text-foreground">Claustro Académico Verificado</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Docente acreditado y respaldado oficialmente por <strong>{tutorData.company?.name || 'la empresa'}</strong>.
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="rounded-xl border border-border bg-card shadow-sm">
                        <CardContent className="p-8 space-y-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                            <ShieldCheck className="h-6 w-6" />
                          </div>
                          <h3 className="font-headline text-xl font-bold text-foreground">Estándares Pedagógicos BTECH</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            El mentor cumple con los criterios de formación continua, actualización disciplinar y rigor metodológico de la red.
                          </p>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </TabsContent>
            </>
          ) : (
            <>
              {/* TAB 1: ACADEMIA - Programs */}
              <TabsContent value="academia" className="m-0 space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Courses Section */}
                {courses.length > 0 && (
                  <div id="programas" className="space-y-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-12 border-border dark:border-foreground">
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand/60">Catálogo Premium</p>
                        <h2 className="font-headline text-3xl md:text-5xl font-black text-foreground dark:text-white tracking-tighter leading-none">
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
                              ? "bg-foreground/50 border-foreground text-muted placeholder:text-muted-foreground focus:bg-foreground" 
                              : "bg-white border-border focus:ring-4 focus:ring-brand/10"
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {filteredCourses.map((course) => (
                        <div key={course.salesPageId || course.id} className={cn("transition-all", isDark && "[&>div]:bg-foreground [&>div]:border-foreground [&_h3]:text-muted [&_p]:text-muted-foreground [&_.text-primary]:!text-brand")}>
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
                    <div className={cn("p-10 lg:p-16 rounded-lg border relative overflow-hidden transition-all duration-500 hover:shadow-brand/5", isDark ? "bg-foreground/40 border-foreground" : "bg-white border-muted shadow-border/50")}>
                      <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                      <div className="space-y-2 mb-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand/80">Historia & Visión</p>
                        <h2 className="font-headline text-3xl md:text-5xl font-black text-foreground dark:text-white tracking-tighter leading-none">
                          Acerca del <span className="text-brand drop-shadow-[0_0_15px_rgba(var(--brand-color-rgb),0.3)]">Mentor</span>
                        </h2>
                      </div>
                      <div className={cn("text-lg md:text-xl leading-relaxed whitespace-pre-wrap font-medium", isDark ? "text-border" : "text-muted-foreground")}>
                        {tutorData.bio}
                      </div>
                    </div>

                    {/* Metodología (Pilares) */}
                    {tutorData.websiteConfig?.pilares && (
                      <div className="space-y-12">
                        <div className="space-y-2 text-center lg:text-left px-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand/80">El camino al éxito</p>
                          <h2 className="font-headline text-3xl md:text-5xl font-black text-foreground dark:text-white tracking-tighter leading-none">
                            Mi Metodología de <span className="text-brand drop-shadow-[0_0_15px_rgba(var(--brand-color-rgb),0.3)]">Transformación</span>
                          </h2>
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-6">
                          {tutorData.websiteConfig.pilares.map((pilar, i) => (
                            <div 
                              key={i} 
                              className={cn(
                                "group p-8 lg:p-10 rounded-lg border transition-all duration-700 hover:-translate-y-2 relative overflow-hidden",
                                isDark ? "bg-foreground/60 border-foreground" : "bg-white border-muted shadow-sm shadow-border/40"
                              )}
                            >
                              <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                              <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center font-black text-2xl mb-8 group-hover:bg-brand group-hover:text-white transition-all duration-500">
                                {i + 1}
                              </div>
                              <h3 className="font-headline text-xl md:text-2xl font-bold mb-4 text-foreground dark:text-white leading-tight">
                                {pilar.titulo}
                              </h3>
                              <p className="text-sm text-muted-foreground dark:text-border leading-relaxed">
                                {pilar.descripcion}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="lg:col-span-1 space-y-8">
                    <Card className={cn("border-none shadow-lg", isDark ? "bg-foreground" : "bg-white")}>
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
                            <a href={`https://wa.me/${tutorData.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl hover:bg-success/10 transition-colors group">
                              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success group-hover:bg-success group-hover:text-white transition-all">
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
                      <Card className={cn("border-none shadow-lg", isDark ? "bg-foreground" : "bg-white")}>
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
                            "p-10 rounded-lg border flex flex-col gap-6 transition-all duration-500 hover:border-brand/30 hover:bg-brand/[0.02]",
                            isDark ? "bg-foreground/60 border-foreground" : "bg-white border-muted shadow-sm"
                          )}
                        >
                          <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ShieldCheck className="h-8 w-8 drop-shadow-[0_0_10px_rgba(var(--brand-color-rgb),0.5)]" />
                          </div>
                          <div className="space-y-3">
                            <h3 className="font-headline text-2xl font-bold text-foreground dark:text-white leading-tight">{badge.label}</h3>
                            <p className="text-muted-foreground dark:text-border leading-relaxed font-medium">{badge.description}</p>
                          </div>
                        </div>
                      ))}
                      <div className={cn("p-10 rounded-lg border border-dashed border-brand/20 flex items-center justify-center text-center", isDark ? "bg-foreground/30" : "bg-brand/5")}>
                        <div className="space-y-2">
                          <Trophy className="h-10 w-10 text-brand/30 mx-auto" />
                          <p className="text-xs font-bold text-brand/50 uppercase tracking-widest">Testimonios y Casos de Éxito en Auditoría</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      <footer className={cn("border-t mt-20 pt-16 pb-8 transition-colors duration-500", isDark ? "bg-foreground border-foreground" : "bg-white border-border")}>
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl bg-brand">
                  {tutorData.displayName.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-headline text-2xl font-bold text-brand">{tutorData.displayName}</h3>
              </div>
              <p className={cn("max-w-sm", isDark ? "text-muted-foreground" : "text-muted-foreground")}>
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
                  <a href={ensureAbsoluteUrl(tutorData.socialLinks.linkedin)} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-foreground" : "bg-muted")}>
                    <Linkedin className="h-5 w-5 text-brand" />
                  </a>
                )}
                {tutorData.socialLinks.instagram && (
                  <a href={ensureAbsoluteUrl(tutorData.socialLinks.instagram)} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-foreground" : "bg-muted")}>
                    <Instagram className="h-5 w-5 text-brand" />
                  </a>
                )}
                {tutorData.socialLinks.youtube && (
                  <a href={ensureAbsoluteUrl(tutorData.socialLinks.youtube)} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-foreground" : "bg-muted")}>
                    <Youtube className="h-5 w-5 text-brand" />
                  </a>
                )}
                {tutorData.socialLinks.twitter && (
                  <a href={ensureAbsoluteUrl(tutorData.socialLinks.twitter)} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-foreground" : "bg-muted")}>
                    <Twitter className="h-5 w-5 text-brand" />
                  </a>
                )}
                {tutorData.socialLinks.tiktok && (
                  <a href={ensureAbsoluteUrl(tutorData.socialLinks.tiktok)} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-foreground" : "bg-muted")}>
                    <TikTokIcon className="h-5 w-5 text-brand" />
                  </a>
                )}
                {tutorData.socialLinks.website && (
                  <a href={ensureAbsoluteUrl(tutorData.socialLinks.website)} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-full transition-colors hover:bg-brand/10", isDark ? "bg-foreground" : "bg-muted")}>
                    <Globe className="h-5 w-5 text-brand" />
                  </a>
                )}
              </div>
            </div>
          </div>
          
          <div className={cn("border-t pt-8 text-center text-sm", isDark ? "border-foreground text-muted-foreground" : "border-border text-muted-foreground")}>
            <p>© {new Date().getFullYear()} {tutorData.displayName}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
