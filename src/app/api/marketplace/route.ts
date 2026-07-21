import { NextResponse } from 'next/server';
import { adminDb, hasAdminCredentials } from '@/firebase/admin';
import { getFirebaseServer } from '@/firebase/server';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export async function GET() {
  try {
    let coursesData: any[] = [];
    let salesPagesData: any[] = [];
    let mentorsData: any[] = [];
    let categoriesData: any[] = [];
    let levelsData: any[] = [];

    if (hasAdminCredentials()) {
      // 1. Producción / Con cuenta de servicio: Usar SDK de Admin
      const [coursesSnap, salesPagesSnap, mentorsSnap, categoriesSnap, levelsSnap] = await Promise.all([
        adminDb.collection('courses').where('isActive', '==', true).get(),
        adminDb.collection('salesPages').where('isActive', '==', true).get(),
        adminDb.collection('users').where('roles', 'array-contains', 'mentor').get(),
        adminDb.collection('categories').orderBy('name', 'asc').get(),
        adminDb.collection('levels').orderBy('order', 'asc').get()
      ]);

      coursesData = coursesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      salesPagesData = salesPagesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      mentorsData = mentorsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      categoriesData = categoriesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      levelsData = levelsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } else {
      // 2. Desarrollo Local sin cuenta de servicio: Fallback al SDK del Cliente en el Servidor
      console.warn('[Marketplace API] Usando Fallback de Client SDK por falta de credenciales de Admin en local.');
      const clientDb = getFirebaseServer().firestore;

      // Consultar colecciones públicas
      const [coursesSnap, salesPagesSnap, categoriesSnap, levelsSnap] = await Promise.all([
        getDocs(query(collection(clientDb, 'courses'), where('isActive', '==', true))),
        getDocs(query(collection(clientDb, 'salesPages'), where('isActive', '==', true))),
        getDocs(query(collection(clientDb, 'categories'), orderBy('name', 'asc'))),
        getDocs(query(collection(clientDb, 'levels'), orderBy('order', 'asc')))
      ]);

      coursesData = coursesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      salesPagesData = salesPagesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      categoriesData = categoriesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      levelsData = levelsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      // Consultar la colección protegida 'users' (mentores) con try/catch en caso de error de permisos
      try {
        const mentorsSnap = await getDocs(query(collection(clientDb, 'users'), where('isMentor', '==', true)));
        mentorsData = mentorsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      } catch (err) {
        console.warn('[Marketplace API] No se pudo leer la colección protegida "users" en local:', err);
        // Generaremos perfiles de tutor simulados en memoria basados en los mentorIds de los cursos
        const uniqueMentorIds = Array.from(new Set(coursesData.map(c => c.mentorId).filter(Boolean)));
        mentorsData = uniqueMentorIds.map(mId => ({
          id: mId,
          displayName: 'Tutor BTECH',
          email: 'tutor@FastoriaAcademy.ai',
          photoURL: '',
          roles: ['mentor'],
          subscription: { status: 'active' }
        }));
      }
    }

    // 2. Procesar colecciones
    const coursesMap = new Map();
    coursesData.forEach(course => {
      if (course.status === 'published' || course.status === 'approved') {
        coursesMap.set(course.id, course);
      }
    });

    const mentorsMap = new Map();
    mentorsData.forEach(mentor => {
      mentorsMap.set(mentor.id, mentor);
    });

    // 3. Enriquecer Marketplace basándonos en SalesPages (Fuente de Verdad comercial)
    const now = new Date();
    // Sort so general is processed first, then promocion can override it if valid
    const sortedSalesPages = [...salesPagesData].sort((a, b) => {
      const aType = a.landingType;
      const bType = b.landingType;
      if (aType === 'promocion' && bType !== 'promocion') return 1;
      if (bType === 'promocion' && aType !== 'promocion') return -1;
      return 0;
    });
    
    // We want ALL valid landings. Not one per course.
    const validSalesPages: any[] = [];
    
    sortedSalesPages.forEach(salesPage => {
      if (salesPage.referidoId) return; // Excluir influencers
      
      let isDateValid = true;
      if (salesPage.landingType === 'promocion') {
         const fromDate = salesPage.activeFrom?.toDate ? salesPage.activeFrom.toDate() : (salesPage.activeFrom?.seconds ? new Date(salesPage.activeFrom.seconds * 1000) : null);
         const untilDate = salesPage.activeUntil?.toDate ? salesPage.activeUntil.toDate() : (salesPage.activeUntil?.seconds ? new Date(salesPage.activeUntil.seconds * 1000) : null);
         
         if (fromDate && fromDate > now) isDateValid = false;
         if (untilDate && untilDate < now) isDateValid = false;
      }
      
      if (isDateValid && salesPage.courseId) {
         validSalesPages.push(salesPage);
      }
    });

    const marketplace = validSalesPages.map(salesPage => {
      const course = coursesMap.get(salesPage.courseId);
      if (!course) return null;

      const mentor = mentorsMap.get(salesPage.mentorId || course.mentorId) || {
        id: salesPage.mentorId || course.mentorId,
        displayName: 'Tutor BTECH',
        photoURL: '',
        subscription: { status: 'active' }
      };

      return {
        ...course,
        title: salesPage.title || course.title || 'Sin título',
        price: salesPage.price ?? course.price ?? 0,
        salesPageId: salesPage.id,
        salesPageSlug: salesPage.slug,
        tutor: {
          id: mentor.id,
          displayName: mentor.displayName || mentor.email?.split('@')[0] || 'Mentor',
          photo: mentor.photoURL || '',
          subscription: mentor.subscription || { status: 'active' }
        },
        pricing: {
          type: (salesPage.price ?? course.price) === 0 ? 'free' : 'paid',
          amount: salesPage.price ?? course.price ?? 0,
          currency: course.currency || 'USD'
        }
      };
    }).filter(item => item !== null);

    return NextResponse.json({
      marketplace,
      categories: categoriesData,
      levels: levelsData,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[MARKETPLACE_API_ERROR]:', error);
    return NextResponse.json({ error: 'Error al cargar el catálogo' }, { status: 500 });
  }
}
