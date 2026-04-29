import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

export async function GET() {
  try {
    const firestore = getAdminFirestore();
    
    // Buscar tutores con suscripción pública y activa
    const querySnapshot = await firestore.collection('users')
      .where('subscription.isPublic', '==', true)
      .where('subscription.status', 'in', ['active', 'ACTIVE'])
      .limit(8)
      .get();
    
    const featuredTutors = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        tutorName: data.displayName || data.email?.split('@')[0],
        ...data.subscription
      };
    });
    
    return NextResponse.json({ subscriptions: featuredTutors });
    
  } catch (error) {
    console.error('Error fetching featured tutors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured subscriptions' },
      { status: 500 }
    );
  }
}
