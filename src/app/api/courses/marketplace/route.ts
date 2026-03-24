import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseServer } from '@/firebase/server';
import { collection, query, where, getDocs, limit, documentId } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'Todos';
    const level = searchParams.get('level') || 'Todos';
    const priceFilter = searchParams.get('price') || 'all';
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limitPerPage = parseInt(searchParams.get('limit') || '12');

    const { firestore } = getFirebaseServer();

    let coursesQuery = query(
      collection(firestore, 'courses'),
      where('isActive', '==', true),
      where('status', '==', 'published'),
      where('publicListing', '==', true)
    );

    if (priceFilter === 'free') {
      coursesQuery = query(coursesQuery, where('price', '==', 0));
    } else if (priceFilter === 'paid') {
      coursesQuery = query(coursesQuery, where('price', '>', 0));
    }

    coursesQuery = query(coursesQuery, limit(limitPerPage));

    // 2. Obtener TODAS las salesPages activas para saber qué cursos mostrar
    const salesPagesSnapshot = await getDocs(
      query(collection(firestore, 'salesPages'), where('isActive', '==', true))
    );
    const activeCourseIds = new Set(salesPagesSnapshot.docs.map(doc => doc.data().courseId));
    const activeMentorIdsFromSales = new Set(salesPagesSnapshot.docs.map(doc => doc.data().mentorId));

    const coursesSnapshot = await getDocs(coursesQuery);
    
    const initialTutorIds = coursesSnapshot.docs.map(doc => doc.data().mentorId).filter(Boolean);
    const uniqueTutorIds = Array.from(new Set(initialTutorIds));
    
    let allowedTutorIds: string[] = [];
    if (uniqueTutorIds.length > 0) {
      const tutorsQuery = query(
        collection(firestore, 'users'),
        where(documentId(), 'in', uniqueTutorIds.slice(0, 30)), // Firestore limit
        where('subscription.status', '==', 'active')
      );
      const tutorsSnapshot = await getDocs(tutorsQuery);
      
      // Filtrar tutores que NO sean "Empresa" usando el nuevo flag isEnterprise
      allowedTutorIds = tutorsSnapshot.docs
        .filter(doc => {
          const sub = doc.data().subscription;
          // Si el plan tiene isEnterprise: true, lo excluimos del catálogo general
          return sub?.isEnterprise !== true;
        })
        .map(doc => doc.id);
    }

    const enrichedCourses = await Promise.all(
      coursesSnapshot.docs
        .filter(doc => {
          const courseData = doc.data();
          const hasActiveSalesPage = activeCourseIds.has(doc.id);
          const isAllowedTutor = !courseData.mentorId || allowedTutorIds.includes(courseData.mentorId);
          return hasActiveSalesPage && isAllowedTutor;
        })
        .map(async (courseDoc) => {
          const course = courseDoc.data();
          
          let tutorData = null;
          if (course.mentorId) {
            const tutorDocSnap = await getDocs(
              query(
                collection(firestore, 'users'),
                where(documentId(), '==', course.mentorId),
                limit(1)
              )
            );
            
            if (!tutorDocSnap.empty) {
              const tutor = tutorDocSnap.docs[0].data();
              tutorData = {
                id: course.mentorId,
                username: tutor.username || tutor.displayName?.toLowerCase().replace(/\s+/g, '-'),
                displayName: tutor.displayName || tutor.email?.split('@')[0],
                photo: tutor.photoURL || `https://loremflickr.com/60/60/person,professional?lock=${course.mentorId}`,
                subscription: tutor.subscription || { status: 'inactive', plan: 'free' },
                publicProfile: tutor.publicProfile || { enabled: true, showStats: true, showContact: false }
              };
            }
          }

          let tags: string[] = [];
          if (course.tagIds && course.tagIds.length > 0) {
            const tagsQuery = query(
              collection(firestore, 'tags'),
              where(documentId(), 'in', course.tagIds)
            );
            const tagsSnapshot = await getDocs(tagsQuery);
            tags = tagsSnapshot.docs.map(tagDoc => tagDoc.data().name);
          }

          return {
            id: courseDoc.id,
            slug: course.slug || course.title?.toLowerCase().replace(/\s+/g, '-'),
            title: course.title || 'Sin título',
            description: course.description || 'Sin descripción',
            price: course.price || 0,
            currency: course.currency || 'USD',
            duration: course.duration || 0,
            level: course.level || 'beginner',
            tags,
            thumbnail: course.thumbnail || `https://loremflickr.com/600/400/education,course?lock=${courseDoc.id}`,
            rating: course.rating || 4.5,
            students: course.studentsCount || 0,
            tutor: tutorData,
            createdAt: course.createdAt?.toDate?.() || new Date(),
            pricing: {
              type: course.price === 0 ? 'free' : 'paid',
              amount: course.price || 0,
              currency: course.currency || 'USD'
            }
          };
        })
    );

    let finalCourses = enrichedCourses.filter(course => course !== null) as NonNullable<typeof enrichedCourses[0]>[];

    if (category !== 'Todos') {
      finalCourses = finalCourses.filter(course =>
        course.tags.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
      );
    }

    if (level !== 'Todos') {
      finalCourses = finalCourses.filter(course => course.level === level.toLowerCase());
    }

    if (search) {
      finalCourses = finalCourses.filter(course =>
        course.title.toLowerCase().includes(search.toLowerCase()) ||
        course.description.toLowerCase().includes(search.toLowerCase()) ||
        course.tutor?.displayName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    switch (sortBy) {
      case 'newest':
        finalCourses.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        break;
      case 'rating':
        finalCourses.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'price_low':
        finalCourses.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_high':
        finalCourses.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'students':
        finalCourses.sort((a, b) => (b.students || 0) - (a.students || 0));
        break;
      default:
        finalCourses.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    }

    return NextResponse.json({
      courses: finalCourses,
      pagination: {
        page,
        limit: limitPerPage,
        total: finalCourses.length,
        hasMore: finalCourses.length === limitPerPage
      }
    });

  } catch (error) {
    console.error('Error fetching marketplace courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}


