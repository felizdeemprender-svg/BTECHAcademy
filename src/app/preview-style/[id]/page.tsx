'use client';

import { use, useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Rocket, ShieldCheck, Play, Award, Sparkles, CheckCircle2,
  Users, Globe, Youtube, Phone, Clock, AlertTriangle, Linkedin, Instagram, Twitter, MessageCircle
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

export default function StylePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const db = useFirestore();

  const styleRef = useMemoFirebase(() => doc(db, 'landingStyles', id), [db, id]);
  const { data: styleData, isLoading } = useDoc(styleRef);

  // MOCK DATA
  const mentorProfile = {
    displayName: 'Mentor de Prueba',
    photoURL: 'https://placehold.co/400/png',
    profile: {
      bio: 'Soy un experto en mi área y te enseñaré todo lo que necesitas saber.',
      socials: { instagram: '#', linkedin: '#' }
    }
  };

  const modules = [
    { title: 'Fundamentos del Éxito', description: 'Bases teóricas y metodologías aplicadas.', duration: '1h 20m' },
    { title: 'Tácticas Avanzadas', description: 'Cómo escalar tu negocio al siguiente nivel.', duration: '2h 15m' },
    { title: 'Práctica y Ejecución', description: 'Puesta en marcha de todo lo aprendido.', duration: '4h 00m' }
  ];

  const content = {
    headline: 'Descubre el Secreto del Éxito Profesional',
    subheadline: 'Domina las herramientas que te llevarán al siguiente nivel en tiempo récord, sin importar tu experiencia previa.',
    ctaText: 'Quiero Inscribirme Ahora',
    aboutMentor: 'Con más de 10 años de experiencia, he ayudado a miles de emprendedores a transformar sus ideas en negocios rentables.',
    visibility: { showHeroVideo: true, showNarrative: true, showSyllabus: true, showBenefits: true, showMentor: true, showFaqs: true },
    themeMode: 'light',
    sections: [
      { title: 'El problema de siempre', paragraph: 'Estás estancado trabajando muchas horas sin ver resultados reales en tus ingresos ni en tu crecimiento personal.', microBullets: ['Bajos ingresos', 'Falta de tiempo', 'Estrés constante'] },
      { title: 'La solución definitiva', paragraph: 'Implementa el sistema paso a paso que ha funcionado para más de 5,000 alumnos en toda Latinoamérica.', microBullets: ['Automatización', 'Escalabilidad', 'Libertad financiera'] }
    ],
    benefits: ['Acceso de por vida al material', 'Soporte personalizado 1 a 1', 'Comunidad privada exclusiva'],
    faqs: [
      { question: '¿Necesito experiencia previa?', answer: 'No, el programa está diseñado desde cero.' },
      { question: '¿Cuánto tiempo debo dedicarle?', answer: 'Con solo 2 horas a la semana es suficiente.' }
    ],
    designTokens: {} as any
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (!styleData) return <div className="flex h-screen items-center justify-center"><p className="font-bold text-muted-foreground uppercase tracking-widest">Estilo no encontrado.</p></div>;

  // Set tokens from style
  const primaryColor = styleData.colorProposals?.[0]?.primary || '#3B2D86';
  const secondaryColor = styleData.colorProposals?.[0]?.secondary || '#F1F5F9';
  const accentColor = styleData.colorProposals?.[0]?.accent || '#FACC15';
  const fontHeading = styleData.typography?.[0]?.headingFont || 'Inter';
  const fontBody = styleData.typography?.[0]?.bodyFont || 'Inter';

  // Apply layout config (Mocking theme mode based on tokens or just keeping it light for now, real engine uses AI output for themeMode)
  const isDark = styleData.tokens?.themeMode === 'dark';
  const isGlass = styleData.tokens?.themeMode === 'glass';

  const bgBase    = isDark ? 'bg-slate-950' : isGlass ? 'bg-indigo-950' : 'bg-slate-50';
  const textBase  = isDark ? 'text-slate-100' : isGlass ? 'text-indigo-50' : 'text-slate-900';
  const bgSurface = isDark ? 'bg-slate-900' : isGlass ? 'bg-indigo-900/60 backdrop-blur-xl' : 'bg-white';
  const textMuted = isDark ? 'text-slate-400' : isGlass ? 'text-indigo-200' : 'text-slate-600';
  const borderSubtle = isDark ? 'border-slate-800' : isGlass ? 'border-indigo-700/40' : 'border-slate-100';

  const price = 49990;

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
      <div className="bg-yellow-400 text-yellow-900 font-bold text-center py-2 text-xs uppercase tracking-widest z-50 sticky top-0">
        MODO DE VISTA PREVIA (ESTILO: {styleData.name})
      </div>
      
      {/* Dynamic Font Injection */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=${fontHeading.replace(/\s+/g, '+')}&family=${fontBody.replace(/\s+/g, '+')}&display=swap');
        .font-headline { font-family: ${fontHeading}, sans-serif !important; }
        .font-body { font-family: ${fontBody}, sans-serif !important; }
      `}</style>

      {/* Header */}
      <nav className={cn("backdrop-blur-md sticky top-8 z-40 border-b font-body", isDark ? 'bg-slate-950/80 border-slate-800' : isGlass ? 'bg-indigo-950/80 border-indigo-800' : 'bg-white/80 border-slate-100')}>
        <div className="container mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="font-headline font-black text-xl tracking-tight" style={{ color: primaryColor }}>{mentorProfile.displayName}</span>
          </div>
          <Button
            className="rounded-xl font-bold h-11 px-8 shadow-lg shadow-primary/20 font-body"
            style={{ backgroundColor: primaryColor }}
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

          <div className="max-w-4xl mx-auto aspect-video rounded-lg overflow-hidden border-[12px] border-slate-50 bg-slate-800 relative group/video-container flex items-center justify-center">
            <div className="text-slate-500 font-bold uppercase tracking-widest text-sm flex flex-col items-center gap-4">
              <Play className="h-16 w-16" />
              Simulador de Video
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button
              size="lg"
              className="h-16 px-12 text-xl font-bold rounded-2xl transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              {content.ctaText}
            </Button>
          </div>
        </div>
      </section>

      {/* Narrative Sections */}
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
              <div className={cn("flex-1 w-full aspect-[4/3] rounded-lg border-[12px] relative overflow-hidden group", isDark ? 'border-slate-800 bg-slate-800' : isGlass ? 'border-indigo-800 bg-indigo-900' : 'border-white bg-slate-100')}>
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                  Simulador de Imagen
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Syllabus Section */}
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
                  <p className={cn("text-sm font-medium leading-relaxed", textMuted)}>{mod.description}</p>
                  <div className="flex items-center gap-1.5 pt-1" style={{ color: primaryColor }}>
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{mod.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
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
              <div key={bIdx} className={cn("p-8 rounded-lg border transition-all group", bgSurface, borderSubtle)}>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className={cn("font-bold leading-snug", textBase)}>{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mentor Section */}
      <section className={cn("py-24 overflow-hidden relative border-t", bgSurface, borderSubtle)}>
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col lg:flex-row items-center gap-16">
             <div className="relative w-64 h-64 lg:w-80 lg:h-80 shrink-0">
               <div className="absolute inset-0 bg-primary/5 rounded-[4rem] rotate-6" />
               <div className={cn("absolute inset-0 rounded-[4rem] -rotate-3 overflow-hidden border-[10px]", isDark ? 'border-slate-800 bg-slate-900' : 'border-white bg-slate-100')}>
                 <Image
                    src={mentorProfile.photoURL}
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
                 "{content.aboutMentor}"
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

      {/* FAQs Section */}
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

      {/* Pricing & Closure */}
      <section className="py-32 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute bottom-0 left-0 p-20 opacity-5 pointer-events-none">
          <Rocket className="h-96 w-96 text-white" />
        </div>
        <div className="container mx-auto px-6 max-w-5xl relative z-10 text-center space-y-12">
          <Card className={cn("max-w-md mx-auto rounded-lg p-12 space-y-8 border-none transform hover:scale-105 transition-transform", isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900')}>
            <div className="space-y-2">
              <p className={cn("text-xs font-black uppercase tracking-[0.3em]", isDark ? 'text-slate-400' : 'text-slate-400')}>Inversión Única</p>
              <p className="text-6xl font-black tracking-tighter" style={{ color: primaryColor }}>
                ${price.toLocaleString('es-AR')}
              </p>
            </div>
            <div className="space-y-4 pt-4 text-left">
              <div className="flex items-center gap-3 text-xs font-bold"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Garantía de Satisfacción 7 días</div>
              <div className="flex items-center gap-3 text-xs font-bold"><Users className="h-4 w-4 text-blue-500" /> Acceso a Comunidad Exclusiva</div>
            </div>
            <Button
              size="lg"
              className="w-full h-16 text-xl font-bold rounded-2xl transition-all"
              style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}
            >
              {content.ctaText}
            </Button>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className={cn("py-16 border-t pb-32 md:pb-16", bgSurface, borderSubtle)}>
        <div className="container mx-auto px-6 text-center space-y-10">
          <div className="flex items-center justify-center gap-6">
            <Linkedin className={cn("h-6 w-6 hover:text-[#0077B5]", textMuted)} />
            <Instagram className={cn("h-6 w-6 hover:text-[#E4405F]", textMuted)} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", textMuted)}>Entorno de Aprendizaje Seguro</span>
          </div>
          <p className={cn("text-xs font-medium", textMuted)}>© {new Date().getFullYear()} {mentorProfile.displayName}. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
