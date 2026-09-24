const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkLanding() {
  try {
    const doc = await db.collection('salesPages').doc('ul332lsa6xo').get();
    if (!doc.exists) {
      console.log('Landing not found in salesPages');
      return;
    }
    const data = doc.data();
    console.log('Sales Page:', {
      id: doc.id,
      title: data.title,
      type: data.type,
      landingType: data.landingType,
      courseId: data.courseId,
      isActive: data.isActive,
      referidoId: data.referidoId
    });

    if (data.courseId) {
      const courseDoc = await db.collection('courses').doc(data.courseId).get();
      if (courseDoc.exists) {
        console.log('Course:', {
          id: courseDoc.id,
          title: courseDoc.data().title,
          status: courseDoc.data().status,
          isActive: courseDoc.data().isActive,
          publicListing: courseDoc.data().publicListing
        });
      } else {
        console.log('Course ID exists but course doc not found in courses collection');
      }
    }
  } catch (err) {
    console.error(err);
  }
}

checkLanding();
