import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tutorId: string }> }
) {
  try {
    const firestore = getAdminFirestore();
    const tutorId = (await params).tutorId;

    // 1. Obtener todas las SalesPages ACTIVAS del tutor
    const salesPagesSnapshot = await firestore.collection('salesPages')
      .where('mentorId', '==', tutorId)
      .where('isActive', '==', true)
      .get();

    if (salesPagesSnapshot.empty) {
      return NextResponse.json({ courses: [], total: 0 });
    }

    // 2. Obtener IDs de cursos únicos para buscarlos de una vez
    const courseIds = Array.from(new Set(salesPagesSnapshot.docs.map(doc => doc.data().courseId).filter(Boolean)));
    
    const coursesMap: Record<string, any> = {};
    if (courseIds.length > 0) {
      // Firebase limita 'in' a 10-30 elementos, pero para un tutor suele estar bien.
      // Si son muchos, haríamos múltiples consultas.
      const coursesSnapshot = await firestore.collection('courses')
        .where('__name__', 'in', courseIds.slice(0, 30))
        .get();
      
      coursesSnapshot.docs.forEach(doc => {
        coursesMap[doc.id] = { id: doc.id, ...doc.data() };
      });
    }

    // 3. Obtener todos los tags necesarios
    const allTagIds = Array.from(new Set(
      Object.values(coursesMap).flatMap(c => c.tagIds || [])
    ));
    const tagsMap: Record<string, string> = {};
    if (allTagIds.length > 0) {
      const tagsSnapshot = await firestore.collection('tags')
        .where('__name__', 'in', allTagIds.slice(0, 30))
        .get();
      tagsSnapshot.docs.forEach(doc => {
        tagsMap[doc.id] = doc.data().name;
      });
    }

    // 4. Construir la respuesta basada en LANDINGS (SalesPages)
    const enrichedLandings = salesPagesSnapshot.docs.map(spDoc => {
      const spData = spDoc.data();
      const course = coursesMap[spData.courseId];
      
      // Si el curso no existe o no se cargó, no mostramos la landing
      if (!course) return null;

      // Filtrar visibilidad del curso: solo publicados o aprobados
      const isPublished = course.status === 'published' || course.status === 'approved';
      const isPublic = course.publicListing !== false;
      
      if (!isPublished || !isPublic) return null;

      const tags = (course.tagIds || []).map((id: string) => tagsMap[id]).filter(Boolean);

      return {
        id: course.id || spData.courseId,
        salesPageId: spDoc.id,
        slug: spData.slug || course.slug || course.title?.toLowerCase().replace(/\s+/g, '-'),
        title: spData.title || course.title || 'Sin título',
        description: spData.description || course.description || 'Sin descripción',
        price: spData.price !== undefined ? spData.price : (course.price || 0),
        duration: course.duration || 0,
        level: course.level || 'beginner',
        students: course.studentsCount || 0,
        rating: course.rating || 4.5,
        thumbnail: spData.thumbnail || course.thumbnail || `https://loremflickr.com/600/400/education,course?lock=${spDoc.id}`,
        tags,
        createdAt: spData.createdAt?.toDate?.() || course.createdAt?.toDate?.() || new Date()
      };
    }).filter(Boolean).sort((a: any, b: any) => b.createdAt - a.createdAt);

    return NextResponse.json({
      courses: enrichedLandings,
      total: enrichedLandings.length
    });

  } catch (error: any) {
    console.error('Error fetching tutor landings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutor landings', details: error.message },
      { status: 500 }
    );
  }
}
