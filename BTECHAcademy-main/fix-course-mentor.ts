import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './src/firebase/config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixCourseMentor() {
  try {
    // 1. Obtener el UID del usuario bprocessmailing@gmail.com
    const userQ = query(collection(db, 'users'), where('email', '==', 'bprocessmailing@gmail.com'));
    const userSnap = await getDocs(userQ);
    
    if (userSnap.empty) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const user = userSnap.docs[0];
    const userUid = user.id;
    console.log('🔍 Usuario encontrado:', user.data().email);
    console.log('🔍 UID del usuario:', userUid);
    
    // 2. Actualizar el curso para asignar el nuevo mentor
    const courseRef = doc(db, 'courses', '2AAEy29PWe0AaEdSZeZB');
    await updateDoc(courseRef, {
      mentorId: userUid,
      mentorEmail: 'bprocessmailing@gmail.com',
      updatedAt: new Date()
    });
    
    console.log('✅ Curso actualizado correctamente');
    console.log('🔍 Nuevo mentorId:', userUid);
    console.log('🔍 Nuevo mentorEmail:', 'bprocessmailing@gmail.com');
    
  } catch (e) {
    console.error('❌ Error:', e);
  }
}

fixCourseMentor();
