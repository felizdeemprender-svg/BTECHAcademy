import { getAdminFirestore } from '../src/firebase/admin';

async function main() {
  const db = getAdminFirestore();
  
  const salesPagesSnap = await db.collection('salesPages').get();
  console.log(`Total Landing Pages found: ${salesPagesSnap.size}`);
  
  let validCoursesCount = 0;
  let missingCoursesCount = 0;
  let noCourseLinkedCount = 0;
  
  const landingsWithoutActiveCourse = [];

  for (const doc of salesPagesSnap.docs) {
    const data = doc.data();
    const courseId = data.courseId;
    
    if (!courseId) {
      noCourseLinkedCount++;
      landingsWithoutActiveCourse.push({ id: doc.id, title: data.title || 'Sin Título', reason: 'No tiene ID de curso vinculado' });
      continue;
    }
    
    const courseSnap = await db.collection('courses').doc(courseId).get();
    if (!courseSnap.exists) {
      missingCoursesCount++;
      landingsWithoutActiveCourse.push({ id: doc.id, title: data.title || 'Sin Título', courseId, reason: 'El curso vinculado fue eliminado' });
    } else {
      validCoursesCount++;
    }
  }

  console.log(`\nLandings con curso válido: ${validCoursesCount}`);
  console.log(`Landings sin curso asignado: ${noCourseLinkedCount}`);
  console.log(`Landings con curso eliminado: ${missingCoursesCount}`);
  
  console.log('\n--- Detalle de Landings sin curso activo ---');
  landingsWithoutActiveCourse.forEach(l => {
    console.log(`- Landing: "${l.title}" (ID: ${l.id}) | Problema: ${l.reason} ${l.courseId ? `(CourseID viejo: ${l.courseId})` : ''}`);
  });
}

main().catch(console.error);
