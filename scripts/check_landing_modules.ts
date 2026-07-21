import { getAdminFirestore } from '../src/firebase/admin';

async function main() {
  const db = getAdminFirestore();

  const page = await db.collection('salesPages').doc('t1cuipnw5er').get();
  if (!page.exists) { console.log('Landing NO existe'); return; }

  const courseId = page.data()?.courseId;
  console.log('courseId:', courseId);
  if (!courseId) { console.log('Sin courseId en la landing'); return; }

  const course = await db.collection('courses').doc(courseId).get();
  console.log('Curso:', course.data()?.title || '(no encontrado)');

  const mods = await db.collection('courses').doc(courseId).collection('modules').get();
  console.log('Total módulos:', mods.size);
  mods.forEach(m => {
    const d = m.data();
    console.log(' -', d.title, '| orden:', d.order, '| duración:', d.duration || '(sin duración)');
  });
}

main().catch(console.error);
