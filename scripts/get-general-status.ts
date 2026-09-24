import { adminDb } from '../src/firebase/admin';

async function getStatus() {
  try {
    const salesSnap = await adminDb.collection('salesPages')
      .where('landingType', '==', 'general')
      .get();
      
    const followupsSnap = await adminDb.collection('salesPages')
      .where('type', '==', 'landing_only')
      .get(); // Since some might have been updated by my script

    const allPages = new Map();
    salesSnap.docs.forEach(d => allPages.set(d.id, d.data()));
    followupsSnap.docs.forEach(d => {
      if (d.data().landingType === 'general') {
        allPages.set(d.id, d.data());
      }
    });

    console.log("| Landing (ID) | Título Landing | Estado Landing | ID Curso/Mentoría | Título Producto | Activo | Publicado | Visible Público |");
    console.log("|---|---|---|---|---|---|---|---|");

    for (const [id, page] of allPages.entries()) {
      const isPageActive = page.isActive ? '🟢 Sí' : '🔴 No';
      
      let courseTitle = '---';
      let cIsActive = '---';
      let cStatus = '---';
      let cPublic = '---';

      const productId = page.courseId || page.productId;

      if (productId) {
        let pDoc = await adminDb.collection('courses').doc(productId).get();
        if (!pDoc.exists) {
          pDoc = await adminDb.collection('followups').doc(productId).get();
        }
        
        if (pDoc.exists) {
          const p = pDoc.data()!;
          courseTitle = p.title || p.goal || '---';
          cIsActive = p.isActive ? '🟢 Sí' : '🔴 No';
          cStatus = p.status === 'published' ? '🟢 Publicado' : `🔴 ${p.status || 'Borrador'}`;
          cPublic = p.publicListing ? '🟢 Sí' : '🔴 No';
        } else {
          courseTitle = '⚠️ No encontrado';
        }
      }

      console.log(`| \`${id}\` | ${page.title || '---'} | ${isPageActive} | \`${productId || '---'}\` | ${courseTitle} | ${cIsActive} | ${cStatus} | ${cPublic} |`);
    }

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

getStatus();
