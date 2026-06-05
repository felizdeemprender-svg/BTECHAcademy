import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, hasAdminCredentials } from '@/firebase/admin';
import { getFirebaseServer } from '@/firebase/server';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { SubscriptionStatus } from '@/types/subscription';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const username = (await params).username;

    let tutorId: string | null = null;
    let tutor: any = null;

    if (hasAdminCredentials()) {
      // Producción / Con service-account: Admin SDK
      const firestore = getAdminFirestore();
      const tutorsSnapshot = await firestore.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();

      if (tutorsSnapshot.empty) {
        return NextResponse.json({ error: 'Tutor not found', available: false, reason: 'not_found' }, { status: 404 });
      }

      const tutorDoc = tutorsSnapshot.docs[0];
      tutorId = tutorDoc.id;
      tutor = tutorDoc.data();

      // Verificar suscripción activa
      const isAdmin = tutor.roles?.includes('admin');
      if (!isAdmin && tutor.subscription?.status !== SubscriptionStatus.ACTIVE && tutor.subscription?.status !== 'active') {
        return NextResponse.json({ error: 'Tutor subscription is not active', available: false, reason: 'subscription_inactive' }, { status: 403 });
      }

      if (tutor.profile?.publicProfile?.enabled === false) {
        return NextResponse.json({ error: 'Tutor profile is not public', available: false, reason: 'profile_private' }, { status: 403 });
      }

      // Contar cursos
      let coursesCount = 0;
      try {
        const coursesSnapshot = await firestore.collection('courses')
          .where('mentorId', '==', tutorId)
          .where('isActive', '==', true)
          .get();
        coursesCount = coursesSnapshot.docs.filter(doc => {
          const c = doc.data();
          return (c.status === 'published' || c.status === 'approved') && c.publicListing !== false;
        }).length;
      } catch { /* no-critical */ }

      return NextResponse.json({
        available: true,
        tutor: buildTutorResponse(tutorId, tutor, coursesCount)
      });

    } else {
      // Desarrollo local sin service-account: Fallback a Client SDK
      console.warn('[Tutor Status API] Usando Client SDK fallback en local para buscar tutor:', username);
      const clientDb = getFirebaseServer().firestore;

      try {
        const tutorsSnap = await getDocs(
          query(collection(clientDb, 'users'), where('username', '==', username), limit(1))
        );

        if (tutorsSnap.empty) {
          return NextResponse.json({ error: 'Tutor not found', available: false, reason: 'not_found' }, { status: 404 });
        }

        const tutorDoc = tutorsSnap.docs[0];
        tutorId = tutorDoc.id;
        tutor = tutorDoc.data();

        // En local omitimos chequeo de suscripción para facilitar desarrollo
        if (tutor.profile?.publicProfile?.enabled === false) {
          return NextResponse.json({ error: 'Tutor profile is not public', available: false, reason: 'profile_private' }, { status: 403 });
        }

        return NextResponse.json({
          available: true,
          tutor: buildTutorResponse(tutorId, tutor, tutor.stats?.totalCourses || 0)
        });

      } catch (clientError: any) {
        // Si la colección users es inaccesible por permisos, devolver error descriptivo
        return NextResponse.json({
          error: 'No se puede consultar el perfil del tutor localmente sin service-account.json',
          available: false,
          reason: 'server_error'
        }, { status: 412 });
      }
    }

  } catch (error: any) {
    console.error('Error checking tutor status:', error);
    return NextResponse.json(
      { error: 'Failed to check tutor status', details: error?.message || 'Unknown error', available: false, reason: 'server_error' },
      { status: 500 }
    );
  }
}

function buildTutorResponse(tutorId: string, tutor: any, coursesCount: number) {
  return {
    id: tutorId,
    username: tutor.username,
    displayName: tutor.displayName || tutor.email?.split('@')[0],
    photo: tutor.photoURL || `https://loremflickr.com/200/200/person,professional?lock=${tutorId}`,
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
      whatsapp: tutor.profile?.socials?.whatsapp || '',
      phone: tutor.profile?.socials?.phone || '',
      calendly: tutor.profile?.socials?.calendly || '',
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
    },
    websiteConfig: tutor.profile?.websiteConfig || null
  };
}
