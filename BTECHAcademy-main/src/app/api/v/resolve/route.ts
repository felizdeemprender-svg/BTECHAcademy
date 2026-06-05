import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const firestore = getAdminFirestore();
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('u');
    const slug = searchParams.get('s');

    if (!username || !slug) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Encontrar al mentor por username
    const tutorsSnapshot = await firestore.collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();

    if (tutorsSnapshot.empty) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    const mentorId = tutorsSnapshot.docs[0].id;

    // 2. Encontrar la landing por mentorId y slug
    const salesSnapshot = await firestore.collection('salesPages')
      .where('mentorId', '==', mentorId)
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (salesSnapshot.empty) {
      // Fallback: Buscar solo por slug si no se encuentra con el mentor
      const fallbackSnapshot = await firestore.collection('salesPages')
        .where('slug', '==', slug)
        .limit(1)
        .get();
      
      if (fallbackSnapshot.empty) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      }
      return NextResponse.json({ id: fallbackSnapshot.docs[0].id });
    }

    return NextResponse.json({ id: salesSnapshot.docs[0].id });

  } catch (error: any) {
    console.error('[API Resolve] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
