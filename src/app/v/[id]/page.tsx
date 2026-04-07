
'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs, limit } from 'firebase/firestore';
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
  Phone
} from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [loading, setLoading] = useState(false);
  const [mentorProfile, setMentorProfile] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const pageRef = useMemoFirebase(() => doc(db, 'salesPages', id), [db, id]);
  const { data: page, isLoading: pageLoading } = useDoc(pageRef);

  useEffect(() => {
    if (page?.mentorId) {
      getDocs(query(collection(db, 'users'), where('uid', '==', page.mentorId), limit(1))).then(snap => {
        if (!snap.empty) setMentorProfile(snap.docs[0].data());
      }).catch(err => console.error('Error fetching mentor profile:', err));
    }
  }, [db, page?.mentorId]);

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
    setLoading(true);

    // Attribution Tracking
    const source = searchParams.get('s') || 'direct';
    const channel = searchParams.get('c') || 'direct';

    try {
      const { setDoc, increment } = await import('firebase/firestore');
      const pageRef = doc(db, 'salesPages', id);
      await setDoc(pageRef, {
        stats: {
          conversions: increment(1),
          channelBreakdown: {
            [channel]: { conversions: increment(1) }
          },
          sourceBreakdown: {
            [source]: { conversions: increment(1) }
          }
        }
      }, { merge: true });
    } catch (e) {
      // silent
    }

    toast({
      title: 'Redirigiendo a Pago Seguro',
      description: 'Conectando con MercadoPago Checkout Pro...'
    });
    setTimeout(() => {
      setLoading(false);
      toast({ title: 'En Proceso', description: 'Checkout en configuración. Contacta al mentor directamente.' });
    }, 2000);
  };

  if (pageLoading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (!page || !page.isActive) return <div className="flex h-screen items-center justify-center"><p className="font-bold text-muted-foreground uppercase tracking-widest">Página no disponible.</p></div>;

  // Selección dinámica de la variante
  const landings = page.aiContent?.landings || [];
  const content = landings[variantIdx] || page.aiContent?.landing;
  const price = page.price || 49990;

  if (!content) return <div className="flex h-screen items-center justify-center"><p className="font-bold text-muted-foreground">Contenido en proceso de generación...</p></div>;

  const socials = mentorProfile?.profile?.socials || {};

  // Extract template design tokens
  const tokens = (content as any)?.designTokens || {};
  const primaryColor = tokens.primary || page.branding?.primaryColor || '#3B2D86';
  const secondaryColor = tokens.secondary || '#F1F5F9';
  const accentColor = tokens.accent || '#FACC15';
  const fontHeading = tokens.fontHeading || 'inherit';
  const fontBody = tokens.fontBody || 'inherit';

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 selection:bg-primary/20"
      style={{
        fontFamily: fontBody,
        ['--primary' as any]: primaryColor,
        ['--secondary' as any]: secondaryColor,
        ['--accent' as any]: accentColor,
      }}
    >
      {/* Dynamic Font Injection */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=${fontHeading.replace(/\s+/g, '+')} &family=${fontBody.replace(/\s+/g, '+')}&display=swap');
        .font-headline { font-family: ${fontHeading}, sans-serif !important; }
        .font-body { font-family: ${fontBody}, sans-serif !important; }
      `}</style>

      {/* Header - Marca Blanca */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 font-body">
        <div className="container mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {page.branding?.logoUrl && (
              <div className="relative w-10 h-10 overflow-hidden shrink-0">
                <Image src={page.branding.logoUrl} alt="Mentor Logo" fill className="object-contain" unoptimized />
              </div>
            )}
            <span className="font-headline font-black text-xl tracking-tight" style={{ color: primaryColor }}>{mentorProfile?.displayName || 'Programa Pro'}</span>
          </div>
          <Button onClick={handlePurchase} className="rounded-xl font-bold h-11 px-8 shadow-lg shadow-primary/20 font-body" style={{ backgroundColor: primaryColor }}>
            {content.ctaText}
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 lg:py-32 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none" style={{ color: primaryColor }}>
          <Sparkles className="h-96 w-96" />
        </div>
        <div className="container mx-auto px-6 max-w-5xl text-center space-y-10 relative z-10">
          <h1 className="text-5xl lg:text-7xl font-headline font-black leading-[1.1] tracking-tighter" style={{ color: primaryColor }}>
            {content.headline}
          </h1>
          <p className="text-xl lg:text-2xl text-slate-500 font-medium max-w-3xl mx-auto leading-relaxed italic">
            {content.subheadline}
          </p>

          {content.videoUrl && (
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
            <Button onClick={handlePurchase} size="lg" className="h-16 px-12 text-xl font-bold rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: primaryColor }}>
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : content.ctaText}
            </Button>
          </div>
        </div>
      </section>

      {/* Narrative Sections */}
      <section className="py-24 space-y-32">
        {content.sections?.map((s: any, i: number) => (
          <div key={i} className="container mx-auto px-6 max-w-6xl">
            <div className={cn(
              "flex flex-col gap-16 items-center",
              i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
            )}>
              <div className="flex-1 space-y-8">
                <h3 className="text-4xl font-black text-slate-900 leading-tight">{s.title}</h3>
                <p className="text-lg text-slate-600 leading-relaxed font-medium">{s.paragraph}</p>
                <div className="grid gap-4">
                  {s.microBullets?.map((bullet: string, bIdx: number) => (
                    <div key={bIdx} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                      <span className="text-sm font-bold text-slate-700">{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full aspect-[4/3] rounded-[3rem] bg-slate-100 border-[12px] border-white shadow-2xl relative overflow-hidden group">
                <Image src={s.imageUrl || `https://loremflickr.com/800/600/${(page.aiContent?.courseKeywords || 'business,education,growth').split(',').slice(0, 3).join(',')},professional?lock=${i + 1}`} alt="Visual" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Mentor & Dynamic Pricing */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute bottom-0 left-0 p-20 opacity-5 pointer-events-none">
          <Award className="h-96 w-96 text-white" />
        </div>
        <div className="container mx-auto px-6 max-w-5xl relative z-10 text-center space-y-12">
          <div className="inline-block p-1 rounded-full bg-white/5 border border-white/10 mb-4">
            <Image
              src={mentorProfile?.photoURL || 'https://placehold.co/200/png'}
              alt="Mentor"
              width={120}
              height={120}
              className="rounded-full grayscale"
              unoptimized
            />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Tu Mentor: {mentorProfile?.displayName}</h2>
            <p className="text-slate-400 text-lg italic leading-relaxed max-w-2xl mx-auto">
              "{content.aboutMentor}"
            </p>
          </div>

          <Card className="max-w-md mx-auto bg-white text-slate-900 rounded-[3rem] p-12 space-y-8 border-none shadow-3xl transform hover:scale-105 transition-transform">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Inversión Única</p>
              <p className="text-6xl font-black tracking-tighter" style={{ color: primaryColor }}>
                ${price.toLocaleString('es-AR')}
              </p>
              <p className="text-sm font-bold text-slate-500 italic">Financiación disponible con MercadoPago</p>
            </div>
            <div className="space-y-4 pt-4 text-left">
              <div className="flex items-center gap-3 text-xs font-bold"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Garantía de Satisfacción 7 días</div>
              <div className="flex items-center gap-3 text-xs font-bold"><Users className="h-4 w-4 text-blue-500" /> Acceso a Comunidad Exclusiva</div>
            </div>
            <Button onClick={handlePurchase} size="lg" className="w-full h-16 text-xl font-bold rounded-2xl shadow-xl transition-all" style={{ backgroundColor: primaryColor }}>
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : content.ctaText}
            </Button>
          </Card>
        </div>
      </section>

      {/* Footer - Marca Blanca */}
      <footer className="py-16 border-t border-slate-200 bg-white">
        <div className="container mx-auto px-6 text-center space-y-10">
          <div className="flex items-center justify-center gap-6">
            {socials.linkedin && <a href={socials.linkedin} target="_blank" className="hover:scale-110 transition-transform"><Linkedin className="h-6 w-6 text-slate-400 hover:text-[#0077B5]" /></a>}
            {socials.instagram && <a href={socials.instagram} target="_blank" className="hover:scale-110 transition-transform"><Instagram className="h-6 w-6 text-slate-400 hover:text-[#E4405F]" /></a>}
            {socials.twitter && <a href={socials.twitter} target="_blank" className="hover:scale-110 transition-transform"><Twitter className="h-6 w-6 text-slate-400 hover:text-black" /></a>}
            {socials.youtube && <a href={socials.youtube} target="_blank" className="hover:scale-110 transition-transform"><Youtube className="h-6 w-6 text-slate-400 hover:text-[#FF0000]" /></a>}
            {socials.tiktok && <a href={socials.tiktok} target="_blank" className="hover:scale-110 transition-transform"><TikTokIcon className="h-6 w-6 text-slate-400 hover:text-black" /></a>}
            {socials.whatsapp && <a href={`https://wa.me/${socials.whatsapp}`} target="_blank" className="hover:scale-110 transition-transform"><MessageCircle className="h-6 w-6 text-slate-400 hover:text-[#25D366]" /></a>}
            {socials.website && <a href={socials.website} target="_blank" className="hover:scale-110 transition-transform"><Globe className="h-6 w-6 text-slate-400" /></a>}
          </div>
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Entorno de Aprendizaje Seguro</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">© {new Date().getFullYear()} {mentorProfile?.displayName}. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
