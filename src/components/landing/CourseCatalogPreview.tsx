'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CourseCard } from '@/components/courses/course-card';
import { BookOpen, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
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
  const db = useFirestore();
  
  // 1. Fetch Collections
  const coursesQuery = useMemoFirebase(() => {
    return query(
      collection(db, 'courses'),
      where('isActive', '==', true),
      where('status', '==', 'published'),
      where('publicListing', '==', true)
    );
  }, [db]);
  const { data: rawCourses = [], isLoading: coursesLoading } = useCollection(coursesQuery);

  const salesPagesQuery = useMemoFirebase(() => {
    return query(collection(db, 'salesPages'), where('isActive', '==', true));
  }, [db]);
  const { data: salesPages = [], isLoading: salesLoading } = useCollection(salesPagesQuery);

  const mentorsQuery = useMemoFirebase(() => {
    return query(collection(db, 'users'), where('isMentor', '==', true));
  }, [db]);
  const { data: mentors = [], isLoading: mentorsLoading } = useCollection(mentorsQuery);

  // 2. Compute Enriched Courses
  const courses = useMemo(() => {
    if (coursesLoading || salesLoading || mentorsLoading) return [];

    const salesMap = new Map();
    (salesPages || []).forEach(sp => {
      if (sp.courseId) salesMap.set(sp.courseId, sp.id);
    });

    const mentorMap = new Map();
    (mentors || []).forEach(m => mentorMap.set(m.id, m));

    return (rawCourses || [])
      .filter(course => {
        if (!salesMap.has(course.id)) return false;
        const mentor = mentorMap.get(course.mentorId);
        return mentor && mentor.subscription?.status === 'active' && mentor.subscription?.isEnterprise !== true;
      })
      .slice(0, 4) // Show only 4 for preview
      .map(course => {
        const mentor = mentorMap.get(course.mentorId);
        
        return {
          id: course.id,
          slug: course.slug || course.title?.toLowerCase().replace(/\s+/g, '-'),
          title: course.title || 'Sin título',
          description: course.description || 'Sin descripción',
          price: course.price || 0,
          currency: course.currency || 'USD',
          thumbnail: course.thumbnail || `https://loremflickr.com/600/400/education,course?lock=${course.id}`,
          rating: course.rating || 4.5,
          students: course.studentsCount || 0,
          duration: course.duration || 0,
          tags: course.tagIds || [], // Simplifed tags for preview
          salesPageId: salesMap.get(course.id),
          tutor: {
            id: course.mentorId,
            username: mentor.username || mentor.displayName?.toLowerCase().replace(/\s+/g, '-'),
            displayName: mentor.displayName || mentor.email?.split('@')[0],
            photo: mentor.photoURL || `https://loremflickr.com/60/60/person,professional?lock=${course.mentorId}`,
            subscription: {
              status: mentor.subscription?.status || 'active'
            }
          },
          pricing: {
            type: course.price === 0 ? 'free' : 'paid',
            amount: course.price || 0,
            currency: course.currency || 'USD'
          }
        };
      }) as unknown as Course[];
  }, [rawCourses, salesPages, mentors, coursesLoading, salesLoading, mentorsLoading]);

  const loading = coursesLoading || salesLoading || mentorsLoading;

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
