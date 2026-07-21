'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, Sparkles, Users, Target, Award, Globe, Heart, Lightbulb, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

export default function AboutPage() {
  const team = [
    {
      name: 'FastoriaAcademy',
      role: 'Fundador Institucional',
      bio: 'Visionario en educación tecnológica con 15+ años de experiencia en transformación digital.',
      photo: 'https://loremflickr.com/200/200/person,professional?lock=founder',
      expertise: ['EdTech', 'IA', 'Negocios']
    },
    {
      name: 'María González',
      role: 'Directora de Contenido',
      bio: 'Experta en diseño instruccional y experiencia de usuario en plataformas de aprendizaje.',
      photo: 'https://loremflickr.com/200/200/person,professional?lock=maria',
      expertise: ['Diseño Instruccional', 'UX', 'Contenido Digital']
    },
    {
      name: 'Carlos Rodríguez',
      role: 'CTO',
      bio: 'Especialista en arquitectura de sistemas escalables e integración de IA en productos educativos.',
      photo: 'https://loremflickr.com/200/200/person,professional?lock=carlos',
      expertise: ['Cloud', 'IA', 'Arquitectura']
    }
  ];

  const values = [
    {
      icon: Lightbulb,
      title: 'Innovación',
      description: 'Impulsamos la educación del futuro con tecnología de vanguardia y enfoques pedagógicos modernos.'
    },
    {
      icon: Heart,
      title: 'Pasión',
      description: 'Amamos lo que hacemos y nos apasiona transformar vidas a través del conocimiento.'
    },
    {
      icon: ShieldCheck,
      title: 'Calidad',
      description: 'Mantenemos los más altos estándares de excelencia en cada aspecto de nuestra plataforma.'
    },
    {
      icon: Users,
      title: 'Comunidad',
      description: 'Construimos una red de aprendizaje colaborativa donde todos crecen juntos.'
    }
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
              <Sparkles className="w-4 h-4 mr-2" />
              Conoce Nuestra Historia
            </div>
            <h1 className="font-headline text-5xl lg:text-7xl font-bold leading-tight text-primary">
              Estamos <span className="text-accent">revolucionando</span> la educación
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              En FastoriaAcademy, creemos que el conocimiento es el motor del progreso. 
              Combinamos la experiencia humana con el poder de la inteligencia artificial para 
              crear experiencias de aprendizaje transformadoras.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/services">
                <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
                  Nuestros Servicios
                </Button>
              </Link>
              <Link href="/courses">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2 hover:bg-secondary">
                  Explorar Cursos
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/20 rounded-full blur-[100px]" />
      </section>

      {/* Mission & Vision */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <Badge className="w-fit bg-primary/10 text-primary border-primary/20 font-semibold">
                <Target className="w-4 h-4 mr-2" />
                Misión
              </Badge>
              <h2 className="font-headline text-4xl font-bold text-primary">
                Democratizar el conocimiento de calidad
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Nuestra misión es hacer accesible la educación de excelencia a través de tecnología 
                innovadora. Empoderamos a mentores para que compartan su conocimiento y a estudiantes 
                para que alcancen su máximo potencial, sin importar su ubicación o contexto económico.
              </p>
            </div>
            <div className="relative aspect-square max-w-[500px] mx-auto">
              <div className="absolute inset-0 bg-accent/10 blur-[100px] rounded-full" />
              <div className="relative h-full w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <Image 
                  src="https://loremflickr.com/600/600/education,team?lock=mission" 
                  alt="Nuestra Misión"
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

      {/* Vision */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative aspect-square max-w-[500px] mx-auto">
              <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full" />
              <div className="relative h-full w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <Image 
                  src="https://loremflickr.com/600/600/education,vision?lock=vision" 
                  alt="Nuestra Visión"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <Badge className="w-fit bg-accent/10 text-accent border-accent/20 font-semibold">
                <Globe className="w-4 h-4 mr-2" />
                Visión
              </Badge>
              <h2 className="font-headline text-4xl font-bold text-primary">
                Ser la plataforma líder de educación exclusiva
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Visualizamos un futuro donde cada mentor pueda monetizar su conocimiento y 
                cada estudiante tenga acceso a formación personalizada de alta calidad. 
                Aspiramos a ser el ecosistema preferido para aprendizaje profesional en 
                Latinoamérica y más allá.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-headline text-4xl font-bold text-primary">Nuestros Valores</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Los principios que guian cada decisión que tomamos y cada producto que creamos.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, idx) => (
              <Card key={idx} className="border-none shadow-lg hover:shadow-xl transition-shadow group">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <value.icon className="h-8 w-8 text-primary group-hover:text-primary-foreground" />
                  </div>
                  <h3 className="font-headline font-bold text-xl text-primary">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-headline text-4xl font-bold text-primary">Nuestro Equipo</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Apasionados profesionales transformando la educación con tecnología.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member, idx) => (
              <Card key={idx} className="border-none shadow-lg hover:shadow-xl transition-all group">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="relative w-32 h-32 mx-auto">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-accent/20 transition-colors" />
                    <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg">
                      <Image 
                        src={member.photo} 
                        alt={member.name}
                        fill
                        sizes="128px"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-xl text-primary mb-1">{member.name}</h3>
                    <p className="text-accent font-semibold mb-3">{member.role}</p>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">{member.bio}</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {member.expertise.map((skill, skillIdx) => (
                        <Badge key={skillIdx} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto px-6 text-center space-y-8">
          <Badge className="w-fit bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 font-semibold">
            <Award className="w-4 h-4 mr-2" />
            Únete a la Revolución
          </Badge>
          <h2 className="font-headline text-4xl font-bold">
            ¿Listo para transformar el futuro de la educación?
          </h2>
          <p className="text-xl max-w-2xl mx-auto opacity-90">
            Ya seas mentor buscando compartir tu conocimiento o estudiante buscando 
            formación de excelencia, tenemos el lugar perfecto para ti.
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
                Conocer Más
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
