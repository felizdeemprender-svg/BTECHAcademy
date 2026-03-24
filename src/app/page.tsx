'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, Sparkles, Rocket, BookOpen, UserCheck, ShieldCheck, ArrowRight, Users, Globe, Trophy } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';
import PlansSection from '@/components/landing/PlansSection';
import CourseCatalogPreview from '@/components/landing/CourseCatalogPreview';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans selection:bg-primary/10">
      {/* Dynamic Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-accent/5 blur-[100px] rounded-full" />
      </div>

      <LandingHeader />

      <main className="flex-1">
        {/* Modern Hero Section */}
        <section className="relative container mx-auto px-6 py-24 lg:py-40 flex flex-col lg:flex-row items-center gap-20 overflow-hidden">
          <div className="flex-1 space-y-10 text-center lg:text-left z-10">
            <div className="inline-flex items-center px-5 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-primary text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-1000">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-3 animate-ping" />
              Gemini 2.5 Pro Integration Active
            </div>
            
            <h1 className="font-bold text-6xl lg:text-8xl leading-[0.9] text-primary tracking-tighter">
              El Futuro de la <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary bg-300% animate-gradient">Educación</span> es Hoy
            </h1>
            
            <p className="text-xl text-slate-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
              BTECH by Academy trasciende la enseñanza tradicional. Nuestra plataforma combina IA de vanguardia con un ecosistema de gestión exclusivo para instituciones y mentores de alto impacto.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start pt-6">
              <Link href="/courses">
                <Button size="lg" className="h-16 px-10 text-lg bg-primary hover:bg-primary/95 shadow-2xl shadow-primary/30 rounded-2xl font-black group transition-all">
                  Explorar Catálogo <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="h-16 px-10 text-lg border-2 border-slate-200 hover:border-primary hover:bg-secondary/50 rounded-2xl font-bold transition-all">
                  Más Información
                </Button>
              </Link>
            </div>

            {/* Micro Stats in Hero */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-10 pt-10 border-t border-slate-100">
              <div className="space-y-1">
                <p className="text-3xl font-black text-primary">500+</p>
                <p className="text-xs uppercase font-bold text-slate-400 tracking-widest">Cursos Activos</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black text-primary">12k+</p>
                <p className="text-xs uppercase font-bold text-slate-400 tracking-widest">Estudiantes</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black text-primary">98%</p>
                <p className="text-xs uppercase font-bold text-slate-400 tracking-widest">Certificaciones</p>
              </div>
            </div>
          </div>

          <div className="flex-1 relative w-full aspect-square max-w-[600px] group">
            <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full group-hover:bg-accent/20 transition-colors duration-1000" />
            <div className="relative h-full w-full rounded-[3.5rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border-[8px] border-white/50 backdrop-blur-sm transform rotate-1 group-hover:rotate-0 transition-transform duration-700">
              <Image 
                src="https://loremflickr.com/1200/1200/education,technology,learning?lock=1" 
                alt="Plataforma BTECH by Academy"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover scale-110 group-hover:scale-100 transition-transform duration-1000"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              
              {/* Floating Element */}
              <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-xl flex items-center justify-between border border-white/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center">
                    <Trophy className="text-white h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Nivel Institucional</p>
                    <p className="font-black text-primary text-xl">Certificación Oro</p>
                  </div>
                </div>
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
                      <Image src={`https://i.pravatar.cc/100?u=${i}`} alt="user" width={32} height={32} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Course Catalog Section */}
        <CourseCatalogPreview />

        {/* Global KPIs / Trust Indicators */}
        <section className="bg-slate-50 py-24 border-y border-slate-200/60">
          <div className="container mx-auto px-6 grid md:grid-cols-4 gap-12 text-center">
            {[
              { icon: Users, label: 'Mentores Activos', value: '1,200+' },
              { icon: Globe, label: 'Páginas Propias', value: '850+' },
              { icon: ShieldCheck, label: 'Garantía Académica', value: '100%' },
              { icon: Sparkles, label: 'Innovación Perenne', value: '24/7' },
            ].map((stat, idx) => (
              <div key={idx} className="space-y-3 group">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md mx-auto flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                  <stat.icon className="h-6 w-6" />
                </div>
                <h3 className="text-3xl font-black text-primary">{stat.value}</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features / Why Us */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20 space-y-4">
              <Badge variant="outline" className="px-4 py-1 rounded-full border-primary/20 text-primary font-bold">Tecnología de Punta</Badge>
              <h2 className="text-4xl font-bold tracking-tight text-primary">Impulsa tu <span className="text-accent underline decoration-accent/30">Visibilidad</span></h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">No solo una plataforma de cursos, sino un ecosistema completo para tu crecimiento profesional.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: GraduationCap, title: 'Inscripciones VIP', desc: 'Gestiona tu matrícula mediante invitaciones directas o ventas públicas con control total.' },
                { icon: Sparkles, title: 'Inteligencia Artificial', desc: 'Sube tus documentos y deja que Gemini 2.5 Pro genere el contenido y Quizzes por ti.' },
                { icon: Rocket, title: 'Lanzamientos', desc: 'Herramientas de marketing integradas para llevar tus cursos al mercado en tiempo récord.' },
                { icon: UserCheck, title: 'Panel Institucional', desc: 'Vistas optimizadas para coordinadores que necesitan analíticas y reportes globales.' },
                { icon: ShieldCheck, title: 'Infraestructura Robusta', desc: 'Nube privada escalable que asegura que tu contenido esté siempre disponible.' },
                { icon: BookOpen, title: 'Multi-formato', desc: 'Desde videos HD hasta documentos complejos y desafíos interactivos en un solo lugar.' },
              ].map((feature, idx) => (
                <div key={idx} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    <feature.icon className="h-7 w-7 transition-colors" />
                  </div>
                  <h3 className="font-bold text-2xl mb-4 text-primary">{feature.title}</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subscriptions Section */}
        <PlansSection />

      </main>

      <LandingFooter />
    </div>
  );
}
