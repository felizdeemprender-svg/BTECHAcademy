import { adminDb } from './src/firebase/admin';

async function debugCourses() {
  const ids = ['2AAEy29PWe0AaEdSZeZB', 'A1xGilngHRZBLzMVXAd9'];
  for (const id of ids) {
    console.log(`Buscando curso: ${id}`);
    const doc = await adminDb.collection('courses').doc(id).get();
    if (doc.exists) {
      console.log(`✅ El curso existe: ${doc.data()?.title}`);
      console.log(`isActive: ${doc.data()?.isActive}`);
    } else {
      console.log(`❌ El curso NO existe.`);
    }
  }
}

debugCourses().catch(console.error);
