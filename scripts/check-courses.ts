import { adminDb } from '../src/firebase/admin';

async function checkCourses() {
  try {
    const c1 = await adminDb.collection('courses').doc('lYghQjehyPcBUNP8QCwB').get();
    const c2 = await adminDb.collection('courses').doc('lkK84waxKvxoSrpYtxBC').get();
    console.log(c1.id, 'isActive:', c1.data()?.isActive, 'status:', c1.data()?.status, 'publicListing:', c1.data()?.publicListing);
    console.log(c2.id, 'isActive:', c2.data()?.isActive, 'status:', c2.data()?.status, 'publicListing:', c2.data()?.publicListing);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkCourses();
