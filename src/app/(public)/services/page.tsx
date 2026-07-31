'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  GraduationCap, 
  Users, 
  Building, 
  School, 
  Sparkles, 
  Target, 
  ShieldCheck, 
  Zap,
  TrendingUp,
  Award,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

export default function ServicesPage() {
  const services = [
    {
      icon: GraduationCap,
      title: 'Para Tutores',
      description: 'Monetiza tu conocimiento y llega a estudiantes de calidad.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      features: [
        'Subportales personalizados con tu marca',
        'Gestión completa de estudiantes',
        'Herramientas de IA para crear contenido',
        'Procesamiento de pagos integrado',
        'Analytics detallados de tu rendimiento'
      ],
      cta: 'Comenzar como Tutor',
      href: '/auth'
    },
    {
      icon: Building,
      title: 'Para Empresas',
      description: 'Capacita a tu equipo con soluciones personalizadas y escalables.',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      features: [
        'Planes empresariales a medida',
        'Integración con sistemas de RRHH',
        'Dashboard de progreso corporativo',
        'Certificaciones personalizadas',
        'Soporte prioritario 24/7'
      ],
      cta: 'Solicitar Demo',
      href: '#contact'
    },
    {
      icon: Users,
      title: 'Para Estudiantes',
      description: 'Accede a formación de excelencia con mentors expertos.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      features: [
        'Cursos validados por expertos',
        'Aprendizaje personalizado con IA',
        'Certificaciones reconocidas',
        'Comunidad de aprendizaje activa',
        'Seguimiento de progreso detallado'
      ],
      cta: 'Explorar Cursos',
      href: '/courses'
    }
  ];

  const benefits = [
    {
      icon: Sparkles,
      title: 'Inteligencia Artificial',
      description: 'Gemini 2.5 Pro potencia cada aspecto de la plataforma, desde la creación de contenido hasta la personalización del aprendizaje.'
    },
    {
      icon: ShieldCheck,
      title: 'Calidad Garantizada',
      description: 'Sistema de invitaciones asegura que solo estudiantes motivados y tutores calificados formen parte de la comunidad.'
    },
    {
      icon: Zap,
      title: 'Rápida Implementación',
      description: 'Pon en marcha tu programa de formación en días, no meses, con nuestra plataforma intuitiva y sin código.'
    },
    {
      icon: TrendingUp,
      title: 'Escalabilidad Infinita',
      description: 'Desde un tutor independiente hasta corporaciones multinacionales, nuestra plataforma crece contigo.'
    }
  ];

  const stats = [
    { number: '500+', label: 'Tutores Activos' },
    { number: '10K+', label: 'Estudiantes' },
    { number: '98%', label: 'Satisfacción' },
    { number: '50+', label: 'Cursos Premium' }
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans selection:bg-primary/10">
      {/* Dynamic Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-accent/5 blur-[100px] rounded-full" />
      </div>

      <LandingHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-accent/10">
        <div className="container mx-auto px-6 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-semibold">
              <Target className="w-4 h-4 mr-2" />
              Soluciones para Cada Necesidad
            </div>
            <h1 className="font-headline text-5xl lg:text-7xl font-bold leading-tight text-primary">
              Plataforma <span className="text-accent">versátil</span> para todos
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Tanto si eres un tutor independiente, una empresa en crecimiento o una institución 
              educativa, tenemos la solución perfecta para tus necesidades de formación.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/courses">
                <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 shadow-primary/20">
                  Explorar Soluciones
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2 hover:bg-secondary">
                  Conocer Nosotros
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/20 rounded-full blur-[100px]" />
      </section>

      {/* Stats */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center space-y-2">
                <div className="font-headline text-4xl font-bold text-primary">{stat.number}</div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Services */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-headline text-4xl font-bold text-primary">Soluciones Adaptadas a Ti</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Cada servicio está diseñado para resolver problemas específicos y maximizar el valor para nuestro usuarios.
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            {services.map((service, idx) => (
              <Card key={idx} className="border-none transition-all duration-500 group overflow-hidden">
                <CardHeader className="pb-6">
                  <div className={`w-16 h-16 rounded-2xl ${service.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <service.icon className={`h-8 w-8 ${service.color}`} />
                  </div>
                  <CardTitle className="font-headline text-2xl font-bold text-primary group-hover:text-accent transition-colors">
                    {service.title}
                  </CardTitle>
                  <p className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {service.features.map((feature, featureIdx) => (
                      <li key={featureIdx} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={service.href}>
                    <Button className="w-full h-12 font-semibold group-hover:bg-primary group-hover:text-white transition-colors">
                      {service.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-headline text-4xl font-bold text-primary">Por Qué Elegirnos</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Características únicas que nos diferencian y garantizan tu éxito.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, idx) => (
              <Card key={idx} className="rounded-lg transition-shadow group text-center">
                <CardContent className="p-8 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <benefit.icon className="h-8 w-8 text-primary group-hover:text-primary-foreground" />
                  </div>
                  <h3 className="font-headline font-bold text-xl text-primary">{benefit.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <Badge className="w-fit bg-primary/10 text-primary border-primary/20 font-semibold">
                <School className="w-4 h-4 mr-2" />
                Casos de Uso Reales
              </Badge>
              <h2 className="font-headline text-4xl font-bold text-primary">
                Transformando organizaciones de todos los tamaños
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-primary mb-1">Tutor Independiente</h3>
                    <p className="text-muted-foreground">María, consultora de marketing, creó 5 cursos y genera $5,000 mensuales con su subportal personalizado.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Building className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-primary mb-1">Empresa Tecnológica</h3>
                    <p className="text-muted-foreground">TechCorp capacitó a 200 empleados en habilidades digitales con 90% de satisfacción y 40% de mejora en productividad.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-primary mb-1">Institución Educativa</h3>
                    <p className="text-muted-foreground">Universidad Moderna implementó aprendizaje híbrido para 1,000 estudiantes con reducción del 60% en costos operativos.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative aspect-square max-w-[500px] mx-auto">
              <div className="absolute inset-0 bg-accent/10 blur-[100px] rounded-full" />
              <div className="relative h-full w-full rounded-3xl overflow-hidden border-4 border-white">
                <Image 
                  src="https://loremflickr.com/600/600/services,digital?lock=usecases" 
                  alt="Casos de Uso"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-6 text-center space-y-8">
          <Badge className="w-fit bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 font-semibold">
            <Award className="w-4 h-4 mr-2" />
            Comienza tu Transformación
          </Badge>
          <h2 className="font-headline text-4xl font-bold">
            ¿Lista para llevar tu formación al siguiente nivel?
          </h2>
          <p className="text-xl max-w-2xl mx-auto opacity-90">
            Únete a miles de profesionales que ya están transformando su futuro 
            con nuestra plataforma impulsada por IA.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/auth">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-semibold">
                <Sparkles className="w-5 h-5 mr-2" />
                Empezar Gratis
              </Button>
            </Link>
            <Link href="#contact">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2 text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Contactar Ventas
              </Button>
            </Link>
          </div>
        </div>
      </section>
      </main>
      
      <LandingFooter />
    </div>
  );
}
