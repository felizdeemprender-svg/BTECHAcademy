import { adminStorage, adminDb } from '../src/firebase/admin';

async function cleanOrphanedStorage() {
  console.log('Iniciando limpieza de Firebase Storage...');
  try {
    const bucket = adminStorage.bucket('btechacademy-8b329.firebasestorage.app');
    const [files] = await bucket.getFiles();

    // Obtenemos todos los IDs válidos
    const coursesSnap = await adminDb.collection('courses').get();
    const courseIds = new Set(coursesSnap.docs.map(d => d.id));

    const campaignsSnap = await adminDb.collection('campaigns').get();
    const campaignIds = new Set(campaignsSnap.docs.map(d => d.id));
    
    const salesPagesSnap = await adminDb.collection('salesPages').get();
    const salesPageIds = new Set(salesPagesSnap.docs.map(d => d.id));

    let deletedCount = 0;
    let deletedSize = 0;

    const filesToDelete = [];

    for (const file of files) {
      const parts = file.name.split('/');
      const rootFolder = parts[0];
      const size = parseInt(file.metadata.size as string || '0', 10);
      let isOrphan = false;

      if (rootFolder === 'render_tmp' || rootFolder === 'pdf_tmp') {
        isOrphan = true;
      } else if (rootFolder === 'campaigns' && parts.length > 1) {
        const id = parts[1];
        if (!courseIds.has(id) && !campaignIds.has(id) && !salesPageIds.has(id)) isOrphan = true;
      } else if (rootFolder === 'courses' && parts.length > 1) {
        const id = parts[1];
        if (!courseIds.has(id)) isOrphan = true;
      } else if (rootFolder === 'sales_pages' && parts.length > 1) {
        const id = parts[1];
        if (!salesPageIds.has(id) && !courseIds.has(id)) isOrphan = true;
      }

      if (isOrphan) {
        filesToDelete.push({ file, size });
      }
    }

    console.log(`\nSe encontraron ${filesToDelete.length} archivos huérfanos/basura.`);
    
    if (filesToDelete.length === 0) {
      console.log('No hay nada que limpiar. El Storage está óptimo.');
      return;
    }

    console.log('Eliminando archivos...');
    // Eliminamos en lotes de 10 para no saturar la red/API
    for (let i = 0; i < filesToDelete.length; i += 10) {
      const batch = filesToDelete.slice(i, i + 10);
      await Promise.all(batch.map(item => item.file.delete().catch(e => console.error(`Error borrando ${item.file.name}:`, e))));
      
      for (const item of batch) {
        deletedCount++;
        deletedSize += item.size;
      }
      process.stdout.write(`\rBorrados: ${deletedCount} / ${filesToDelete.length}`);
    }

    const mbFreed = (deletedSize / (1024 * 1024)).toFixed(2);
    console.log(`\n\n✅ Limpieza completada con éxito.`);
    console.log(`🗑️ Se eliminaron ${deletedCount} archivos inútiles.`);
    console.log(`💾 Se liberaron ${mbFreed} MB de espacio en Firebase Storage.`);

  } catch (error) {
    console.error('\nError durante la limpieza:', error);
  }
}

cleanOrphanedStorage();
