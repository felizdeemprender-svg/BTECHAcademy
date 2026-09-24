import { adminDb } from '../src/firebase/admin';

async function checkTutors() {
  try {
    const c1 = await adminDb.collection('courses').doc('lYghQjehyPcBUNP8QCwB').get();
    const c2 = await adminDb.collection('courses').doc('lkK84waxKvxoSrpYtxBC').get();
    
    const m1 = c1.data()?.mentorId;
    const m2 = c2.data()?.mentorId;

    if (m1) {
      const t1 = await adminDb.collection('users').doc(m1).get();
      console.log('Tutor 1 (', m1, '):', t1.data()?.subscription);
    }
    if (m2) {
      const t2 = await adminDb.collection('users').doc(m2).get();
      console.log('Tutor 2 (', m2, '):', t2.data()?.subscription);
    }

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkTutors();
