import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './src/firebase/config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixCourseAuditoria() {
  try {
    const courseRef = doc(db, 'courses', '2AAckeY1FchcKG5pORV56ZPAsh1');
    
    await updateDoc(courseRef, {
      moderationReason: null,
      status: 'published',
      isActive: true,
      publicListing: true,
      updatedAt: new Date()
    });
    
    console.log('✅ Curso actualizado correctamente');
    console.log('🔍 Se eliminó el motivo de auditoría');
    
  } catch (e) {
    console.error('❌ Error:', e);
  }
}

fixCourseAuditoria();
