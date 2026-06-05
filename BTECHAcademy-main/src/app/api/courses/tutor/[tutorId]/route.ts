import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, hasAdminCredentials } from '@/firebase/admin';
import { getFirebaseServer } from '@/firebase/server';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tutorId: string }> }
) {
  try {
    const tutorId = (await params).tutorId;

    let salesPagesData: any[] = [];
    let coursesMap: Record<string, any> = {};
    let tagsMap: Record<string, string> = {};

    if (hasAdminCredentials()) {
      // Producción: Admin SDK
      const firestore = getAdminFirestore();

      const salesPagesSnapshot = await firestore.collection('salesPages')
        .where('mentorId', '==', tutorId)
        .where('isActive', '==', true)
        .get();

      if (salesPagesSnapshot.empty) {
        return NextResponse.json({ courses: [], total: 0 });
      }

      salesPagesData = salesPagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const courseIds = Array.from(new Set(salesPagesData.map(sp => sp.courseId).filter(Boolean)));
      if (courseIds.length > 0) {
        const coursesSnapshot = await firestore.collection('courses')
          .where('__name__', 'in', courseIds.slice(0, 30))
          .get();
        coursesSnapshot.docs.forEach(doc => { coursesMap[doc.id] = { id: doc.id, ...doc.data() }; });
      }

      const allTagIds = Array.from(new Set(Object.values(coursesMap).flatMap((c: any) => c.tagIds || [])));
      if (allTagIds.length > 0) {
        const tagsSnapshot = await firestore.collection('tags')
          .where('__name__', 'in', allTagIds.slice(0, 30))
          .get();
        tagsSnapshot.docs.forEach(doc => { tagsMap[doc.id] = doc.data().name; });
      }

    } else {
      // Desarrollo local: Client SDK (salesPages y courses son colecciones públicas)
      console.warn('[Tutor Courses API] Usando Client SDK fallback en local para tutor:', tutorId);
      const clientDb = getFirebaseServer().firestore;

      const salesSnap = await getDocs(
        query(collection(clientDb, 'salesPages'),
          where('mentorId', '==', tutorId),
          where('isActive', '==', true))
      );

      if (salesSnap.empty) {
        return NextResponse.json({ courses: [], total: 0 });
      }

      salesPagesData = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const courseIds = Array.from(new Set(salesPagesData.map(sp => sp.courseId).filter(Boolean)));
      if (courseIds.length > 0) {
        const coursesSnap = await getDocs(query(collection(clientDb, 'courses'), where('isActive', '==', true)));
        coursesSnap.docs
          .filter(doc => courseIds.includes(doc.id))
          .forEach(doc => { coursesMap[doc.id] = { id: doc.id, ...doc.data() }; });
      }
      // Tags omitidos en local por simplicidad (no son críticos)
    }

    // Construir respuesta basada en landings
    const enrichedLandings = salesPagesData.map(spData => {
      const course = coursesMap[spData.courseId];
      if (!course) return null;

      const isPublished = course.status === 'published' || course.status === 'approved';
      const isPublic = course.publicListing !== false;
      if (!isPublished || !isPublic) return null;

      const tags = (course.tagIds || []).map((id: string) => tagsMap[id]).filter(Boolean);

      return {
        id: course.id || spData.courseId,
        salesPageId: spData.id,
        slug: spData.slug || course.slug || course.title?.toLowerCase().replace(/\s+/g, '-'),
        title: spData.title || course.title || 'Sin título',
        description: spData.description || course.description || 'Sin descripción',
        price: spData.price !== undefined ? spData.price : (course.price || 0),
        duration: course.duration || 0,
        level: course.level || 'beginner',
        students: course.studentsCount || 0,
        rating: course.rating || 4.5,
        thumbnail: spData.thumbnail || course.thumbnail || `https://loremflickr.com/600/400/education,course?lock=${spData.id}`,
        tags,
        createdAt: spData.createdAt?.toDate?.() || course.createdAt?.toDate?.() || new Date()
      };
    }).filter(Boolean).sort((a: any, b: any) => b.createdAt - a.createdAt);

    return NextResponse.json({ courses: enrichedLandings, total: enrichedLandings.length });

  } catch (error: any) {
    console.error('Error fetching tutor landings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutor landings', details: error.message },
      { status: 500 }
    );
  }
}
