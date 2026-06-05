import { adminDb } from './src/firebase/admin';

async function checkMaterials() {
  const courseId = 'A1xGilngHRZBLzMVXAd9'; // or 2AAEy29PWe0AaEdSZeZB
  const modulesSnap = await adminDb.collection('courses').doc(courseId).collection('modules').get();
  
  if (modulesSnap.empty) {
    console.log(`No modules found for course ${courseId}`);
    
    // try the other course
    const courseId2 = '2AAEy29PWe0AaEdSZeZB';
    const modulesSnap2 = await adminDb.collection('courses').doc(courseId2).collection('modules').get();
    modulesSnap2.docs.forEach(doc => {
      console.log(`Module ${doc.id} materials:`, JSON.stringify(doc.data().supportMaterials, null, 2));
    });
    return;
  }

  modulesSnap.docs.forEach(doc => {
    console.log(`Module ${doc.id} materials:`, JSON.stringify(doc.data().supportMaterials, null, 2));
  });
}

checkMaterials().catch(console.error);
