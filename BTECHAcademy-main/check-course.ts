import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './src/firebase/config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCourse() {
  try {
    // Verificar el curso
    const courseRef = doc(db, 'courses', '2AAEy29PWe0AaEdSZeZB');
    const courseSnap = await getDoc(courseRef);
    
    if (courseSnap.exists()) {
      const course = courseSnap.data();
      console.log('🔍 CURSO ENCONTRADO:');
      console.log('Course ID:', courseSnap.id);
      console.log('Course Title:', course.title);
      console.log('Mentor ID:', course.mentorId);
      console.log('Mentor Email:', course.mentorEmail);
    } else {
      console.log('❌ Curso no encontrado');
    }

    // Verificar el usuario
    const userQ = query(collection(db, 'users'), where('email', '==', 'bprocessmailing@gmail.com'));
    const userSnap = await getDocs(userQ);
    
    if (!userSnap.empty) {
      const user = userSnap.docs[0].data();
      console.log('🔍 USUARIO ENCONTRADO:');
      console.log('User ID:', userSnap.docs[0].id);
      console.log('User Email:', user.email);
      console.log('User UID:', user.uid);
      
      // Comparar IDs
      if (courseSnap.exists()) {
        const course = courseSnap.data();
        console.log('🔍 COMPARACIÓN:');
        console.log('Course Mentor ID:', course.mentorId);
        console.log('User ID:', user.uid || userSnap.docs[0].id);
        console.log('¿Es el mentor?', course.mentorId === (user.uid || userSnap.docs[0].id));
      }
    } else {
      console.log('❌ Usuario no encontrado');
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

checkCourse();
