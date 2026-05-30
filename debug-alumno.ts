import { adminDb } from './src/firebase/admin';

async function debug() {
  const users = await adminDb.collection('users').where('email', 'in', ['alumno.felizdeemprender@gmail.com', 'alumno..felizdeemprender@gmail.com']).get();
  users.forEach(doc => {
    console.log(`=== Datos del Usuario ${doc.data().email} ===`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

debug().catch(console.error);
