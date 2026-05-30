import { adminDb } from './src/firebase/admin';

async function debugUser() {
  const uid = 'XFgnPFVPAga8LCht2puP686Knfx1';
  console.log(`Buscando usuario: ${uid}`);

  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (userDoc.exists) {
    console.log('=== Datos del Usuario ===');
    console.log(JSON.stringify(userDoc.data(), null, 2));
  } else {
    console.log('❌ El usuario no existe en la colección "users".');
  }

  console.log('\nBuscando inscripciones por studentId...');
  const enrollsById = await adminDb.collection('enrollments').where('studentId', '==', uid).get();
  enrollsById.forEach(doc => {
    console.log(`Inscripción ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });

  const email = userDoc.exists ? userDoc.data()?.email : null;
  if (email) {
    console.log(`\nBuscando inscripciones por inviteEmail (${email})...`);
    const enrollsByEmail = await adminDb.collection('enrollments').where('inviteEmail', '==', email.toLowerCase().trim()).get();
    enrollsByEmail.forEach(doc => {
      console.log(`Inscripción ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
  }
}

debugUser().catch(console.error);
