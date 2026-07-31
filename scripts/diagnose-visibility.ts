import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Intentar cargar credenciales si existen
let db: FirebaseFirestore.Firestore;
try {
  const serviceAccount = JSON.parse(readFileSync('c:/FelizdeEmprender/studio/service-account.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  db = getFirestore();
} catch (e) {
  console.error("No se pudo inicializar Admin con service-account. Intentando por defecto.");
  process.exit(1);
}

async function findUser() {
  const snapshot = await db.collection('users').where('email', '==', 'felizdeemprende@gmail.com').limit(1).get();
  if (snapshot.empty) {
    console.log("No se encontró usuario con ese email.");
    return;
  }
  const user = snapshot.docs[0];
  console.log("USER_FOUND:" + user.id);
  
  const courses = await db.collection('courses').where('mentorId', '==', user.id).get();
  console.log(`COURSES_COUNT:${courses.size}`);
  courses.docs.forEach((c: any) => {
    console.log(`COURSE:${c.id} - ${c.data().title} - Active: ${c.data().isActive} - Status: ${c.data().status}`);
  });
}

findUser();
