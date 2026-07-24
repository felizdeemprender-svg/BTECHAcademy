
'use client';

import { useState, useEffect, use, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { createOrFindLead, REFERIDO_SESSION_KEY, LANDING_SESSION_KEY } from '@/lib/leads/manage-lead';
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
  AlertTriangle
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

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

/**
 * Genera una URL de video segura con parámetros restrictivos para YouTube y Vimeo.
 */
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


export default function PublicSalesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const variantIdx = parseInt(searchParams.get('v') || '0');

  const db = useFirestore();
  const { toast } = useToast();
  const { profile } = useAuth(); // Obtener perfil del usuario logueado
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [loading, setLoading] = useState(false);
  const [mentorProfile, setMentorProfile] = useState<any>(null);
  const [mentorPaymentMethods, setMentorPaymentMethods] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState<'mercadopago' | 'transfer' | null>(null);
  const [paymentInitPoint, setPaymentInitPoint] = useState<string | null>(null);
  const [transferResult, setTransferResult] = useState<{ referenceCode: string; bankDetails: any; amount: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [activeReferidoId, setActiveReferidoId] = useState<string | null>(null);

  // Auto-completar datos si el usuario está logueado
  useEffect(() => {
    if (profile && isPurchaseDialogOpen) {
      if (!studentName) setStudentName(profile.displayName || '');
      if (!studentEmail) setStudentEmail(profile.email || '');
    }
  }, [profile, isPurchaseDialogOpen, studentName, studentEmail]);

  // Capturar el referidoId desde la URL y persistirlo en sessionStorage
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      sessionStorage.setItem(REFERIDO_SESSION_KEY, refParam);
      sessionStorage.setItem(LANDING_SESSION_KEY, id);
      setActiveReferidoId(refParam);
    } else {
      // Recuperar de sessionStorage si ya existía (ej: el usuario navegó y volvió)
      const stored = sessionStorage.getItem(REFERIDO_SESSION_KEY);
      const storedLanding = sessionStorage.getItem(LANDING_SESSION_KEY);
      if (stored && storedLanding === id) {
        setActiveReferidoId(stored);
      }
    }
  }, [searchParams, id]);

  const isPreview = searchParams.get('preview') === 'true';

  const pageRef = useMemoFirebase(() => {
    if (isPreview) return doc(db, 'templateCollections', id);
    return doc(db, 'salesPages', id);
  }, [db, id, isPreview]);
  
  const { data: rawPage, isLoading: pageLoading } = useDoc(pageRef);

  // Normalizar los datos si es una previsualización de un templateCollection
  const page = useMemo(() => {
    if (!rawPage) return null;
    if (isPreview) {
      return {
        ...rawPage,
        isActive: true, // Forzar activo
        aiContent: rawPage.assets, // Mapear assets a aiContent
        price: 0, // Precio falso
        mentorId: rawPage.ownerId || "W7oR0f2q39bU0Ff10w4yv9FmZ6D3", // Default a Felipe si falta
        courseId: null,
      };
    }
    return rawPage;
  }, [rawPage, isPreview]);

  const courseRef = useMemoFirebase(() => page?.courseId ? doc(db, 'courses', page.courseId) : null, [db, page?.courseId]);
  const { data: course } = useDoc(courseRef);

  const modulesQuery = useMemoFirebase(() => page?.courseId ? query(collection(db, 'courses', page.courseId, 'modules'), orderBy('order', 'asc')) : null, [db, page?.courseId]);
  const { data: modules } = useCollection(modulesQuery);

  // Validar vigencia de la landing (debe ir DESPUÉS de declarar `page`)
  useEffect(() => {
    if (!page) return;
    const now = new Date();
    const from: Date | null = page.activeFrom?.toDate ? page.activeFrom.toDate() : null;
    const until: Date | null = page.activeUntil?.toDate ? page.activeUntil.toDate() : null;
    
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
    if (pageLoading || !page?.isActive || isPreview) return;

    const sessionTrackKey = `tracked_view_${id}`;
    if (sessionStorage.getItem(sessionTrackKey)) return;

    // Registrar de inmediato en sessionStorage para evitar ejecuciones concurrentes por React 18 Strict Mode
    sessionStorage.setItem(sessionTrackKey, 'true');

    const trackView = async () => {
      try {
        const { setDoc, increment, doc } = await import('firebase/firestore');
        const pRef = doc(db, 'salesPages', id);

        const source = searchParams.get('s') || searchParams.get('source') || 'direct';
        const channel = searchParams.get('c') || searchParams.get('channel') || 'direct';

        await setDoc(pRef, {
          stats: {
            totalClicks: increment(1),
            channelBreakdown: {
              [channel]: { clicks: increment(1) }
            },
            sourceBreakdown: {
              [source]: { clicks: increment(1) }
            }
          }
        }, { merge: true });
      } catch (e) {
        console.warn('[Tracking] Error registering page view:', e);
        // Si falla la red, permitimos reintentar en la próxima carga
        sessionStorage.removeItem(sessionTrackKey);
      }
    };

    trackView();
  }, [db, id, pageLoading, page, searchParams]);


  useEffect(() => {
    if (page?.mentorId) {
      // Perfil del mentor
      fetch(`/api/tutors/by-id/${page.mentorId}`)
        .then(res => res.json())
        .then(data => { if (data && !data.error) setMentorProfile(data); })
        .catch(err => console.error('Error fetching mentor profile:', err));

      // Métodos de pago activos del mentor (sanitizados, sin secretos)
      fetch(`/api/tutors/${page.mentorId}/payment-options`)
        .then(res => res.json())
        .then(data => {
          if (data?.methods) {
            let methods = data.methods;
            // Filtrar según lo que permita la landing
            if (page.allowedPaymentMethods && Array.isArray(page.allowedPaymentMethods) && page.allowedPaymentMethods.length > 0) {
              methods = methods.filter((m: any) => page.allowedPaymentMethods.includes(m.type));
            }
            setMentorPaymentMethods(methods);
            // Pre-seleccionar: si solo hay uno, seleccionarlo automáticamente
            if (methods.length === 1) setSelectedPaymentType(methods[0].type);
          }
        })
        .catch(err => console.error('Error fetching payment methods:', err));
    }
  }, [page?.mentorId]);

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
    // Reset selección si hay varios métodos
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

    // Solo se admiten cuentas de Gmail (la plataforma opera 100% sobre el ecosistema Google)
    if (!studentEmail.trim().toLowerCase().endsWith('@gmail.com')) {
      toast({
        variant: 'destructive',
        title: '⚠️ Solo se admite Gmail',
        description: 'Esta plataforma opera exclusivamente sobre el ecosistema Google. Por favor ingresa tu correo @gmail.com para acceder al curso.',
      });
      return;
    }

    setLoading(true);

    // Attribution Tracking
    const source = searchParams.get('s') || 'direct';
    const channel = searchParams.get('c') || 'direct';

    // Crear o recuperar el Lead con control anti-colisión ANTES del pago
    let leadReferidoId = activeReferidoId || page?.referidoId || null;
    if (page?.courseId) {
      try {
        await createOrFindLead(
          db,
          id,
          page.courseId,
          leadReferidoId,
          studentEmail,
          studentName
        );
      } catch (leadError) {
        // No bloqueamos el flujo de pago si el lead falla
        console.warn('[Lead] Error al crear lead (no crítico):', leadError);
      }
    }

    try {
      // 1. Determinar si es gratis o de pago
      if (price === 0) {
        const response = await fetch('/api/courses/free-enrollment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId: id, studentEmail, studentName })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || data.error || 'Error al procesar inscripción');
        try {
          const { setDoc, increment, doc } = await import('firebase/firestore');
          await setDoc(doc(db, 'salesPages', id), { stats: { conversions: increment(1) } }, { merge: true });
        } catch (e) {}
        toast({ title: '¡Inscripción exitosa!', description: 'Redirigiendo a tu curso...' });
        window.location.href = data.redirectUrl || '/my-courses';
        return;
      }

      // 2a. Pago por Transferencia Bancaria
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
        toast({ title: '¡Datos de transferencia enviados!', description: 'Revisá tu correo con las instrucciones.' });
        setLoading(false);
        return;
      }

      // 2b. Pago por MercadoPago
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pageId: id,
          studentEmail: studentEmail,
          studentName: studentName,
          referidoId: leadReferidoId || null,
          gateway: 'mercadopago' // Por defecto usamos MP, luego se podrá elegir en la UI
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Error al conectar con MercadoPago');

      try {
        const { setDoc, increment, doc } = await import('firebase/firestore');
        await setDoc(doc(db, 'salesPages', id), {
          stats: {
            conversions: increment(1),
            channelBreakdown: { [channel]: { conversions: increment(1) } },
            sourceBreakdown: { [source]: { conversions: increment(1) } }
          }
        }, { merge: true });
      } catch (e) {}

      setPaymentInitPoint(data.init_point);
      toast({ title: '¡Preferencia generada!', description: 'Escanea el QR o usá el botón para pagar.' });

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

  if (pageLoading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (!page || !page.isActive) return <div className="flex h-screen items-center justify-center"><p className="font-bold text-muted-foreground uppercase tracking-widest">Página no disponible.</p></div>;

  // Selección dinámica de la variante
  const landings = page.aiContent?.landings || [];
  const content = landings[variantIdx] || page.aiContent?.landing;
  const price = typeof page.price === 'number' ? page.price : 49990;

  if (!content) return <div className="flex h-screen items-center justify-center"><p className="font-bold text-muted-foreground">Contenido en proceso de generación...</p></div>;

  // Extract template design tokens
  const tokens = (content as any)?.designTokens || {};
  const primaryColor = tokens.primary || page.branding?.primaryColor || '#3B2D86';
  const secondaryColor = tokens.secondary || '#F1F5F9';
  const accentColor = tokens.accent || '#FACC15';
  const fontHeading = tokens.fontHeading || 'inherit';
  const fontBody = tokens.fontBody || 'inherit';
  const socials = mentorProfile?.profile?.socials || {};

  // Theme Modes
  const themeMode = content.themeMode || 'light';
  const isDark = themeMode === 'dark';
  const isGlass = themeMode === 'glass';

  const bgBase    = isDark ? 'bg-slate-950' : isGlass ? 'bg-indigo-950' : 'bg-slate-50';
  const textBase  = isDark ? 'text-slate-100' : isGlass ? 'text-indigo-50' : 'text-slate-900';
  const bgSurface = isDark ? 'bg-slate-900' : isGlass ? 'bg-indigo-900/60 backdrop-blur-xl' : 'bg-white';
  const textMuted = isDark ? 'text-slate-400' : isGlass ? 'text-indigo-200' : 'text-slate-600';
  const borderSubtle = isDark ? 'border-slate-800' : isGlass ? 'border-indigo-700/40' : 'border-slate-100';

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-6" style={{ fontFamily: fontBody }}>
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-4 shadow-sm border-[8px] border-amber-50">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight max-w-lg">
          Esta promoción ya no se encuentra disponible
        </h1>
        <p className="text-lg text-slate-500 font-medium max-w-md">
          {page.activeUntil?.toDate && (() => {
            const d = page.activeUntil.toDate();
            d.setHours(23, 59, 59, 999);
            return new Date() > d;
          })()
            ? `Finalizó el ${page.activeUntil.toDate().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`
            : page.activeFrom?.toDate && (() => {
            const d = page.activeFrom.toDate();
            d.setHours(0, 0, 0, 0);
            return new Date() < d;
          })()
            ? `Comenzará el ${page.activeFrom.toDate().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`
            : 'La oferta ha caducado.'}
        </p>
        <p className="text-sm text-slate-400 mt-8 font-medium">Gracias por tu interés en los programas de {mentorProfile?.displayName || 'este tutor'}.</p>
      </div>
    );
  }

  return (
    <div
      className={cn("min-h-screen pb-24 selection:bg-primary/20", bgBase, textBase)}
      style={{
        fontFamily: fontBody,
        ['--primary' as any]: primaryColor,
        ['--secondary' as any]: secondaryColor,
        ['--accent' as any]: accentColor,
      }}
    >
      {/* Dynamic Font Injection */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=${fontHeading.replace(/\s+/g, '+')}&family=${fontBody.replace(/\s+/g, '+')}&display=swap');
        .font-headline { font-family: ${fontHeading}, sans-serif !important; }
        .font-body { font-family: ${fontBody}, sans-serif !important; }
      `}</style>

      {/* Header - Marca Blanca */}
      <nav className={cn("backdrop-blur-md sticky top-0 z-50 border-b font-body", isDark ? 'bg-slate-950/80 border-slate-800' : isGlass ? 'bg-indigo-950/80 border-indigo-800' : 'bg-white/80 border-slate-100')}>
        <div className="container mx-auto px-6 h-20 flex justify-between items-center">
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
            {content.ctaText}
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
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
              className="max-w-4xl mx-auto aspect-video rounded-[3rem] overflow-hidden shadow-3xl border-[12px] border-slate-50 bg-black relative group/video-container select-none"
              onContextMenu={(e) => e.preventDefault()}
            >
              <iframe
                ref={iframeRef}
                className="w-full h-full"
                src={getSecureVideoUrl(content.videoUrl)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />

              {/* MÁSCARA DE SEGURIDAD TOTAL */}
              <div
                className="absolute inset-0 z-30 bg-transparent cursor-pointer"
                onClick={togglePlayback}
                onContextMenu={(e) => e.preventDefault()}
              >
                {/* Ocultamiento Superior */}
                <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/20 to-transparent pointer-events-auto" />

                {/* Bloqueo Inferior */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-auto cursor-not-allowed" />

                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/20 shadow-2xl">
                      <Play className="h-8 w-8 text-white fill-white ml-1" />
                    </div>
                  </div>
                )}
              </div>

              {/* Marca de Agua */}
              <div className="absolute top-6 left-6 z-40 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 opacity-0 group-hover/video-container:opacity-100 transition-opacity">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span className="text-[8px] font-black uppercase text-white tracking-widest">Contenido Protegido • Evolución Académica</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button
              onClick={handlePurchase}
              disabled={isExpired}
              size="lg"
              className="h-16 px-12 text-xl font-bold rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ backgroundColor: isExpired ? '#94a3b8' : primaryColor }}
            >
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : isExpired ? 'Promoción Finalizada' : content.ctaText}
            </Button>
          </div>
        </div>
      </section>

      {/* Narrative Sections */}
      {content.visibility?.showNarrative !== false && content.sections && content.sections.length > 0 && (
      <section className={cn("py-24 space-y-32", bgBase)}>
        {content.sections?.map((s: any, i: number) => (
          <div key={i} className="container mx-auto px-6 max-w-6xl">
            <div className={cn(
              "flex flex-col gap-16 items-center",
              i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
            )}>
              <div className="flex-1 space-y-8">
                <h3 className={cn("text-4xl font-black leading-tight", textBase)}>{s.title}</h3>
                <p className={cn("text-lg leading-relaxed font-medium", textMuted)}>{s.paragraph}</p>
                <div className="grid gap-4">
                  {s.microBullets?.map((bullet: string, bIdx: number) => (
                    <div key={bIdx} className={cn("flex items-start gap-4 p-4 rounded-2xl border shadow-sm", bgSurface, borderSubtle)}>
                      <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                      <span className={cn("text-sm font-bold", textBase)}>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={cn("flex-1 w-full aspect-[4/3] rounded-[3rem] border-[12px] shadow-2xl relative overflow-hidden group", isDark ? 'border-slate-800 bg-slate-800' : isGlass ? 'border-indigo-800 bg-indigo-900' : 'border-white bg-slate-100')}>
                <Image src={s.imageUrl || `https://loremflickr.com/800/600/${(page.aiContent?.courseKeywords || 'business,education,growth').split(',').slice(0, 3).join(',')},professional?lock=${i + 1}`} alt="Visual" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
              </div>
            </div>
          </div>
        ))}
      </section>
      )}

      {/* Syllabus Section (New) */}
      {content.visibility?.showSyllabus !== false && modules && modules.length > 0 && (
        <section className={cn("py-24", bgSurface)}>
          <div className="container mx-auto px-6 max-w-4xl">
             <div className="text-center space-y-4 mb-16">
              <Badge className="bg-primary/10 text-primary border-none px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest">
                Temario del Curso
              </Badge>
              <h2 className="text-4xl lg:text-5xl font-headline font-black tracking-tight" style={{ color: primaryColor }}>
                ¿Qué vas a aprender?
              </h2>
            </div>
            
            <div className="space-y-6">
              {modules.map((mod: any, idx: number) => (
                <div key={idx} className={cn("p-6 rounded-[1.5rem] border shadow-sm flex items-start gap-5 transition-transform hover:scale-[1.01]", bgBase, borderSubtle)}>
                  <div className="w-8 h-8 rounded-xl flex-shrink-0 mt-1 flex items-center justify-center text-sm font-black" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className={cn("text-base font-bold leading-snug", textBase)}>{mod.title}</h3>
                    {(mod.description || mod.content) && (
                      <p className={cn("text-sm font-medium leading-relaxed", textMuted)}>{mod.description || mod.content}</p>
                    )}
                    {mod.duration && (
                      <div className="flex items-center gap-1.5 pt-1" style={{ color: primaryColor }}>
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{mod.duration}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Benefits Section */}
      {content.visibility?.showBenefits !== false && content.benefits && content.benefits.length > 0 && (
        <section className={cn("py-24", bgBase)}>
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="text-center space-y-4 mb-16">
              <Badge className="bg-primary/10 text-primary border-none px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest">
                ¿Qué vas a lograr?
              </Badge>
              <h2 className="text-4xl lg:text-5xl font-headline font-black tracking-tight" style={{ color: primaryColor }}>
                Beneficios del Programa
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.benefits.map((benefit: string, bIdx: number) => (
                <div key={bIdx} className={cn("p-8 rounded-[2.5rem] border shadow-xl hover:shadow-2xl transition-all group", bgSurface, borderSubtle)}>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className={cn("font-bold leading-snug", textBase)}>{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mentor Section (Redesigned) */}
      {content.visibility?.showMentor !== false && (
      <section className={cn("py-24 overflow-hidden relative border-t", bgSurface, borderSubtle)}>
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col lg:flex-row items-center gap-16">
             <div className="relative w-64 h-64 lg:w-80 lg:h-80 shrink-0">
               <div className="absolute inset-0 bg-primary/5 rounded-[4rem] rotate-6" />
               <div className={cn("absolute inset-0 rounded-[4rem] -rotate-3 overflow-hidden border-[10px] shadow-2xl", isDark ? 'border-slate-800 bg-slate-900' : 'border-white bg-slate-100')}>
                 <Image
                    src={mentorProfile?.photoURL || 'https://placehold.co/400/png'}
                    alt="Mentor"
                    fill
                    className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
                    unoptimized
                  />
               </div>
             </div>
             <div className="flex-1 space-y-8 text-center lg:text-left">
               <div className="space-y-4">
                 <Badge className="bg-violet-500/10 text-violet-600 border-none px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest">
                   Experticia Garantizada
                 </Badge>
                 <h2 className="text-4xl lg:text-5xl font-headline font-black tracking-tight" style={{ color: primaryColor }}>
                   Sobre tu Mentor
                 </h2>
               </div>
               <p className={cn("text-xl leading-relaxed font-medium italic", textMuted)}>
                 "{content.aboutMentor || mentorProfile?.profile?.bio || 'Experto dedicado a transformar tu aprendizaje con metodologías prácticas y resultados probados.'}"
               </p>
               <div className="pt-4 flex flex-wrap justify-center lg:justify-start gap-4">
                 <div className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border", bgBase, borderSubtle)}>
                   <Users className="h-4 w-4 text-primary" />
                   <span className={cn("text-xs font-bold uppercase tracking-tighter", textMuted)}>Comunidad Activa</span>
                 </div>
                 <div className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border", bgBase, borderSubtle)}>
                   <Award className="h-4 w-4 text-emerald-500" />
                   <span className={cn("text-xs font-bold uppercase tracking-tighter", textMuted)}>Certificación Oficial</span>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </section>
      )}

      {/* FAQs Section (New) */}
      {content.visibility?.showFaqs !== false && content.faqs && content.faqs.length > 0 && (
        <section className={cn("py-24 border-t", bgBase, borderSubtle)}>
          <div className="container mx-auto px-6 max-w-3xl">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl lg:text-5xl font-headline font-black tracking-tight" style={{ color: primaryColor }}>
                Preguntas Frecuentes
              </h2>
            </div>
            <div className="space-y-4">
              {content.faqs.map((faq: any, idx: number) => (
                <details key={idx} className={cn("group rounded-2xl border p-6 [&_summary::-webkit-details-marker]:hidden", bgSurface, borderSubtle)}>
                  <summary className={cn("flex cursor-pointer items-center justify-between gap-1.5 font-bold text-lg", textBase)}>
                    {faq.question}
                    <span className="shrink-0 rounded-full bg-primary/10 p-1.5 text-primary group-open:-rotate-180 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </summary>
                  <p className={cn("mt-4 leading-relaxed font-medium", textMuted)}>
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing & Closure */}
      <section className="py-32 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute bottom-0 left-0 p-20 opacity-5 pointer-events-none">
          <Rocket className="h-96 w-96 text-white" />
        </div>
        <div className="container mx-auto px-6 max-w-5xl relative z-10 text-center space-y-12">
          <Card className={cn("max-w-md mx-auto rounded-[3rem] p-12 space-y-8 border-none shadow-3xl transform hover:scale-105 transition-transform", isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900')}>
            <div className="space-y-2">
              <p className={cn("text-xs font-black uppercase tracking-[0.3em]", isDark ? 'text-slate-400' : 'text-slate-400')}>Inversión Única</p>
              <p className="text-6xl font-black tracking-tighter" style={{ color: primaryColor }}>
                {price === 0 ? 'Gratis' : `$${price.toLocaleString('es-AR')}`}
              </p>
              {price > 0 && <p className={cn("text-sm font-bold italic", isDark ? 'text-slate-400' : 'text-slate-500')}>Financiación disponible con MercadoPago</p>}
            </div>
            <div className="space-y-4 pt-4 text-left">
              <div className="flex items-center gap-3 text-xs font-bold"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Garantía de Satisfacción 7 días</div>
              <div className="flex items-center gap-3 text-xs font-bold"><Users className="h-4 w-4 text-blue-500" /> Acceso a Comunidad Exclusiva</div>
            </div>
            <Button
              onClick={handlePurchase}
              disabled={isExpired}
              size="lg"
              className="w-full h-16 text-xl font-bold rounded-2xl shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: isExpired ? '#94a3b8' : primaryColor, color: '#FFFFFF' }}
            >
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : isExpired ? 'Promoción Finalizada' : content.ctaText}
            </Button>
          </Card>
        </div>
      </section>

      {/* Footer - Marca Blanca */}
      <footer className={cn("py-16 border-t pb-32 md:pb-16", bgSurface, borderSubtle)}>
        <div className="container mx-auto px-6 text-center space-y-10">
          <div className="flex items-center justify-center gap-6">
            {socials.linkedin && <a href={socials.linkedin} target="_blank" className="hover:scale-110 transition-transform"><Linkedin className={cn("h-6 w-6 hover:text-[#0077B5]", textMuted)} /></a>}
            {socials.instagram && <a href={socials.instagram} target="_blank" className="hover:scale-110 transition-transform"><Instagram className={cn("h-6 w-6 hover:text-[#E4405F]", textMuted)} /></a>}
            {socials.twitter && <a href={socials.twitter} target="_blank" className="hover:scale-110 transition-transform"><Twitter className={cn("h-6 w-6 hover:text-black dark:hover:text-white", textMuted)} /></a>}
            {socials.youtube && <a href={socials.youtube} target="_blank" className="hover:scale-110 transition-transform"><Youtube className={cn("h-6 w-6 hover:text-[#FF0000]", textMuted)} /></a>}
            {socials.tiktok && <a href={socials.tiktok} target="_blank" className="hover:scale-110 transition-transform"><TikTokIcon className={cn("h-6 w-6 hover:text-black dark:hover:text-white", textMuted)} /></a>}
            {socials.whatsapp && <a href={`https://wa.me/${socials.whatsapp}`} target="_blank" className="hover:scale-110 transition-transform"><MessageCircle className={cn("h-6 w-6 hover:text-[#25D366]", textMuted)} /></a>}
            {socials.website && <a href={socials.website} target="_blank" className="hover:scale-110 transition-transform"><Globe className={cn("h-6 w-6", textMuted)} /></a>}
          </div>
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", textMuted)}>Entorno de Aprendizaje Seguro</span>
          </div>
          <p className={cn("text-xs font-medium", textMuted)}>© {new Date().getFullYear()} {mentorProfile?.displayName}. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Sticky Bottom CTA */}
      <div className={cn("fixed bottom-0 left-0 right-0 p-4 backdrop-blur-xl border-t z-50 flex items-center justify-between md:justify-center md:gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]", isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200')}>
        <div className="hidden md:block text-right">
          <p className={cn("text-xs font-black uppercase tracking-wider", textMuted)}>Inversión Única</p>
          <p className="text-2xl font-black" style={{ color: primaryColor }}>{price === 0 ? 'Gratis' : `$${price.toLocaleString('es-AR')}`}</p>
        </div>
        <Button
          onClick={handlePurchase}
          disabled={isExpired}
          size="lg"
          className="w-full md:w-auto h-12 md:h-14 px-8 text-base md:text-lg font-bold rounded-xl shadow-xl transition-all"
          style={{ backgroundColor: isExpired ? '#94a3b8' : primaryColor, color: '#FFFFFF' }}
        >
          {content.ctaText}
        </Button>
      </div>
      {/* Purchase Dialog */}
      <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 border-none shadow-3xl">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-2 mx-auto sm:mx-0">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-3xl font-black tracking-tight text-primary">Detalles de Inscripción</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Completa tus datos para recibir el acceso al contenido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Paso 1: datos del alumno + selección de método — solo si no hay resultado aún */}
            {!paymentInitPoint && !transferResult && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="purchase-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</Label>
                  <Input
                    id="purchase-name"
                    placeholder="Juan Pérez"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    className="h-14 rounded-2xl bg-slate-50 border-none font-bold px-6"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase-email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email de Acceso (Gmail)</Label>
                  <Input
                    id="purchase-email"
                    type="email"
                    placeholder="tu@gmail.com"
                    value={studentEmail}
                    onChange={e => setStudentEmail(e.target.value)}
                    className="h-14 rounded-2xl bg-slate-50 border-none font-bold px-6"
                  />
                  <p className="text-[10px] text-slate-400 italic px-1">⚠️ Esta plataforma funciona exclusivamente con Google. Debes usar tu correo @gmail.com.</p>
                </div>

                {/* Selector de método de pago (solo si hay >1 método o hay transferencia disponible) */}
                {price > 0 && mentorPaymentMethods.length > 1 && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Forma de Pago</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {mentorPaymentMethods.map((method: any) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedPaymentType(method.type)}
                          className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-bold text-sm transition-all',
                            selectedPaymentType === method.type
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                          )}
                        >
                          {method.type === 'mercadopago' ? (
                            <>
                              <span className="text-2xl">💳</span>
                              <span>Mercado Pago</span>
                            </>
                          ) : (
                            <>
                              <span className="text-2xl">🏦</span>
                              <span>Transferencia</span>
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Paso 2a: QR de Mercado Pago */}
            {paymentInitPoint && (
              <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                <div className="p-4 bg-white rounded-3xl shadow-xl border-8 border-slate-50">
                  <QRCodeSVG value={paymentInitPoint} size={200} />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-sm font-black text-slate-800">Escanea con la App de Mercado Pago</p>
                  <p className="text-xs text-slate-500 font-medium">O si estás en tu móvil, usá el botón de abajo.</p>
                </div>
              </div>
            )}

            {/* Paso 2b: Confirmación de transferencia */}
            {transferResult && (
              <div className="space-y-4 animate-in zoom-in-95 duration-300">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  </div>
                  <p className="font-black text-slate-900">¡Listo! Revisá tu correo</p>
                  <p className="text-sm text-slate-500 font-medium mt-1">Te enviamos los datos bancarios para completar el pago.</p>
                </div>

                {/* Datos bancarios inline */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">🏦 Datos para transferir</p>
                  {transferResult.bankDetails.titularName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Titular</span>
                      <span className="font-bold text-slate-900">{transferResult.bankDetails.titularName}</span>
                    </div>
                  )}
                  {transferResult.bankDetails.bankName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Banco</span>
                      <span className="font-bold text-slate-900">{transferResult.bankDetails.bankName}</span>
                    </div>
                  )}
                  {transferResult.bankDetails.alias && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Alias</span>
                      <span className="font-black text-slate-900 text-base tracking-wide">{transferResult.bankDetails.alias}</span>
                    </div>
                  )}
                  {transferResult.bankDetails.cbu && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">CBU/CVU</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">{transferResult.bankDetails.cbu}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-emerald-200">
                    <span className="text-slate-500">Monto</span>
                    <span className="font-black text-indigo-700 text-lg">${(transferResult.amount).toLocaleString('es-AR')}</span>
                  </div>
                </div>

                {/* Código de referencia */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Código de referencia</p>
                  <p className="font-black text-amber-900 text-xl font-mono tracking-widest">{transferResult.referenceCode}</p>
                  <div className="bg-white/60 p-3 rounded-xl border border-amber-200/50 mt-2 text-left flex items-start gap-3">
                    <span className="text-xl leading-none">💡</span>
                    <p className="text-xs font-semibold text-amber-900/80 leading-tight">
                      IMPORTANTE: Ingresa este código exacto en el "Motivo" o "Concepto" de tu transferencia en tu app del banco. Es indispensable para que el tutor reconozca tu pago sin demoras.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 text-center font-medium">
                  Tu tutor activará tu acceso en menos de 24 hs hábiles tras verificar el pago.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {!paymentInitPoint && !transferResult && (
              <Button
                onClick={executePurchase}
                disabled={loading || !studentEmail || (price > 0 && mentorPaymentMethods.length > 1 && !selectedPaymentType)}
                className="w-full h-16 text-xl font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02]"
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? (
                  <Loader2 className="animate-spin h-6 w-6" />
                ) : price === 0 ? (
                  'Acceder Gratis'
                ) : selectedPaymentType === 'transfer' ? (
                  'Confirmar Transferencia'
                ) : (
                  `Pagar $${price.toLocaleString('es-AR')}`
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
                  className="text-slate-400 font-bold hover:bg-transparent"
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
