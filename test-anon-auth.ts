import { getFirebaseServer } from './src/firebase/server';
import { query, collection, where, getDocs, limit } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

async function test() {
  try {
    const { firestore, firebaseApp } = getFirebaseServer();
    const auth = getAuth(firebaseApp);
    
    console.log('Signing in anonymously...');
    await signInAnonymously(auth);
    console.log('Signed in as:', auth.currentUser?.uid);
    
    const username = 'angelarias';
    const q = query(
      collection(firestore, 'users'),
      where('username', '==', username),
      limit(1)
    );
    
    const snap = await getDocs(q);
    console.log('Results found:', snap.size);
    if (snap.size > 0) {
      const tutorDoc = snap.docs[0];
      const tutor = tutorDoc.data();
      console.log('--- TUTOR DOCUMENT ---');
      console.log(JSON.stringify(tutor, null, 2));
      
      console.log('--- ALL COURSES FOR THIS MENTOR ---');
      const coursesQuery = query(
        collection(firestore, 'courses'),
        where('mentorId', '==', tutorDoc.id)
      );
      const coursesSnap = await getDocs(coursesQuery);
      console.log('Total courses:', coursesSnap.size);
      coursesSnap.forEach(doc => {
        console.log(`Course ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
      });
    }
  } catch (e) {
    console.error('Test failed:', e);
  }
}

test();
