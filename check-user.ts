import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './src/firebase/config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUser() {
  try {
    const q = query(collection(db, 'users'), where('email', '==', 'bprocessmailing@gmail.com'));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const user = snap.docs[0].data();
      console.log('🔍 USUARIO ENCONTRADO:');
      console.log('Email:', user.email);
      console.log('Roles:', user.roles);
      console.log('Mentor Permissions:', user.mentorPermissions);
      console.log('UID:', user.uid || snap.docs[0].id);
      console.log('IsActive:', user.isActive);
    } else {
      console.log('❌ Usuario no encontrado');
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

checkUser();
