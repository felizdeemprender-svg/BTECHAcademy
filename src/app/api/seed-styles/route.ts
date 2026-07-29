import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import { LANDING_STYLES } from '@/lib/landing-styles';

export async function GET() {
  try {
    const batch = adminDb.batch();
    const stylesRef = adminDb.collection('landingStyles');

    let count = 0;
    for (const style of LANDING_STYLES) {
      const docRef = stylesRef.doc(style.id);
      batch.set(docRef, {
        ...style,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      count++;
    }

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: `Seeded ${count} styles into Firestore landingStyles collection.` 
    });
  } catch (error: any) {
    console.error('Error seeding styles:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
