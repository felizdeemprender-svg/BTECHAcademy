'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, Sparkles, Rocket, BookOpen, UserCheck, ShieldCheck, ArrowRight, Users, Globe, Trophy } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

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
            <div className="inline-flex items-center px-5 py-2 rounded-full bg-white border border-border shadow-sm text-primary text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-1000">
              <span className="w-2 h-2 rounded-full bg-success mr-3 animate-ping" />
              Gemini 2.5 Pro Integration Active
            </div>
            
            <h1 className="font-headline text-5xl lg:text-7xl font-bold leading-tight text-primary">
              La <span className="text-accent">Plataforma</span> que Transforma Mentores en <span className="text-accent">Líderes</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Potencia tu marca personal, automatiza tu gestión educativa y accede a una red exclusiva de conocimiento institucional con IA de última generación.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/auth">
                <Button size="2xl" className="shadow-xl shadow-primary/20">
                  <Rocket className="w-6 h-6 mr-2" />
                  Comenzar Ahora
                </Button>
              </Link>
              <Link href="/courses">
                <Button size="2xl" variant="outline" className="border-2 hover:bg-secondary">
                  <BookOpen className="w-6 h-6 mr-2" />
                  Explorar Cursos
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex-1 relative">
            <div className="relative w-full h-96 lg:h-full min-h-[400px]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl animate-pulse" />
              <div className="absolute inset-4 bg-white rounded-2xl flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <GraduationCap className="w-16 h-16 text-primary mx-auto" />
                  <h3 className="text-2xl font-bold text-primary">FastoriaAcademy</h3>
                  <p className="text-muted-foreground">Educación de Alto Impacto</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <Badge className="mb-4">Características Principales</Badge>
              <h2 className="text-4xl font-bold text-primary mb-4">Todo lo que necesitas para tener éxito</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Herramientas avanzadas diseñadas para mentores modernos que buscan impacto real
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">IA Integrada</h3>
                <p className="text-muted-foreground">Gemini 2.5 Pro para contenido personalizado y automatización inteligente</p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Gestión de Alumnos</h3>
                <p className="text-muted-foreground">Seguimiento detallado y análisis de progreso en tiempo real</p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Seguridad Total</h3>
                <p className="text-muted-foreground">Protección de datos y contenido con encriptación de nivel empresarial</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary">500+</div>
                <div className="text-muted-foreground">Mentores Activos</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary">10K+</div>
                <div className="text-muted-foreground">Estudiantes</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary">98%</div>
                <div className="text-muted-foreground">Satisfacción</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary">50+</div>
                <div className="text-muted-foreground">Cursos Premium</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6 text-center">
            <Badge className="mb-4">Comienza Hoy</Badge>
            <h2 className="text-4xl font-bold text-primary mb-4">¿Listo para transformar tu futuro?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Únete a miles de mentores que ya están cambiando vidas con FastoriaAcademy
            </p>
            <Link href="/auth">
              <Button size="2xl" className="shadow-xl">
                <UserCheck className="w-6 h-6 mr-2" />
                Crear Cuenta Gratuita
              </Button>
            </Link>
          </div>
        </section>

        {/* Global KPIs / Trust Indicators */}
        <section className="bg-muted py-24 border-y border-border/60">
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
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
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
                <div key={idx} className="bg-white p-10 rounded-lg border border-muted shadow-sm transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    <feature.icon className="h-7 w-7 transition-colors" />
                  </div>
                  <h3 className="font-bold text-2xl mb-4 text-primary">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed font-medium">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subscriptions Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6 text-center">
            <Badge className="mb-4">Planes Disponibles</Badge>
            <h2 className="text-4xl font-bold text-primary mb-4">Elige tu Plan</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Planes flexibles para mentores en diferentes etapas de crecimiento
            </p>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="bg-white p-8 rounded-2xl border border-border">
                <h3 className="text-xl font-bold text-primary mb-4">Básico</h3>
                <p className="text-3xl font-bold mb-4">Gratis</p>
                <p className="text-muted-foreground mb-6">Perfecto para comenzar</p>
                <Link href="/auth">
                  <Button className="w-full">Comenzar Gratis</Button>
                </Link>
              </div>
              <div className="bg-primary text-white p-8 rounded-2xl">
                <h3 className="text-xl font-bold mb-4">Profesional</h3>
                <p className="text-3xl font-bold mb-4">$29/mes</p>
                <p className="text-primary-foreground mb-6">Para mentores activos</p>
                <Button variant="secondary" className="w-full">Prueba Gratuita</Button>
              </div>
              <div className="bg-foreground text-white p-8 rounded-2xl">
                <h3 className="text-xl font-bold mb-4">Enterprise</h3>
                <p className="text-3xl font-bold mb-4">$99/mes</p>
                <p className="text-border mb-6">Para instituciones</p>
                <Button variant="outline" className="w-full border-white text-white hover:bg-white hover:text-foreground">Contactar</Button>
              </div>
            </div>
          </div>
        </section>

      </main>

      <LandingFooter />
    </div>
  );
}
