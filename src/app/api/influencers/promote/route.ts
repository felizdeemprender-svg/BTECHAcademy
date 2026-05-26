import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/influencers/promote
 * Body: { mentorUid: string, targetEmail: string }
 * 
 * Uses Firebase Admin SDK (bypasses Firestore rules).
 * Verifies the requester is a mentor before writing.
 */
export async function POST(request: NextRequest) {
  try {
    const { mentorUid, targetEmail, searchOnly } = await request.json();

    if (!mentorUid || !targetEmail) {
      return NextResponse.json(
        { error: 'mentorUid and targetEmail are required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // 1. Verify the requester is actually a mentor
    const mentorDoc = await db.collection('users').doc(mentorUid).get();
    if (!mentorDoc.exists) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const mentorData = mentorDoc.data() || {};
    const mentorRoles: string[] = mentorData.roles || [];

    // Check roles_mentor collection OR mentor role in document
    const mentorRoleDoc = await db.collection('roles_mentor').doc(mentorUid).get();
    const isMentor = mentorRoles.includes('mentor') || mentorRoleDoc.exists;

    if (!isMentor) {
      return NextResponse.json(
        { error: 'Only mentors can promote influencers' },
        { status: 403 }
      );
    }

    // 2. Find the target user by email
    const usersSnap = await db
      .collection('users')
      .where('email', '==', targetEmail.toLowerCase().trim())
      .limit(1)
      .get();

    if (usersSnap.empty) {
      return NextResponse.json(
        { error: 'No user found with that email' },
        { status: 404 }
      );
    }

    const targetDoc = usersSnap.docs[0];
    const targetData = targetDoc.data();
    const targetUid = targetDoc.id;

    // 3. Check if already associated with this mentor
    const existingAssociation = await db
      .collection('mentorInfluencers')
      .doc(mentorUid)
      .collection('referidos')
      .doc(targetUid)
      .get();

    const alreadyAssociated = existingAssociation.exists;

    // If searchOnly, just return the user info without promoting
    if (searchOnly) {
      return NextResponse.json({
        success: true,
        alreadyAssociated,
        user: {
          uid: targetUid,
          displayName: targetData.displayName || null,
          email: targetData.email,
          photoURL: targetData.photoURL || null,
        }
      });
    }

    // 4. Write to mentor's referidos subcollection
    await db
      .collection('mentorInfluencers')
      .doc(mentorUid)
      .collection('referidos')
      .doc(targetUid)
      .set({
        uid: targetUid,
        displayName: targetData.displayName || null,
        email: targetData.email,
        photoURL: targetData.photoURL || null,
        addedAt: FieldValue.serverTimestamp(),
        addedByMentorId: mentorUid,
      }, { merge: true });

    // 5. Update user document: add 'referido' role and associatedMentors
    await db.collection('users').doc(targetUid).update({
      roles: FieldValue.arrayUnion('referido'),
      associatedMentors: FieldValue.arrayUnion(mentorUid),
    });

    return NextResponse.json({
      success: true,
      alreadyAssociated: false,
      user: {
        uid: targetUid,
        displayName: targetData.displayName || null,
        email: targetData.email,
        photoURL: targetData.photoURL || null,
      }
    });

  } catch (error: any) {
    console.error('[API Influencers Promote] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
