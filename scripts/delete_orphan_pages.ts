import { adminDb } from '../src/firebase/admin';

async function main() {
  const orphanIds = ['5irlrg1o3il', 'fmzas3kta8d', 'i4j1a49jpd'];
  
  console.log('Eliminando borradores huérfanos...');
  const batch = adminDb.batch();

  for (const id of orphanIds) {
    const docRef = adminDb.collection('salesPages').doc(id);
    batch.delete(docRef);
    console.log(`- Preparando eliminación de: ${id}`);
  }

  await batch.commit();
  console.log('✅ Eliminación completada con éxito.');
}

main().catch(console.error);
