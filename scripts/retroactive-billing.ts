import { adminStorage, adminDb } from '@/firebase/admin';
import { calculateImageCost, deductCredits } from '@/lib/payments/credits';

async function main() {
  console.log('Iniciando escaneo de cobro retroactivo...');
  try {
    const bucket = adminStorage.bucket();
    const [files] = await bucket.getFiles({ prefix: 'campaigns/' });
    
    console.log(`Se encontraron ${files.length} archivos en total bajo campaigns/`);
    
    let aiImageCount = 0;
    let successCount = 0;
    let missingOwners = 0;
    
    const courseOwnersCache = new Map<string, string | null>();

    for (const file of files) {
      const fileName = file.name; // Ej: campaigns/Kj2x/landing/ai_17290000.jpg
      
      if (fileName.includes('/ai_') && (fileName.endsWith('.jpg') || fileName.endsWith('.png') || fileName.endsWith('.jpeg'))) {
        aiImageCount++;
        const parts = fileName.split('/');
        
        // Asumiendo estructura: campaigns/[courseId]/[channel]/[file]
        if (parts.length >= 4) {
          const courseId = parts[1];
          
          let ownerUid = courseOwnersCache.get(courseId);
          if (ownerUid === undefined) {
            let snap = await adminDb.collection('courses').doc(courseId).get();
            if (snap.exists) {
              ownerUid = snap.data()?.mentorId || snap.data()?.ownerUid || snap.data()?.authorId || null;
            }
            
            if (!ownerUid) {
              snap = await adminDb.collection('landings').doc(courseId).get();
              if (snap.exists) {
                ownerUid = snap.data()?.ownerUid || snap.data()?.tutorUid || snap.data()?.uid || null;
              }
            }
            
            courseOwnersCache.set(courseId, ownerUid || null);
          }
          
          if (ownerUid) {
            console.log(`Cobrando a UID ${ownerUid} por imagen: ${fileName}`);
            const cost = await calculateImageCost(1);
            // El rol lo seteamos como 'tutor' por defecto para cobros retroactivos
            const ok = await deductCredits(ownerUid, cost, 'image_generation_premium_retroactive', 'tutor');
            if (ok) successCount++;
          } else {
            missingOwners++;
            console.warn(`⚠️ No se encontró el dueño para el curso ${courseId} (Archivo: ${fileName})`);
          }
        }
      }
    }
    
    console.log('--- RESUMEN DEL ESCANEO ---');
    console.log(`Total de archivos ai_ encontrados: ${aiImageCount}`);
    console.log(`Cobros exitosos: ${successCount}`);
    console.log(`Imágenes ignoradas (sin dueño): ${missingOwners}`);
    console.log('¡Proceso finalizado!');
    process.exit(0);
  } catch (err) {
    console.error('Error catastrófico en el script:', err);
    process.exit(1);
  }
}

main();
