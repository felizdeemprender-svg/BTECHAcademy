import { adminStorage, adminDb } from '../src/firebase/admin';

async function crossReferenceStorage() {
  console.log('Iniciando validación cruzada entre Firebase Storage y Firestore...');
  try {
    const bucket = adminStorage.bucket('btechacademy-8b329.firebasestorage.app');
    const [files] = await bucket.getFiles();

    console.log(`\nAnalizando ${files.length} archivos...`);

    // Obtenemos todos los cursos
    const coursesSnap = await adminDb.collection('courses').get();
    const courseIds = new Set(coursesSnap.docs.map(d => d.id));
    console.log(`Cursos en BD: ${courseIds.size}`);

    // Obtenemos todas las campaigns
    const campaignsSnap = await adminDb.collection('campaigns').get();
    const campaignIds = new Set(campaignsSnap.docs.map(d => d.id));
    
    // Y también las salesPages
    const salesPagesSnap = await adminDb.collection('salesPages').get();
    const salesPageIds = new Set(salesPagesSnap.docs.map(d => d.id));

    const orphans = {
      campaigns: [] as any[],
      courses: [] as any[],
      sales_pages: [] as any[],
      temp: [] as any[]
    };

    let totalOrphanSize = 0;

    for (const file of files) {
      const parts = file.name.split('/');
      const rootFolder = parts[0];
      const size = parseInt(file.metadata.size as string || '0', 10);

      // Basura temporal obvia
      if (rootFolder === 'render_tmp' || rootFolder === 'pdf_tmp') {
        orphans.temp.push({ name: file.name, size });
        totalOrphanSize += size;
        continue;
      }

      // campaigns/{id}/...
      if (rootFolder === 'campaigns' && parts.length > 1) {
        const id = parts[1]; // Puede ser courseId o campaignId dependiendo de cómo se guardó
        if (!courseIds.has(id) && !campaignIds.has(id)) {
          orphans.campaigns.push({ name: file.name, size });
          totalOrphanSize += size;
        }
      }

      // courses/{id}/...
      if (rootFolder === 'courses' && parts.length > 1) {
        const id = parts[1];
        if (!courseIds.has(id)) {
          orphans.courses.push({ name: file.name, size });
          totalOrphanSize += size;
        }
      }

      // sales_pages/{id}/...
      if (rootFolder === 'sales_pages' && parts.length > 1) {
        const id = parts[1];
        if (!salesPageIds.has(id) && !courseIds.has(id)) {
          orphans.sales_pages.push({ name: file.name, size });
          totalOrphanSize += size;
        }
      }
    }

    console.log('\n=== REPORTE DE ARCHIVOS HUÉRFANOS (Sin ID válido en Base de Datos) ===');
    console.log(`Carpetas Temporales (Basura): ${orphans.temp.length} archivos`);
    console.log(`Campaigns (ID borrado): ${orphans.campaigns.length} archivos`);
    console.log(`Courses (ID borrado): ${orphans.courses.length} archivos`);
    console.log(`Sales Pages (ID borrado): ${orphans.sales_pages.length} archivos`);
    
    const totalMB = (totalOrphanSize / (1024 * 1024)).toFixed(2);
    console.log(`\nTamaño total de basura recuperable: ${totalMB} MB`);

    // Mostrar algunos ejemplos
    if (orphans.campaigns.length > 0) console.log('\nEjemplos en campaigns:', orphans.campaigns.slice(0, 3).map(f => f.name));
    if (orphans.courses.length > 0) console.log('\nEjemplos en courses:', orphans.courses.slice(0, 3).map(f => f.name));
    if (orphans.sales_pages.length > 0) console.log('\nEjemplos en sales_pages:', orphans.sales_pages.slice(0, 3).map(f => f.name));

  } catch (error) {
    console.error('Error:', error);
  }
}

crossReferenceStorage();
