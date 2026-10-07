import { adminDb } from '../src/firebase/admin';

async function main() {
  const docRef = adminDb.collection('salesPages').doc('lla6eozo6yp');
  const doc = await docRef.get();
  
  if (!doc.exists) {
    console.log('Document not found');
    return;
  }
  
  const data = doc.data()!;
  
  // Extract from aiContent.landings[0] if available
  let v2Content = null;
  if (data.aiContent?.landings?.length > 0) {
    v2Content = data.aiContent.landings[0];
  } else if (data.aiContent?.landing) {
    v2Content = data.aiContent.landing;
  }
  
  if (v2Content) {
    await docRef.update({
      content: v2Content,
      version: 2,
      styleId: 'classic-light', // Default style to prevent V2 editor crash
    });
    console.log('✅ Landing de Silvana migrada exitosamente a la estructura V2.');
  } else {
    console.log('No se pudo encontrar contenido válido para migrar en esta landing.');
  }
}

main().catch(console.error);
