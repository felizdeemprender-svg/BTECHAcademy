import { adminDb } from '../src/firebase/admin';

async function main() {
  const docRef = adminDb.collection('salesPages').doc('lla6eozo6yp');
  const doc = await docRef.get();
  
  if (doc.exists) {
    console.log(JSON.stringify(doc.data(), null, 2));
  } else {
    console.log('El documento no existe.');
  }
}

main().catch(console.error);
