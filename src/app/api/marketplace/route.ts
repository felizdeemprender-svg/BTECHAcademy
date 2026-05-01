import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';

export async function GET() {
  try {
    // 1. Obtener datos básicos en paralelo para velocidad
    const [coursesSnap, salesPagesSnap, mentorsSnap, categoriesSnap, levelsSnap] = await Promise.all([
      adminDb.collection('courses').where('isActive', '==', true).get(),
      adminDb.collection('salesPages').where('isActive', '==', true).get(),
      adminDb.collection('users').where('roles', 'array-contains', 'mentor').get(),
      adminDb.collection('categories').orderBy('name', 'asc').get(),
      adminDb.collection('levels').orderBy('order', 'asc').get()
    ]);

    // 2. Procesar colecciones
    const coursesMap = new Map();
    coursesSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'published' || data.status === 'approved') {
        coursesMap.set(doc.id, { ...data, id: doc.id });
      }
    });

    const mentorsMap = new Map();
    mentorsSnap.docs.forEach(doc => {
      mentorsMap.set(doc.id, { ...doc.data(), id: doc.id });
    });

    const categories = categoriesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    const levels = levelsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

    // 3. Enriquecer Marketplace basándonos en SalesPages (Fuente de Verdad comercial)
    const marketplace = salesPagesSnap.docs.map(doc => {
      const salesPage = { ...doc.data(), id: doc.id };
      const course = coursesMap.get(salesPage.courseId);
      
      if (!course) return null;

      const mentor = mentorsMap.get(salesPage.mentorId || course.mentorId) || {
        displayName: 'Tutor BTECH',
        roles: ['mentor']
      };

      return {
        ...course,
        salesPageId: salesPage.id,
        salesPageSlug: salesPage.slug,
        tutor: {
          id: mentor.id || salesPage.mentorId,
          displayName: mentor.displayName,
          photo: mentor.photoURL || '',
          subscription: mentor.subscription || { status: 'active' }
        },
        pricing: salesPage.pricing || course.pricing || { type: 'free', amount: 0, currency: 'USD' }
      };
    }).filter(item => item !== null);

    return NextResponse.json({
      marketplace,
      categories,
      levels,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[MARKETPLACE_API_ERROR]:', error);
    return NextResponse.json({ error: 'Error al cargar el catálogo' }, { status: 500 });
  }
}
