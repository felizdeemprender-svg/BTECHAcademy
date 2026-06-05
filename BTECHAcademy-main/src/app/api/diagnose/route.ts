import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(firebaseApp, 'default');

export async function GET() {
  try {
    const [coursesSnap, salesPagesSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, 'courses')),
      getDocs(collection(db, 'salesPages')),
      getDocs(collection(db, 'users')),
    ]);

    const courses = coursesSnap.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      isActive: doc.data().isActive,
      status: doc.data().status,
      publicListing: doc.data().publicListing,
      mentorId: doc.data().mentorId,
    }));

    const salesPages = salesPagesSnap.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      courseId: doc.data().courseId,
      mentorId: doc.data().mentorId,
      isActive: doc.data().isActive,
      landingType: doc.data().landingType,
      referidoId: doc.data().referidoId || null,
    }));

    const mentors = usersSnap.docs
      .filter(doc => {
        const d = doc.data();
        return d.roles?.includes('mentor') || d.isMentor === true;
      })
      .map(doc => ({
        id: doc.id,
        displayName: doc.data().displayName,
        email: doc.data().email,
        isMentor: doc.data().isMentor,
        roles: doc.data().roles,
        subscriptionStatus: doc.data().subscription?.status ?? null,
        isEnterprise: doc.data().subscription?.isEnterprise ?? null,
      }));

    return NextResponse.json({ courses, salesPages, mentors });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
