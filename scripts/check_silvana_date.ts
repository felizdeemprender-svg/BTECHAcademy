import { adminDb } from '../src/firebase/admin';

async function main() {
  const docRef = adminDb.collection('salesPages').doc('lla6eozo6yp');
  const doc = await docRef.get();
  
  if (doc.exists) {
    const data = doc.data();
    if (data?.createdAt) {
      console.log('CreatedAt:', data.createdAt.toDate());
    } else {
      console.log('El documento no tiene fecha de creación (createdAt).');
    }
  } else {
    console.log('El documento no existe.');
  }
}

main().catch(console.error);
