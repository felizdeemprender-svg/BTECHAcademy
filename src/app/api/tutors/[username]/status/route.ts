import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseServer } from '@/firebase/server';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { 
  SubscriptionStatus, 
} from '@/types/subscription';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { firestore } = getFirebaseServer();
    const username = (await params).username;
    
    // Buscar tutor por username usando Web SDK
    const tutorsQuery = query(
      collection(firestore, 'users'),
      where('username', '==', username),
      limit(1)
    );

    const tutorsSnapshot = await getDocs(tutorsQuery);

    if (tutorsSnapshot.empty) {
      return NextResponse.json(
        { 
          error: 'Tutor not found',
          available: false,
          reason: 'not_found'
        },
        { status: 404 }
      );
    }

    const tutorDoc = tutorsSnapshot.docs[0];
    const tutor = tutorDoc.data();

    // Verificar si la suscripción está activa (admins omiten esto para su propio perfil)
    const isAdmin = tutor.roles?.includes('admin');
    if (!isAdmin && tutor.subscription?.status !== SubscriptionStatus.ACTIVE) {
      return NextResponse.json(
        { 
          error: 'Tutor subscription is not active',
          available: false,
          reason: 'subscription_inactive'
        },
        { status: 403 }
      );
    }

    // Verificar si el perfil público está habilitado (por defecto true si no existe)
    if (tutor.profile?.publicProfile?.enabled === false) {
      return NextResponse.json(
        { 
          error: 'Tutor profile is not public',
          available: false,
          reason: 'profile_private'
        },
        { status: 403 }
      );
    }

    // Contar cursos del tutor usando Web SDK
    let coursesCount = 0;
    try {
      const coursesQuery = query(
        collection(firestore, 'courses'),
        where('mentorId', '==', tutorDoc.id),
        where('isActive', '==', true)
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      coursesCount = coursesSnapshot.docs.filter(doc => {
        const c = doc.data();
        return (c.status === 'published' || c.status === 'approved') && c.publicListing !== false;
      }).length;
    } catch {
      // Course count is non-critical; fallback to 0
    }

    return NextResponse.json({
      available: true,
      tutor: {
        id: tutorDoc.id,
        username: tutor.username,
        displayName: tutor.displayName || tutor.email?.split('@')[0],
        photo: tutor.photoURL || `https://loremflickr.com/200/200/person,professional?lock=${tutorDoc.id}`,
        bio: tutor.profile?.bio || '',
        expertise: tutor.expertise || [],
        location: tutor.location || '',
        email: tutor.email || '',
        socialLinks: {
          website: tutor.profile?.socials?.website || '',
          linkedin: tutor.profile?.socials?.linkedin || '',
          twitter: tutor.profile?.socials?.twitter || '',
          instagram: tutor.profile?.socials?.instagram || '',
          youtube: tutor.profile?.socials?.youtube || '',
          tiktok: tutor.profile?.socials?.tiktok || '',
        },
        stats: {
          totalStudents: tutor.stats?.totalStudents || 0,
          totalCourses: coursesCount,
          avgRating: tutor.stats?.avgRating || 4.5,
          totalHours: tutor.stats?.totalHours || 0
        },
        subscription: tutor.subscription || { status: 'active', plan: 'free' },
        publicProfile: (tutor.profile as any)?.publicProfile || {
          enabled: true,
          showStats: true,
          showContact: true,
          allowPublicCourses: true
        },
        branding: {
          primaryColor: tutor.profile?.branding?.primaryColor || '#3B2D86',
          logoUrl: tutor.profile?.branding?.logoUrl || '',
          layoutMode: tutor.profile?.branding?.layoutMode || 'light'
        }
      }
    });

  } catch (error: any) {
    console.error('Error checking tutor status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check tutor status',
        details: error?.message || 'Unknown error',
        available: false,
        reason: 'server_error'
      },
      { status: 500 }
    );
  }
}
