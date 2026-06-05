import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './src/firebase/config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCourseStatus() {
  try {
    // Verificar el curso
    const courseRef = doc(db, 'courses', '2AAEy29PWe0AaEdSZeZB');
    const courseSnap = await getDoc(courseRef);
    
    if (courseSnap.exists()) {
      const course = courseSnap.data();
      console.log('🔍 ESTADO DEL CURSO:');
      console.log('Course Title:', course.title);
      console.log('Status:', course.status);
      console.log('IsActive:', course.isActive);
      console.log('PublicListing:', course.publicListing);
      console.log('PublishedAt:', course.publishedAt);
      console.log('ModerationReason:', course.moderationReason);
    } else {
      console.log('❌ Curso no encontrado');
    }

    // Verificar inscripciones del alumno
    const enrollQ = query(collection(db, 'enrollments'), where('inviteEmail', '==', 'Aribelotti@hotmail.com'));
    const enrollSnap = await getDocs(enrollQ);
    
    console.log('🔍 INSCRIPCIONES DEL ALUMNO:');
    enrollSnap.docs.forEach(doc => {
      const enrollment = doc.data();
      console.log('Course ID:', enrollment.courseId);
      console.log('Status:', enrollment.status);
      console.log('IsInvited:', enrollment.isInvited);
      console.log('Student Name:', enrollment.studentName);
    });

  } catch (e) {
    console.error('Error:', e);
  }
}

checkCourseStatus();
