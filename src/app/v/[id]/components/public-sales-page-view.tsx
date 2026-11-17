'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { REFERIDO_SESSION_KEY, LANDING_SESSION_KEY } from '@/lib/leads/manage-lead';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Rocket,
  ShieldCheck,
  Play,
  Award,
  Sparkles,
  CheckCircle2,
  ShoppingCart,
  Instagram,
  Linkedin,
  Twitter,
  MessageCircle,
  Users,
  Globe,
  Youtube,
  Phone,
  Clock,
  AlertTriangle,
  CreditCard,
  Info,
} from 'lucide-react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AtomicRenderer } from './atomic-renderer';
import { CountryCurrencySelector } from '@/components/commerce/country-currency-selector';
import {
  SUPPORTED_COUNTRIES,
  FALLBACK_RATES,
  type CountryInfo,
  type SupportedCurrency,
} from '@/lib/currency/types';
import { convertAmount, convertUsdAmount } from '@/lib/currency/rates-service';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

function getSecureVideoUrl(url: string) {
  if (!url) return '';
  let videoId = '';

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
    else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
    else if (url.includes('embed/')) videoId = url.split('embed/')[1].split('?')[0];
    else if (url.includes('/shorts/')) videoId = url.split('/shorts/')[1].split('?')[0];
    else if (url.includes('/live/')) videoId = url.split('/live/')[1].split('?')[0];
    else return url;

    return `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&iv_load_policy=3&controls=1&hl=es&disablekb=1&fs=0&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
  }

  if (url.includes('vimeo.com')) {
    const vimeoId = url.split('/').pop()?.split('?')[0];
    return `https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0`;
  }

  return url;
}

function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val?.toDate === 'function') return val.toDate();
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val?._seconds === 'number') return new Date(val._seconds * 1000);
  return null;
}

export interface PublicSalesPageViewProps {
  id: string;
  initialPage: any;
  initialCourse?: any;
  initialModules?: any[];
  initialBundleProducts?: any[];
  initialMentorProfile?: any;
  initialPaymentMethods?: any[];
  initialRates?: Record<SupportedCurrency, number>;
  variantIdx?: number;
  isPreview?: boolean;
}

export function PublicSalesPageView({
  id,
  initialPage,
  initialCourse,
  initialModules = [],
  initialBundleProducts = [],
  initialMentorProfile = null,
  initialPaymentMethods = [],
  initialRates = FALLBACK_RATES,
  variantIdx = 0,
  isPreview = false,
}: PublicSalesPageViewProps) {
  const searchParams = useSearchParams();
  const activeVariantIdx = parseInt(searchParams.get('v') || String(variantIdx));

  const { toast } = useToast();
  const { profile } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [loading, setLoading] = useState(false);
  const [page] = useState<any>(initialPage);
  const [course] = useState<any>(initialCourse);
  const [modules] = useState<any[]>(initialModules);
  const [bundleProducts] = useState<any[]>(initialBundleProducts);
  const [mentorProfile] = useState<any>(initialMentorProfile);
  const [mentorPaymentMethods] = useState<any[]>(initialPaymentMethods);
  const [rates, setRates] = useState<Record<SupportedCurrency, number>>(initialRates);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(SUPPORTED_COUNTRIES[0]);
  const [paymentInitPoint, setPaymentInitPoint] = useState<string | null>(null);
  const [transferResult, setTransferResult] = useState<{ referenceCode: string; bankDetails: any; amount: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [activeReferidoId, setActiveReferidoId] = useState<string | null>(null);

  // Sincronización de país y cotizaciones
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fastoria_country_code');
      if (saved) {
        const found = SUPPORTED_COUNTRIES.find((c) => c.code === saved);
        if (found) setSelectedCountry(found);
      }
    } catch {}

    // Si no vinieron rates desde el servidor, consultar como fallback
    if (!initialRates || Object.keys(initialRates).length === 0) {
      fetch('/api/currency/rates')
        .then((res) => res.json())
        .then((data) => {
          if (data?.rates) setRates(data.rates);
        })
        .catch((err) => console.warn('[Landing] Error loading currency rates:', err));
    }
  }, [initialRates]);

  const handleCountryChange = (country: CountryInfo) => {
    setSelectedCountry(country);
    try {
      localStorage.setItem('fastoria_country_code', country.code);
    } catch {}
  };

  // Filtrar métodos de cobro según el país seleccionado
  const filteredPaymentMethods = useMemo(() => {
    return mentorPaymentMethods.filter((method: any) => {
      return selectedCountry.allowedGateways.includes(method.type);
    });
  }, [mentorPaymentMethods, selectedCountry]);

  useEffect(() => {
    if (filteredPaymentMethods.length === 1) {
      setSelectedPaymentType(filteredPaymentMethods[0].type);
    } else if (filteredPaymentMethods.length > 1 && !filteredPaymentMethods.some((m) => m.type === selectedPaymentType)) {
      setSelectedPaymentType(filteredPaymentMethods[0].type);
    } else if (filteredPaymentMethods.length === 0) {
      setSelectedPaymentType(null);
    }
  }, [filteredPaymentMethods, selectedPaymentType]);

  // Auto-completar datos si el usuario está logueado
  useEffect(() => {
    if (profile) {
      if (profile.email && !studentEmail) setStudentEmail(profile.email);
      if (profile.displayName && !studentName) setStudentName(profile.displayName);
    }
  }, [profile, studentEmail, studentName]);

  // Persistir referido en sessionStorage para atribución
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      sessionStorage.setItem(REFERIDO_SESSION_KEY, refParam);
      sessionStorage.setItem(LANDING_SESSION_KEY, id);
      setActiveReferidoId(refParam);
    } else {
      const stored = sessionStorage.getItem(REFERIDO_SESSION_KEY);
      const storedLanding = sessionStorage.getItem(LANDING_SESSION_KEY);
      if (stored && storedLanding === id) {
        setActiveReferidoId(stored);
      }
    }
  }, [searchParams, id]);

  // Validar vigencia de la landing
  useEffect(() => {
    if (!page) return;
    const now = new Date();
    const from = parseDate(page.activeFrom);
    const until = parseDate(page.activeUntil);
    
    let expired = false;
    if (until !== null) {
      const untilDate = new Date(until);
      untilDate.setHours(23, 59, 59, 999);
      if (now > untilDate) expired = true;
    }
    
    if (from !== null) {
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      if (now < fromDate) expired = true;
    }
    
    setIsExpired(expired);
  }, [page]);

  // Registrar acceso/vista automáticamente al cargar la landing
  useEffect(() => {
    if (page?.isActive === false || isPreview) return;

    const sessionTrackKey = `tracked_view_${id}`;
    if (sessionStorage.getItem(sessionTrackKey)) return;

    sessionStorage.setItem(sessionTrackKey, 'true');

    const trackView = async () => {
      try {
        const source = searchParams.get('s') || searchParams.get('source') || 'direct';
        const channel = searchParams.get('c') || searchParams.get('channel') || 'direct';

        await fetch(`/api/sales-pages/${id}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source, channel }),
        });
      } catch (e) {
        console.warn('[Tracking] Error registering page view:', e);
        sessionStorage.removeItem(sessionTrackKey);
      }
    };

    trackView();
  }, [id, page, isPreview, searchParams]);

  const togglePlayback = () => {
    if (!iframeRef.current || !content?.videoUrl) return;

    const isYouTube = content.videoUrl.includes('youtube.com') || content.videoUrl.includes('youtu.be');
    const isVimeo = content.videoUrl.includes('vimeo.com');

    if (isYouTube) {
      const command = isPlaying ? 'pauseVideo' : 'playVideo';
      iframeRef.current.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: command, args: '' }), '*');
    } else if (isVimeo) {
      const command = isPlaying ? 'pause' : 'play';
      iframeRef.current.contentWindow?.postMessage(JSON.stringify({ method: command }), '*');
    }

    setIsPlaying(!isPlaying);
  };

  const handlePurchase = async () => {
    if (isPreview) {
      toast({ title: 'Modo Vista Previa', description: 'Los pagos están desactivados en esta vista miniatura.' });
      return;
    }
    setIsPurchaseDialogOpen(true);
    setPaymentInitPoint(null);
    setTransferResult(null);
    if (mentorPaymentMethods.length !== 1) setSelectedPaymentType(null);
  };

  const executePurchase = async () => {
    if (!studentEmail) {
      toast({ variant: 'destructive', title: 'Email requerido', description: 'Por favor ingresa tu correo de Gmail para la inscripción.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail.trim())) {
      toast({ variant: 'destructive', title: 'Email inválido', description: 'Por favor ingresa un correo electrónico válido (ej: nombre@gmail.com).' });
      return;
    }

    if (!studentEmail.trim().toLowerCase().endsWith('@gmail.com')) {
      toast({
        variant: 'destructive',
        title: 'Solo se admite Gmail',
        description: 'Esta plataforma opera exclusivamente sobre el ecosistema Google. Por favor ingresa tu correo @gmail.com para acceder al curso.',
      });
      return;
    }

    setLoading(true);

    const source = searchParams.get('s') || 'direct';
    const channel = searchParams.get('c') || 'direct';

    let leadReferidoId = activeReferidoId || page?.referidoId || null;
    if (page?.courseId) {
      try {
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: studentEmail,
            name: studentName,
            mentorId: leadReferidoId,
            courseId: page.courseId,
            landingId: id,
          })
        });
      } catch (leadError) {
        console.warn('[Lead] Error al crear lead (no crítico):', leadError);
      }
    }

    try {
      if (price === 0) {
        const response = await fetch('/api/courses/free-enrollment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId: id, studentEmail, studentName })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || data.error || 'Error al procesar inscripción');
        try {
          await fetch(`/api/sales-pages/${id}/track-conversion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source, channel }),
          });
        } catch (e) {}
        toast({ title: 'Inscripción exitosa', description: 'Redirigiendo a tu curso...' });
        window.location.href = data.redirectUrl || '/my-courses';
        return;
      }

      if (selectedPaymentType === 'transfer') {
        const response = await fetch('/api/payments/transfer/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId: id, studentEmail, studentName, referidoId: leadReferidoId || null })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al registrar la transferencia');
        setTransferResult({
          referenceCode: data.referenceCode,
          bankDetails: data.bankDetails,
          amount: data.amount,
        });
        toast({ title: 'Datos de transferencia enviados', description: 'Revisa tu correo con las instrucciones.' });
        setLoading(false);
        return;
      }

      const gateway = selectedPaymentType || (filteredPaymentMethods[0]?.type ?? 'mercadopago');
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pageId: id,
          studentEmail: studentEmail,
          studentName: studentName,
          referidoId: leadReferidoId || null,
          gateway: gateway,
          countryCode: selectedCountry.code,
          exchangeRate: rates[selectedCountry.currency] || 1,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Error al conectar con la pasarela de pago');

      try {
        await fetch(`/api/sales-pages/${id}/track-conversion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source, channel }),
        });
      } catch (e) {}

      const checkoutUrl = data.redirectUrl || data.init_point || data.url;
      if (gateway === 'stripe' && checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      setPaymentInitPoint(checkoutUrl);
      toast({ title: 'Preferencia generada', description: 'Escanea el QR o usa el botón para pagar.' });

    } catch (e: any) {
      console.warn('Error en compra:', e);
      toast({
        variant: 'destructive',
        title: 'Error al iniciar el pago',
        description: e.message || 'Error interno del servidor. Por favor intenta más tarde.'
      });
      setLoading(false);
    }
  };

  if (!page || page.isActive === false) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="font-bold text-muted-foreground uppercase tracking-widest">Página no disponible.</p>
      </div>
    );
  }

  type ContentShape = {
    themeMode?: string;
    videoUrl?: string;
    designTokens?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      typography?: { headingFont?: string; bodyFont?: string };
      fontHeading?: string;
      fontBody?: string;
      styleTokens?: {
        themeMode?: string;
        extraTokens?: { navbarHeight?: string };
      };
    };
    [key: string]: any;
  };

  const isV2 = !!page.content?.sections;
  const landings = page.aiContent?.landings || [];
  const content = (isV2 ? page.content : (landings[activeVariantIdx] || page.aiContent?.landing)) as ContentShape;
  const price = typeof page.price === 'number' ? page.price : 49990;
  const baseCurrency: SupportedCurrency = (page.currency || course?.currency || (price > 1000 ? 'ARS' : 'USD')) as SupportedCurrency;
  const baseUsdPrice = baseCurrency === 'USD' ? price : (price / (rates.ARS || FALLBACK_RATES.ARS));

  if (!content) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="font-bold text-muted-foreground">Contenido en proceso de generación...</p>
      </div>
    );
  }

  const tokens = content?.designTokens || {};
  const primaryColor = tokens.primary || page.branding?.primaryColor || '#3B2D86';
  const secondaryColor = tokens.secondary || '#F1F5F9';
  const accentColor = tokens.accent || '#FACC15';
  const navbarHeight = tokens?.styleTokens?.extraTokens?.navbarHeight || '64px';
  const fontHeading = tokens.typography?.headingFont || tokens.fontHeading || 'inherit';
  const fontBody = tokens.typography?.bodyFont || tokens.fontBody || 'inherit';
  const socials = mentorProfile?.profile?.socials || {};

  const themeMode = content.themeMode || content?.designTokens?.styleTokens?.themeMode || 'light';
  const isDark = themeMode === 'dark';
  const isGlass = themeMode === 'glass';

  const bgBase    = isDark ? 'bg-foreground' : isGlass ? 'bg-foreground' : 'bg-muted';
  const textBase  = isDark ? 'text-muted' : isGlass ? 'text-primary/10' : 'text-foreground';
  const bgSurface = isDark ? 'bg-foreground' : isGlass ? 'bg-foreground/60 backdrop-blur-xl' : 'bg-white';
  const textMuted = isDark ? 'text-muted-foreground' : isGlass ? 'text-primary/20' : 'text-muted-foreground';
  const borderSubtle = isDark ? 'border-foreground' : isGlass ? 'border-primary/40' : 'border-muted';

  if (isExpired) {
    const fromDate = parseDate(page.activeFrom);
    const untilDate = parseDate(page.activeUntil);
    const now = new Date();

    return (
      <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-6 text-center space-y-6" style={{ fontFamily: fontBody }}>
        <div className="w-24 h-24 bg-warn/15 rounded-full flex items-center justify-center mb-4 shadow-sm border-[8px] border-warn/10">
          <AlertTriangle className="h-10 w-10 text-warn" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight max-w-lg">
          Esta promoción ya no se encuentra disponible
        </h1>
        <p className="text-lg text-muted-foreground font-medium max-w-md">
          {untilDate && (() => {
            const d = new Date(untilDate);
            d.setHours(23, 59, 59, 999);
            return now > d;
          })()
            ? `Finalizó el ${untilDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`
            : fromDate && (() => {
            const d = new Date(fromDate);
            d.setHours(0, 0, 0, 0);
            return now < d;
          })()
            ? `Comenzará el ${fromDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`
            : 'La oferta ha caducado.'}
        </p>
        <p className="text-sm text-muted-foreground mt-8 font-medium">Gracias por tu interés en los programas de {mentorProfile?.displayName || 'este tutor'}.</p>
      </div>
    );
  }

  return (
    <div
      className={cn("min-h-screen pb-24 selection:bg-primary/20", bgBase, textBase)}
      style={{
        fontFamily: fontBody,
        '--primary': primaryColor,
        '--secondary': secondaryColor,
        '--accent': accentColor,
        '--navbar-height': navbarHeight,
      }}
    >
      <style jsx global>{`
        .font-headline { font-family: ${fontHeading}, sans-serif !important; }
        .font-body { font-family: ${fontBody}, sans-serif !important; }
      `}</style>

      {/* Header - Marca Blanca */}
      <nav className={cn("backdrop-blur-md sticky top-0 z-50 border-b font-body", isDark ? 'bg-foreground/80 border-foreground' : isGlass ? 'bg-foreground/80 border-foreground' : 'bg-white/80 border-muted')}>
        <div className="container mx-auto px-6 h-[var(--navbar-height)] flex justify-between items-center">
          <div className="flex items-center gap-4">
            {page.branding?.logoUrl && (
              <div className="relative w-10 h-10 overflow-hidden shrink-0">
                <Image src={page.branding.logoUrl} alt="Mentor Logo" fill className="object-contain" unoptimized />
              </div>
            )}
            <span className="font-headline font-black text-xl tracking-tight" style={{ color: primaryColor }}>{mentorProfile?.displayName || 'Programa Pro'}</span>
          </div>
          <Button
            onClick={handlePurchase}
            disabled={isExpired}
            className="rounded-xl font-bold h-11 px-8 shadow-lg shadow-primary/20 font-body disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: isExpired ? '#94a3b8' : primaryColor }}
          >
            {content.ctaText || 'Inscribirme'}
          </Button>
        </div>
      </nav>

      {/* Renderizado Condicional: V2 (Atomic) vs V1 (Monolítico) */}
      <div style={{ scrollMarginTop: 'var(--navbar-height)' }}>
        {isV2 ? (
          <AtomicRenderer page={page} onPurchase={handlePurchase} mentorProfile={mentorProfile} bundleProducts={bundleProducts} />
        ) : (
        <>
          {/* Hero Section V1 */}
          <section className={cn("py-20 lg:py-32 relative overflow-hidden", bgSurface)}>
            <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none" style={{ color: primaryColor }}>
              <Sparkles className="h-96 w-96" />
            </div>
            <div className="container mx-auto px-6 max-w-5xl text-center space-y-10 relative z-10">
              <h1 className="text-5xl lg:text-7xl font-headline font-black leading-[1.1] tracking-tighter" style={{ color: primaryColor }}>
                {content.headline}
              </h1>
              <p className={cn("text-xl lg:text-2xl font-medium max-w-3xl mx-auto leading-relaxed italic", textMuted)}>
                {content.subheadline}
              </p>

              {content.visibility?.showHeroVideo !== false && content.showVideo !== false && content.videoUrl && (
                <div
                  className="max-w-4xl mx-auto aspect-video rounded-[3rem] overflow-hidden shadow-3xl border-[12px] border-muted bg-black relative group/video-container select-none"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full"
                    src={getSecureVideoUrl(content.videoUrl)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <div
                    className="absolute inset-0 z-30 bg-transparent cursor-pointer"
                    onClick={togglePlayback}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/20 to-transparent pointer-events-auto" />
                    <div className="absolute top-4 right-4 z-40 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2 pointer-events-none">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] font-bold tracking-widest text-white uppercase">Fastoria Player</span>
                    </div>
                    {!isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-all group-hover/video-container:bg-black/10">
                        <div className="w-20 h-20 rounded-full bg-white/90 shadow-2xl flex items-center justify-center transform transition-transform group-hover/video-container:scale-110">
                          <Play className="h-8 w-8 text-black fill-black ml-1" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-auto" />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
                <Button
                  onClick={handlePurchase}
                  className="w-full sm:w-auto h-16 px-12 text-xl font-headline font-black rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105"
                  style={{ backgroundColor: primaryColor }}
                >
                  <ShoppingCart className="mr-3 h-6 w-6" /> {content.ctaText || 'Acceder al Programa'}
                </Button>
              </div>
            </div>
          </section>

          {/* Secciones Narrativas V1 */}
          {content.sections && content.sections.length > 0 && (
            <div className="container mx-auto px-6 max-w-5xl py-20 space-y-24">
              {content.sections.map((s: any, i: number) => (
                <div key={i} className={cn("flex flex-col md:flex-row gap-12 items-center", i % 2 !== 0 ? "md:flex-row-reverse" : "")}>
                  <div className="flex-1 space-y-6">
                    <Badge variant="outline" className="px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase border-primary/20 text-primary">
                      {s.tag || `Módulo ${i + 1}`}
                    </Badge>
                    <h2 className="text-3xl md:text-5xl font-headline font-black tracking-tight" style={{ color: primaryColor }}>
                      {s.title}
                    </h2>
                    <p className={cn("text-lg leading-relaxed whitespace-pre-wrap font-medium", textMuted)}>
                      {s.body}
                    </p>
                  </div>
                  <div className="flex-1 w-full aspect-video md:aspect-square relative rounded-[2.5rem] overflow-hidden border border-muted bg-muted shadow-xl group">
                    <Image src={s.imageUrl || `https://loremflickr.com/800/600/${(page.aiContent?.courseKeywords || 'business,education,growth').split(',').slice(0, 3).join(',')},professional?lock=${i + 1}`} alt="Visual" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Temario / Módulos V1 */}
          {modules.length > 0 && content.visibility?.showSyllabus !== false && (
            <section className={cn("py-20 border-y", isDark ? 'bg-foreground/50 border-foreground' : isGlass ? 'bg-foreground/50 border-foreground' : 'bg-muted/30 border-muted')}>
              <div className="container mx-auto px-6 max-w-4xl space-y-12">
                <div className="text-center space-y-4">
                  <Badge variant="outline" className="px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase border-primary/20 text-primary">
                    Estructura del Programa
                  </Badge>
                  <h2 className="text-4xl lg:text-5xl font-headline font-black tracking-tight" style={{ color: primaryColor }}>
                    Contenido Curricular
                  </h2>
                </div>
                <div className="grid gap-4">
                  {modules.map((m, idx) => (
                    <Card key={m.id || idx} className={cn("p-6 rounded-2xl border transition-all hover:shadow-md", bgSurface, borderSubtle)}>
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-headline font-black text-xl shrink-0" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-headline font-black text-xl tracking-tight mb-1">{m.title}</h3>
                          {m.description && <p className={cn("text-sm line-clamp-2", textMuted)}>{m.description}</p>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Perfil del Mentor V1 */}
          {mentorProfile && (
            <section className={cn("py-20", bgSurface)}>
              <div className="container mx-auto px-6 max-w-4xl">
                <div className={cn("p-10 lg:p-14 rounded-[3rem] border flex flex-col md:flex-row gap-10 items-center text-center md:text-left shadow-2xl relative overflow-hidden", isDark ? 'bg-foreground border-foreground' : isGlass ? 'bg-foreground border-foreground' : 'bg-muted/20 border-muted')}>
                  <div className="relative w-36 h-36 lg:w-44 lg:h-44 rounded-full overflow-hidden border-4 border-white shadow-xl shrink-0">
                    <Image
                      src={mentorProfile.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'}
                      alt="Mentor"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <span className="text-xs font-black uppercase tracking-widest text-primary">Tu Mentor y Guía</span>
                    <h3 className="text-3xl font-headline font-black tracking-tight" style={{ color: primaryColor }}>{mentorProfile.displayName}</h3>
                    <p className={cn("text-base leading-relaxed font-medium", textMuted)}>
                      {mentorProfile.profile?.bio || 'Especialista en su sector, comprometido en brindarte las mejores herramientas, metodologías y soporte para acelerar tu desarrollo.'}
                    </p>
                    <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                      {socials.instagram && <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>}
                      {socials.linkedin && <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-primary transition-colors"><Linkedin className="h-5 w-5" /></a>}
                      {socials.youtube && <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-primary transition-colors"><Youtube className="h-5 w-5" /></a>}
                      {socials.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>}
                      {socials.tiktok && <a href={socials.tiktok} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-primary transition-colors"><TikTokIcon className="h-5 w-5" /></a>}
                      {socials.whatsapp && <a href={socials.whatsapp} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-primary transition-colors"><MessageCircle className="h-5 w-5" /></a>}
                      {socials.website && <a href={socials.website} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-primary transition-colors"><Globe className="h-5 w-5" /></a>}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Testimonios V1 */}
          {content.testimonials && content.testimonials.length > 0 && content.visibility?.showTestimonials !== false && (
            <section className={cn("py-20 border-t", isDark ? 'bg-foreground border-foreground' : isGlass ? 'bg-foreground border-foreground' : 'bg-muted/10 border-muted')}>
              <div className="container mx-auto px-6 max-w-5xl space-y-12">
                <div className="text-center space-y-4">
                  <Badge variant="outline" className="px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase border-primary/20 text-primary">
                    Resultados Reales
                  </Badge>
                  <h2 className="text-4xl lg:text-5xl font-headline font-black tracking-tight" style={{ color: primaryColor }}>
                    Lo que Dicen Nuestros Alumnos
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  {content.testimonials.map((t: any, idx: number) => (
                    <Card key={idx} className={cn("p-8 rounded-[2rem] border shadow-lg space-y-6 flex flex-col justify-between", bgSurface, borderSubtle)}>
                      <p className={cn("text-lg italic leading-relaxed", textMuted)}>"{t.comment}"</p>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center font-headline font-black text-primary">
                          {t.name ? t.name[0] : 'U'}
                        </div>
                        <div>
                          <h4 className="font-headline font-black text-base">{t.name}</h4>
                          <span className={cn("text-xs", textMuted)}>{t.role || 'Estudiante'}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* FAQs V1 */}
          {content.faqs && content.faqs.length > 0 && content.visibility?.showFaqs !== false && (
            <section className={cn("py-20", bgSurface)}>
              <div className="container mx-auto px-6 max-w-4xl space-y-12">
                <div className="text-center space-y-4">
                  <Badge variant="outline" className="px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase border-primary/20 text-primary">
                    Dudas Comunes
                  </Badge>
                  <h2 className="text-4xl lg:text-5xl font-headline font-black tracking-tight" style={{ color: primaryColor }}>
                    Preguntas Frecuentes
                  </h2>
                </div>
                <div className="space-y-4">
                  {content.faqs.map((faq: any, idx: number) => (
                    <Card key={idx} className={cn("p-6 rounded-2xl border", bgSurface, borderSubtle)}>
                      <h4 className="font-headline font-black text-lg mb-2">{faq.question}</h4>
                      <p className={cn("text-sm leading-relaxed", textMuted)}>{faq.answer}</p>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Footer V1 */}
          <footer className={cn("py-12 border-t mt-12 text-center text-xs font-body", isDark ? 'border-foreground bg-foreground text-muted-foreground' : isGlass ? 'border-foreground bg-foreground text-muted-foreground' : 'border-muted bg-white text-muted-foreground')}>
            <div className="container mx-auto px-6 max-w-5xl space-y-6">
              <div className="flex flex-wrap items-center justify-center gap-6">
                {page.branding?.termsUrl && (
                  <a href={page.branding.termsUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Términos y Condiciones
                  </a>
                )}
                {page.branding?.privacyUrl && (
                  <a href={page.branding.privacyUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Políticas de Privacidad
                  </a>
                )}
                {socials.whatsapp && (
                  <a href={socials.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Soporte / Contacto
                  </a>
                )}
              </div>
              <p>© {new Date().getFullYear()} {mentorProfile?.displayName || 'Fastoria'}. Todos los derechos reservados.</p>
            </div>
          </footer>
        </>
        )}
      </div>

      {/* DIÁLOGO DE COMPRA Y CHECKOUT */}
      <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
        <DialogContent className="max-w-md bg-white border-0 shadow-2xl rounded-[2.5rem] p-8 text-black">
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-2xl font-black font-headline tracking-tight text-foreground">
              {price === 0 ? 'Acceso Inmediato' : 'Inscripción Segura'}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground">
              {price === 0 ? 'Ingresa tus datos para habilitar tu acceso al instante.' : 'Selecciona tu país y método de pago preferido.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="studentName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tu Nombre Completo</Label>
              <Input
                id="studentName"
                placeholder="Ej: Juan Pérez"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="h-12 rounded-xl bg-muted/40 border-muted focus:bg-white text-black font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentEmail" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tu Correo Electrónico (Gmail requerido)
              </Label>
              <Input
                id="studentEmail"
                type="email"
                placeholder="tu-correo@gmail.com"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="h-12 rounded-xl bg-muted/40 border-muted focus:bg-white text-black font-medium"
              />
            </div>

            {price > 0 && !paymentInitPoint && !transferResult && (
              <div className="space-y-4 pt-2">
                <CountryCurrencySelector
                  selectedCountryCode={selectedCountry.code}
                  selectedCountry={selectedCountry}
                  onSelectCountry={handleCountryChange}
                  baseAmount={price}
                  baseCurrency={baseCurrency}
                  rates={rates}
                />

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Métodos de pago habilitados para {selectedCountry.name}
                  </Label>
                  <div className="grid gap-2">
                    {filteredPaymentMethods.length === 0 ? (
                      <div className="p-4 rounded-xl bg-muted/30 border border-muted text-center text-xs text-muted-foreground">
                        No hay métodos de cobro habilitados en {selectedCountry.name} para este tutor.
                      </div>
                    ) : (
                      filteredPaymentMethods.map((m: any) => {
                        const isSelected = selectedPaymentType === m.type;
                        const isTransfer = m.type === 'transfer';
                        return (
                          <div
                            key={m.type}
                            onClick={() => setSelectedPaymentType(m.type)}
                            className={cn(
                              "p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                              isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:border-primary/40 bg-white"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <CreditCard className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                              <div>
                                <p className="font-bold text-sm text-foreground capitalize">
                                  {m.type === 'mercadopago' ? 'MercadoPago (Tarjetas / Saldo)' : m.type === 'getnet' ? 'Getnet (Santander)' : m.type === 'stripe' ? 'Tarjeta Internacional (Stripe)' : 'Transferencia Bancaria'}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {isTransfer ? 'Acreditación manual tras confirmar comprobante' : 'Aprobación automática inmediata'}
                                </p>
                              </div>
                            </div>
                            <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", isSelected ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Código QR si es MercadoPago */}
            {paymentInitPoint && (
              <div className="flex flex-col items-center justify-center p-6 bg-muted/20 border border-muted rounded-3xl space-y-4">
                <div className="p-4 bg-white rounded-2xl shadow-md border border-muted">
                  <QRCodeSVG value={paymentInitPoint} size={180} />
                </div>
                <p className="text-xs text-muted-foreground text-center font-medium">
                  Escanea el código QR con tu app de Mercado Pago o presiona el botón inferior para pagar.
                </p>
              </div>
            )}

            {/* Datos de Transferencia Bancaria */}
            {transferResult && (
              <div className="p-5 bg-success/5 border border-success/30 rounded-3xl space-y-4 text-left">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                  <p className="text-sm font-black text-success">Instrucciones de Transferencia</p>
                </div>
                <div className="bg-white/80 p-4 rounded-2xl border border-success/20 space-y-2 text-xs">
                  {transferResult.bankDetails?.cbu && (
                    <div className="flex justify-between items-center py-1 border-b border-muted">
                      <span className="text-muted-foreground font-semibold">CBU/CVU</span>
                      <span className="font-mono font-bold text-foreground select-all">{transferResult.bankDetails.cbu}</span>
                    </div>
                  )}
                  {transferResult.bankDetails?.alias && (
                    <div className="flex justify-between items-center py-1 border-b border-muted">
                      <span className="text-muted-foreground font-semibold">Alias</span>
                      <span className="font-bold text-foreground select-all">{transferResult.bankDetails.alias}</span>
                    </div>
                  )}
                  {transferResult.bankDetails?.holderName && (
                    <div className="flex justify-between items-center py-1 border-b border-muted">
                      <span className="text-muted-foreground font-semibold">Titular</span>
                      <span className="font-bold text-foreground">{transferResult.bankDetails.holderName}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-success/20">
                    <span className="text-muted-foreground">Monto</span>
                    <span className="font-black text-primary text-lg">${(transferResult.amount).toLocaleString('es-AR')}</span>
                  </div>
                </div>

                {/* Código de referencia */}
                <div className="bg-warn/10 border border-warn/20 rounded-2xl p-4 text-center space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-warn">Código de referencia</p>
                  <p className="font-black text-warn text-xl font-mono tracking-widest">{transferResult.referenceCode}</p>
                  <div className="bg-white/60 p-3 rounded-xl border border-warn/20/50 mt-2 text-left flex items-start gap-3">
                    <Info className="h-4 w-4 text-warn shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-warn/80 leading-tight">
                      IMPORTANTE: Ingresa este código exacto en el "Motivo" o "Concepto" de tu transferencia en tu app del banco. Es indispensable para que el tutor reconozca tu pago sin demoras.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center font-medium">
                  Tu tutor activará tu acceso en menos de 24 hs hábiles tras verificar el pago.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {!paymentInitPoint && !transferResult && (
              <Button
                onClick={executePurchase}
                disabled={
                  loading ||
                  !studentEmail ||
                  (price > 0 && filteredPaymentMethods.length === 0) ||
                  (price > 0 && filteredPaymentMethods.length > 1 && !selectedPaymentType)
                }
                className="w-full h-16 text-xl font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02]"
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? (
                  <Loader2 className="animate-spin h-6 w-6" />
                ) : price === 0 ? (
                  'Acceder Gratis'
                ) : selectedPaymentType === 'transfer' ? (
                  'Confirmar Transferencia'
                ) : selectedCountry.isDomesticArgentina ? (
                  `Pagar ARS $${(baseCurrency === 'ARS' ? price : convertUsdAmount(price, 'ARS', rates)).toLocaleString('es-AR')}`
                ) : (
                  `Pagar USD $${(baseCurrency === 'USD' ? price : Math.round(baseUsdPrice * 100) / 100).toLocaleString('es-AR')}`
                )}
              </Button>
            )}
            {paymentInitPoint && (
              <div className="flex flex-col gap-3 w-full">
                <Button
                  onClick={() => window.location.href = paymentInitPoint!}
                  className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continuar al Pago Seguro
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setPaymentInitPoint(null); setLoading(false); }}
                  className="text-muted-foreground font-bold hover:bg-transparent"
                >
                  Volver / Corregir mis datos
                </Button>
              </div>
            )}
            {transferResult && (
              <Button
                onClick={() => setIsPurchaseDialogOpen(false)}
                className="w-full h-14 text-lg font-bold rounded-2xl"
                style={{ backgroundColor: primaryColor }}
              >
                Entendido, cerrar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
