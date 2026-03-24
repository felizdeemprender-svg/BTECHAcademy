import { NextResponse } from 'next/server';
import { getFirebaseServer } from '@/firebase/server';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    const { firestore } = getFirebaseServer();
    
    // Buscar tutores con suscripción pública y activa
    const q = query(
      collection(firestore, 'users'),
      where('subscription.isPublic', '==', true),
      where('subscription.status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(q);
    
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
