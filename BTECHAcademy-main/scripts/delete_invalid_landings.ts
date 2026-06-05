import { getAdminFirestore } from '../src/firebase/admin';

async function main() {
  const db = getAdminFirestore();
  
  const salesPagesSnap = await db.collection('salesPages').get();
  console.log(`Buscando Landings rotas entre un total de ${salesPagesSnap.size} landings...`);
  
  const toDelete = [];

  for (const doc of salesPagesSnap.docs) {
    const data = doc.data();
    const courseId = data.courseId;
    
    if (!courseId) {
      toDelete.push(doc.ref);
      console.log(`- Marcando para borrar: "${data.title || 'Sin Título'}" (ID: ${doc.id}) - Razón: No tiene curso vinculado`);
      continue;
    }
    
    const courseSnap = await db.collection('courses').doc(courseId).get();
    if (!courseSnap.exists) {
      toDelete.push(doc.ref);
      console.log(`- Marcando para borrar: "${data.title || 'Sin Título'}" (ID: ${doc.id}) - Razón: Curso eliminado (${courseId})`);
    }
  }

  if (toDelete.length === 0) {
    console.log('\nNo hay landings rotas para borrar.');
    return;
  }

  console.log(`\nBorrando ${toDelete.length} landings de la base de datos...`);
  
  const batch = db.batch();
  for (const ref of toDelete) {
    batch.delete(ref);
  }
  
  await batch.commit();
  console.log('¡Borrado exitoso! La base de datos está limpia.');
}

main().catch(console.error);
