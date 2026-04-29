import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const firestore = getAdminFirestore();
    const id = (await params).id;
    
    const tutorDoc = await firestore.collection('users').doc(id).get();

    if (!tutorDoc.exists) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    const tutor = tutorDoc.data() || {};
    
    // Devolver solo información pública y necesaria para branding
    return NextResponse.json({
      displayName: tutor.displayName || tutor.email?.split('@')[0] || 'Mentor',
      photoURL: tutor.photoURL || '',
      username: tutor.username || '',
      profile: {
        bio: tutor.profile?.bio || '',
        socials: tutor.profile?.socials || {}
      },
      branding: tutor.profile?.branding || {}
    });

  } catch (error: any) {
    console.error('[API Tutor By ID] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
