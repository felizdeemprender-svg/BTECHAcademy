import { adminDb } from '../src/firebase/admin';

async function fixFollowupRecord() {
  try {
    const docRef = adminDb.collection('salesPages').doc('n18brfdilm');
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      await docRef.update({
        type: 'landing_only',
        landingType: 'general'
      });
      console.log('Fixed record n18brfdilm');
    }
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

fixFollowupRecord();
