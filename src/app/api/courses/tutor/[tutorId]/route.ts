import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseServer } from '@/firebase/server';
import { collection, query, where, orderBy, getDocs, limit, documentId } from 'firebase/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tutorId: string }> }
) {
  try {
    const { firestore } = getFirebaseServer();
    const tutorId = (await params).tutorId;

    // Obtener TODOS los cursos del tutor (filtramos visibilidad en memoria)
    const coursesQuery = query(
      collection(firestore, 'courses'),
      where('mentorId', '==', tutorId),
      limit(50)
    );

    const coursesSnapshot = await getDocs(coursesQuery);
    
    // Obtener SalesPages asociadas a este tutor para vincularlas con los cursos
    const salesPagesQuery = query(
      collection(firestore, 'salesPages'),
      where('mentorId', '==', tutorId)
    );
    const salesPagesSnapshot = await getDocs(salesPagesQuery);
    const salesPagesMap: Record<string, { id: string, price?: number }> = {};
    salesPagesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.courseId && data.isActive) { // Filter isActive here
        salesPagesMap[data.courseId] = { 
          id: doc.id, 
          price: data.price 
        };
      }
    });

    // Filtrar por visibilidad: mostrar cursos que tengan landing y no estén rechazados.
    // isActive=false puede indicar que no pasó por auditoría aún, pero si tiene landing activa debe mostrarse.
    const validCourses = coursesSnapshot.docs.filter(doc => {
      const c = doc.data();
      const hasLanding = !!salesPagesMap[doc.id];
      const isNotRejected = c.status !== 'rejected';
      const isExplicitlyHidden = c.isActive === false && !salesPagesMap[doc.id];
      const isPublic = c.publicListing !== false;
      return hasLanding && isNotRejected && !isExplicitlyHidden && isPublic;
    }).sort((a, b) => {
      const dateA = a.data().createdAt?.toDate?.() || new Date(0);
      const dateB = b.data().createdAt?.toDate?.() || new Date(0);
      return (dateB as any) - (dateA as any);
    });

    // Enriquecer cursos con tags
    const enrichedCourses = await Promise.all(
      validCourses.map(async (courseDoc) => {
        const course = courseDoc.data();
        
        // Obtener tags del curso usando Web SDK
        let tags = [];
        if (course.tagIds && course.tagIds.length > 0) {
          const tagsQuery = query(
            collection(firestore, 'tags'),
            where(documentId(), 'in', course.tagIds)
          );
          const tagsSnapshot = await getDocs(tagsQuery);
          tags = tagsSnapshot.docs.map(tagDoc => tagDoc.data().name);
        }

        const salesPage = salesPagesMap[courseDoc.id] || null;

        return {
          id: courseDoc.id,
          salesPageId: salesPage?.id || null,
          slug: course.slug || course.title?.toLowerCase().replace(/\s+/g, '-'),
          title: course.title || 'Sin título',
          description: course.description || 'Sin descripción',
          price: salesPage?.price !== undefined ? salesPage.price : (course.price || 0),
          duration: course.duration || 0,
          level: course.level || 'beginner',
          students: course.studentsCount || 0,
          rating: course.rating || 4.5,
          thumbnail: course.thumbnail || `https://loremflickr.com/600/400/education,course?lock=${courseDoc.id}`,
          tags,
          createdAt: course.createdAt?.toDate?.() || new Date()
        };
      })
    );

    return NextResponse.json({
      courses: enrichedCourses,
      total: enrichedCourses.length
    });

  } catch (error) {
    console.error('Error fetching tutor courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutor courses' },
      { status: 500 }
    );
  }
}
