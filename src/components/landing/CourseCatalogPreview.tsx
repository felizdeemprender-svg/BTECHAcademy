'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CourseCard } from '@/components/courses/course-card';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  thumbnail: string;
  rating: number;
  students: number;
  tutor: {
    displayName: string;
    photo: string;
  };
  pricing: {
    type: string;
    amount: number;
    currency: string;
  };
}

export default function CourseCatalogPreview() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await fetch('/api/marketplace');
        const data = await response.json();
        if (data.marketplace) {
          // Tomar solo los primeros 4 elementos para la vista previa
          setCourses(data.marketplace.slice(0, 4));
        }
      } catch (error) {
        console.warn('[Catalog Preview] Error cargando vista previa:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  if (loading) return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-80 bg-secondary/20 rounded-3xl" />
      ))}
    </div>
  );

  if (courses.length === 0) return null;

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="space-y-4">
            <Badge className="bg-primary/5 text-primary border-primary/10 px-4 py-1 rounded-full font-bold">Catálogo Académico</Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-primary tracking-tight">Formación <span className="text-accent underline decoration-accent/30">Estratégica</span></h2>
            <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
              Explora los programas más recientes creados por nuestros mentores certificados bajo el respaldo de Evolución Académica.
            </p>
          </div>
          <Link href="/courses">
            <Button variant="outline" className="h-12 px-6 rounded-xl font-bold border-2 hover:bg-secondary group">
              Ver Catálogo Completo <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {courses.map((course) => (
            <CourseCard 
              key={course.id} 
              course={course as any} 
              onAction={async () => {
                toast({ title: 'Explorar Curso', description: 'Redirigiendo a los detalles del curso...' });
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
