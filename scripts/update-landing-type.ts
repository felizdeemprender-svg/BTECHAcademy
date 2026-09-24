import { adminDb } from '../src/firebase/admin';

async function updateLanding() {
  try {
    const docRef = adminDb.collection('salesPages').doc('ul332lsa6xo');
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      console.log('Document not found');
      return;
    }
    const data = docSnap.data();
    console.log('Old Type:', (data as any)?.type, 'Old LandingType:', (data as any)?.landingType);
    await docRef.update({
      type: 'landing_only',
      landingType: 'general'
    });
    console.log('Updated ul332lsa6xo successfully.');
  } catch (error) {
    console.error('Error updating document:', error);
  } finally {
    process.exit(0);
  }
}

updateLanding();
