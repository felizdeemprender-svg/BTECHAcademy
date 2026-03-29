import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './src/firebase/config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkEnrollmentStatus() {
  try {
    console.log('🔍 Verificando inscripción de aribelotti@hotmail.com');
    
    // 1. Buscar al usuario
    const userQ = query(collection(db, 'users'), where('email', '==', 'aribelotti@hotmail.com'));
    const userSnap = await getDocs(userQ);
    
    if (userSnap.empty) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const user = userSnap.docs[0];
    console.log('✅ Usuario encontrado:', user.id);
    console.log('📧 Email:', user.data().email);
    console.log('👤 Roles:', user.data().roles);
    console.log('✅ IsActive:', user.data().isActive);
    
    // 2. Buscar inscripciones
    const enrollQ = query(collection(db, 'enrollments'), where('inviteEmail', '==', 'aribelotti@hotmail.com'));
    const enrollSnap = await getDocs(enrollQ);
    
    console.log('🔍 Inscripciones encontradas:', enrollSnap.size);
    
    enrollSnap.docs.forEach(doc => {
      const enrollment = doc.data();
      console.log('--- Inscripción ---');
      console.log('📋 ID:', doc.id);
      console.log('🎓 Course ID:', enrollment.courseId);
      console.log('👨‍🎓 Student ID:', enrollment.studentId);
      console.log('📧 Invite Email:', enrollment.inviteEmail);
      console.log('📊 Status:', enrollment.status);
      console.log('🎫 IsInvited:', enrollment.isInvited);
      console.log('💳 IsDirect:', enrollment.isDirect);
      console.log('📅 EnrolledAt:', enrollment.enrolledAt);
    });
    
    // 3. Verificar el curso
    const courseRef = doc(db, 'courses', '2AAEy29PWe0AaEdSZeZB');
    const courseSnap = await getDoc(courseRef);
    
    if (courseSnap.exists()) {
      const course = courseSnap.data();
      console.log('--- Curso ---');
      console.log('📚 Title:', course.title);
      console.log('📊 Status:', course.status);
      console.log('✅ IsActive:', course.isActive);
      console.log('🌐 PublicListing:', course.publicListing);
    }
    
  } catch (e) {
    console.error('❌ Error:', e);
  }
}

checkEnrollmentStatus();
