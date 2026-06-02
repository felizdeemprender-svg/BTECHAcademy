import { getAdminFirestore } from '../src/firebase/admin';

async function main() {
  const db = getAdminFirestore();
  const courseId = 'EZLyNzBp0FPm9HLIUPO8';
  const snap = await db.collection('courses').doc(courseId).get();
  if (snap.exists) {
    console.log(`Course ${courseId} exists:`, snap.data()?.title, snap.data()?.status);
  } else {
    console.log(`Course ${courseId} DOES NOT EXIST!`);
  }
}

main().catch(console.error);
