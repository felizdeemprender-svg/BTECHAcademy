import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseServer } from '@/firebase/server';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { SubscriptionStatus, getDefaultSubscription } from '@/types/subscription';

export async function GET() {
  try {
    const { firestore } = getFirebaseServer();
    
    // Obtener todos los usuarios con rol de tutor
    const tutorsQuery = query(
      collection(firestore, 'users'),
      where('role', '==', 'tutor'),
      orderBy('displayName', 'asc')
    );
    
    const tutorsSnapshot = await getDocs(tutorsQuery);
    
    const tutors = tutorsSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Determinar el estado real de la suscripción
      let subscriptionStatus = SubscriptionStatus.NONE;
      let hasRealSubscription = false;
      
      if (data.subscription) {
        subscriptionStatus = data.subscription.status || SubscriptionStatus.NONE;
        hasRealSubscription = subscriptionStatus !== SubscriptionStatus.NONE;
      }
      
      // Solo dar configuración por defecto si realmente no tiene suscripción
      const defaultSubscription = hasRealSubscription ? null : getDefaultSubscription();
      
      return {
        id: doc.id,
        displayName: data.displayName || data.email?.split('@')[0] || 'Sin nombre',
        email: data.email || '',
        username: data.username || '',
        photoURL: data.photoURL || '',
        subscription: data.subscription || defaultSubscription,
        hasRealSubscription,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        lastLogin: data.lastLogin?.toDate?.() || null
      };
    });
    
    const activeTutors = tutors.filter(t => t.subscription?.status === SubscriptionStatus.ACTIVE);
    const withCustomPage = tutors.filter(t => t.subscription?.hasCustomPage);
    const withRealSubscription = tutors.filter(t => t.hasRealSubscription);
    
    return NextResponse.json({ 
      tutors,
      total: tutors.length,
      active: activeTutors.length,
      withCustomPage: withCustomPage.length,
      withRealSubscription: withRealSubscription.length,
      none: tutors.filter(t => t.subscription?.status === SubscriptionStatus.NONE).length,
      trial: tutors.filter(t => t.subscription?.status === SubscriptionStatus.TRIAL).length,
      inactive: tutors.filter(t => t.subscription?.status === SubscriptionStatus.INACTIVE).length
    });
    
  } catch (error) {
    console.error('Error fetching tutors subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutors subscriptions' },
      { status: 500 }
    );
  }
}

