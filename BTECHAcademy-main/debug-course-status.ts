import { adminDb } from './src/firebase/admin';

async function checkCourseStatus() {
  const ids = ['2AAEy29PWe0AaEdSZeZB', 'A1xGilngHRZBLzMVXAd9'];
  for (const id of ids) {
    const doc = await adminDb.collection('courses').doc(id).get();
    console.log(`Course ${id} status: ${doc.data()?.status}`);
  }
}

checkCourseStatus().catch(console.error);
