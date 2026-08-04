'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  Users, 
  Award, 
  Target,
  Quote,
  Star,
  Building,
  GraduationCap,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function CaseStudiesPage() {
  const caseStudies = [
    {
      id: 'techcorp-digital-transformation',
      title: 'TechCorp: Transformación Digital Exitosa',
      category: 'Empresa Tecnológica',
      client: 'TechCorp Solutions',
      challenge: 'Necesitaban capacitar a 200 empleados en habilidades digitales rápidamente para mantenerse competitivos.',
      solution: 'Implementamos programa personalizado con 15 cursos, seguimiento en tiempo real y certificaciones.',
      results: [
        { metric: '90%', description: 'Satisfacción del empleado' },
        { metric: '40%', description: 'Mejora en productividad' },
        { metric: '60%', description: 'Reducción en costos de capacitación' },
        { metric: '3 meses', description: 'Tiempo de implementación' }
      ],
      testimonial: {
        quote: 'Evolución Académica AI transformó completamente nuestra estrategia de capacitación. El ROI fue visible desde el primer mes.',
        author: 'Ana Martínez',
        role: 'Directora de RRHH',
        photo: 'https://loremflickr.com/60/60/person,professional?lock=ana'
      },
      image: 'https://loremflickr.com/600/400/company,tech?lock=techcorp',
      tags: ['Capacitación Corporativa', 'Habilidades Digitales', 'ROI Medible']
    },
    {
      id: 'maria-marketing-consultant',
      title: 'María González: De Consultora a Emprendedora Educativa',
      category: 'Tutor Independiente',
      client: 'María González Marketing',
      challenge: 'Consultora con 10 años de experiencia quería monetizar su conocimiento más allá de clientes 1-a-1.',
      solution: 'Creó subportal personalizado con 5 cursos premium, sistema de automatización y comunidad activa.',
      results: [
        { metric: '$5,000', description: 'Ingresos mensuales recurrentes' },
        { metric: '150+', description: 'Estudiantes activos' },
        { metric: '4.9/5', description: 'Rating promedio' },
        { metric: '80%', description: 'Tasa de finalización' }
      ],
      testimonial: {
        quote: 'Pasé de depender de clientes a tener ingresos predecibles mientras duermo. La plataforma lo hace todo fácil.',
        author: 'María González',
        role: 'Consultora de Marketing',
        photo: 'https://loremflickr.com/60/60/person,professional?lock=maria'
      },
      image: 'https://loremflickr.com/600/400/business,office?lock=maria-gonzalez',
      tags: ['Monetización', 'Subportal Personalizado', 'Educación Digital']
    },
    {
      id: 'universidad-moderna-hybrid-learning',
      title: 'Universidad Moderna: Revolución del Aprendizaje Híbrido',
      category: 'Institución Educativa',
      client: 'Universidad Moderna',
      challenge: 'Institución tradicional necesitaba modernizar su oferta educativa y llegar a más estudiantes sin aumentar costos.',
      solution: 'Plataforma white-label con 30 cursos, integración con sistemas existentes y analytics avanzados.',
      results: [
        { metric: '1,000+', description: 'Estudiantes online' },
        { metric: '50%', description: 'Reducción costos operativos' },
        { metric: '95%', description: 'Satisfacción estudiantil' },
        { metric: '24/7', description: 'Disponibilidad de contenido' }
      ],
      testimonial: {
        quote: 'La tecnología nos permitió expandir nuestro alcance sin sacrificar calidad. Los estudiantes aman la flexibilidad.',
        author: 'Dr. Carlos Rodríguez',
        role: 'Rector Universidad Moderna',
        photo: 'https://loremflickr.com/60/60/person,professional?lock=carlos'
      },
      image: 'https://loremflickr.com/600/400/university,education?lock=universidad',
      tags: ['Educación Superior', 'Aprendizaje Híbrido', 'White-Label']
    }
  ];

  const metrics = [
    { icon: Users, value: '10,000+', label: 'Estudiantes Transformados' },
    { icon: Building, value: '500+', label: 'Organizaciones Impactadas' },
    { icon: Award, value: '98%', label: 'Tasa de Satisfacción' },
    { icon: TrendingUp, value: '300%', label: 'ROI Promedio' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-accent/10">
        <div className="container mx-auto px-6 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-semibold">
              <Award className="w-4 h-4 mr-2" />
              Historias de Éxito Comprobadas
            </div>
            <h1 className="font-headline text-5xl lg:text-7xl font-bold leading-tight text-primary">
              Resultados <span className="text-accent">reales</span> que inspiran
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Descubre cómo organizaciones y profesionales como tú han transformado 
              su futuro con nuestra plataforma impulsada por inteligencia artificial.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/courses">
                <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 shadow-primary/20">
                  Explorar Cursos
                </Button>
              </Link>
              <Link href="/services">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2 hover:bg-secondary">
                  Nuestros Servicios
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/20 rounded-full blur-[100px]" />
      </section>

      {/* Metrics Overview */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {metrics.map((metric, idx) => (
              <div key={idx} className="text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mx-auto mb-2">
                  <metric.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="font-headline text-3xl font-bold text-primary">{metric.value}</div>
                <div className="text-muted-foreground font-medium">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies Grid */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-headline text-4xl font-bold text-primary">Casos de Éxito Detallados</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Historias reales de transformación y crecimiento con resultados medibles.
            </p>
          </div>
          
          <div className="space-y-16">
            {caseStudies.map((study, idx) => (
              <div key={study.id} className={`grid lg:grid-cols-2 gap-16 items-center ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Badge className="w-fit bg-primary/10 text-primary border-primary/20 font-semibold">
                      {study.category}
                    </Badge>
                    <h3 className="font-headline text-3xl font-bold text-primary leading-tight">
                      {study.title}
                    </h3>
                    <p className="text-muted-foreground font-medium">{study.client}</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-bold text-lg text-primary mb-2">El Desafío</h4>
                      <p className="text-muted-foreground">{study.challenge}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-lg text-primary mb-2">Nuestra Solución</h4>
                      <p className="text-muted-foreground">{study.solution}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-lg text-primary mb-4">Resultados Clave</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {study.results.map((result, resultIdx) => (
                          <div key={resultIdx} className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                            <div>
                              <div className="font-bold text-primary">{result.metric}</div>
                              <div className="text-sm text-muted-foreground">{result.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {study.tags.map((tag, tagIdx) => (
                        <Badge key={tagIdx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="relative aspect-video rounded-2xl overflow-hidden">
                    <Image 
                      src={study.image} 
                      alt={study.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                      priority
                    />
                  </div>

                  <Card className="rounded-lg">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Quote className="h-8 w-8 text-primary/20 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <p className="text-muted-foreground italic mb-4">
                            "{study.testimonial.quote}"
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-full overflow-hidden">
                              <Image 
                                src={study.testimonial.photo} 
                                alt={study.testimonial.author}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <div className="font-semibold text-primary">{study.testimonial.author}</div>
                              <div className="text-sm text-muted-foreground">{study.testimonial.role}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-6 text-center space-y-8">
          <Badge className="w-fit bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 font-semibold">
            <Target className="w-4 h-4 mr-2" />
            Tu Historia de Éxito
          </Badge>
          <h2 className="font-headline text-4xl font-bold">
            ¿Lista para escribir tu propio caso de éxito?
          </h2>
          <p className="text-xl max-w-2xl mx-auto opacity-90">
            Únete a miles de profesionales y organizaciones que ya están 
            transformando su futuro con nuestra plataforma.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/auth">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-semibold">
                <GraduationCap className="w-5 h-5 mr-2" />
                Comenzar Ahora
              </Button>
            </Link>
            <Link href="/services">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2 text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                <ArrowRight className="w-5 h-5 mr-2" />
                Explorar Soluciones
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
